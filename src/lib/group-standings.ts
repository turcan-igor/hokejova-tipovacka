import type { SupabaseClient } from "@supabase/supabase-js";
import type { MatchRow } from "@/lib/db-types";

export const IIHF_GROUP_STANDINGS_URL = "https://www.iihf.com/en/events/2026/wm/standings/group";

export type GroupStanding = {
  groupName: string;
  rank: number;
  teamCode: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  source: "iihf" | "fallback";
};

const TEAM_CODE_PATTERN = /^(AUT|CAN|CZE|DEN|FIN|GBR|GER|HUN|ITA|LAT|NOR|SLO|SUI|SVK|SWE|USA)$/;

export async function fetchIihfGroupStandings(fetcher: typeof fetch = fetch) {
  const response = await fetcher(IIHF_GROUP_STANDINGS_URL, {
    headers: { "user-agent": "iihf-2026-tipovacka/0.1" },
    cache: "no-store"
  });

  if (response.status === 403 || response.status === 404) return [];
  if (!response.ok) throw new Error(`IIHF standings failed with HTTP ${response.status}`);

  return parseIihfGroupStandingsHtml(await response.text());
}

export function parseIihfGroupStandingsHtml(html: string): GroupStanding[] {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");

  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const standings: GroupStanding[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const groupMatch = lines[index].match(/^Group\s+([AB])$/);
    if (!groupMatch) continue;

    const groupName = groupMatch[1];
    const remainingLines = lines.slice(index + 1);
    const nextGroupIndex = remainingLines.findIndex((line) => /^Group\s+[AB]$/.test(line));
    const window = nextGroupIndex >= 0 ? remainingLines.slice(0, nextGroupIndex) : remainingLines.slice(0, 80);
    const teams = window.filter((line) => TEAM_CODE_PATTERN.test(line));
    const statLines = window
      .filter((line) => /^\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+:\d+$/.test(line))
      .map((line) => line.split(/\s+/));

    for (let rankIndex = 0; rankIndex < Math.min(teams.length, statLines.length); rankIndex += 1) {
      const stats = statLines[rankIndex];
      const [gamesPlayed, points, wins, overtimeWins, overtimeLosses, losses] = stats.slice(0, 6).map(Number);
      const [goalsFor, goalsAgainst] = stats[6].split(":").map(Number);
      standings.push({
        groupName,
        rank: rankIndex + 1,
        teamCode: teams[rankIndex],
        gamesPlayed,
        wins: wins + overtimeWins,
        losses: losses + overtimeLosses,
        goalsFor,
        goalsAgainst,
        goalDifference: goalsFor - goalsAgainst,
        points,
        source: "iihf"
      });
    }
  }

  return standings;
}

export function calculateFallbackGroupStandings(matches: MatchRow[]): GroupStanding[] {
  const rows = new Map<string, GroupStanding>();

  for (const match of matches) {
    if (
      match.phase !== "Preliminary Round" ||
      match.status !== "final" ||
      !match.group_name ||
      !match.home_team_code ||
      !match.away_team_code ||
      match.home_score === null ||
      match.away_score === null
    ) {
      continue;
    }

    const home = ensureStanding(rows, match.group_name, match.home_team_code);
    const away = ensureStanding(rows, match.group_name, match.away_team_code);

    home.gamesPlayed += 1;
    away.gamesPlayed += 1;
    home.goalsFor += match.home_score;
    home.goalsAgainst += match.away_score;
    away.goalsFor += match.away_score;
    away.goalsAgainst += match.home_score;

    if (match.home_score > match.away_score) {
      home.wins += 1;
      home.points += 3;
      away.losses += 1;
    } else {
      away.wins += 1;
      away.points += 3;
      home.losses += 1;
    }
  }

  const grouped = Array.from(rows.values()).reduce<Record<string, GroupStanding[]>>((acc, row) => {
    row.goalDifference = row.goalsFor - row.goalsAgainst;
    acc[row.groupName] ??= [];
    acc[row.groupName].push(row);
    return acc;
  }, {});

  return Object.values(grouped).flatMap((groupRows) =>
    groupRows
      .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || a.teamCode.localeCompare(b.teamCode))
      .map((row, index) => ({ ...row, rank: index + 1 }))
  );
}

export async function syncGroupStandings(supabase: SupabaseClient, matches: MatchRow[]) {
  const iihfStandings = await fetchIihfGroupStandings();
  const standings = iihfStandings.length > 0 ? iihfStandings : calculateFallbackGroupStandings(matches);
  await upsertGroupStandings(supabase, standings);
  return { count: standings.length, source: iihfStandings.length > 0 ? "iihf" : "fallback" };
}

export async function upsertGroupStandings(supabase: SupabaseClient, standings: GroupStanding[]) {
  if (standings.length === 0) return;

  const { error } = await supabase.from("group_standings").upsert(
    standings.map(toDbRow),
    { onConflict: "group_name,team_code" }
  );
  if (error) throw error;
}

export function groupStandingsByGroup<T extends { group_name: string; rank: number }>(rows: T[]) {
  return rows.reduce<Record<string, T[]>>((acc, row) => {
    acc[row.group_name] ??= [];
    acc[row.group_name].push(row);
    acc[row.group_name].sort((a, b) => a.rank - b.rank);
    return acc;
  }, {});
}

function ensureStanding(rows: Map<string, GroupStanding>, groupName: string, teamCode: string) {
  const key = `${groupName}:${teamCode}`;
  if (!rows.has(key)) {
    rows.set(key, {
      groupName,
      rank: 0,
      teamCode,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      source: "fallback"
    });
  }
  return rows.get(key)!;
}

function toDbRow(row: GroupStanding) {
  return {
    group_name: row.groupName,
    rank: row.rank,
    team_code: row.teamCode,
    games_played: row.gamesPlayed,
    wins: row.wins,
    losses: row.losses,
    goals_for: row.goalsFor,
    goals_against: row.goalsAgainst,
    goal_difference: row.goalDifference,
    points: row.points,
    source: row.source,
    updated_at: new Date().toISOString()
  };
}
