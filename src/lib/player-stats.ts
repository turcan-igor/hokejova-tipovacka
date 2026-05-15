import type { SupabaseClient } from "@supabase/supabase-js";

export const IIHF_PLAYER_STATS_URLS = {
  points: "https://www.iihf.com/en/events/2026/wm/skaters/scoringleaders",
  goals: "https://www.iihf.com/en/events/2026/wm/skaters/goalscoringleaders",
  assists: "https://www.iihf.com/en/events/2026/wm/skaters/assistleaders"
};

const PLAYER_STATS_SOURCE_URLS = [
  IIHF_PLAYER_STATS_URLS.points,
  "https://canada-central.iihf.com/en/events/2026/wm/skaters/scoringleaders"
];

export type PlayerStat = {
  playerName: string;
  teamCode: string;
  position: string | null;
  gamesPlayed: number;
  goals: number;
  assists: number;
  points: number;
  plusMinus: string | null;
  penaltyMinutes: number | null;
  source: string;
};

const TEAM_CODE_PATTERN = /\b(AUT|CAN|CZE|DEN|FIN|GBR|GER|HUN|ITA|LAT|NOR|SLO|SUI|SVK|SWE|USA)\b/;

export async function fetchIihfPlayerStats(fetcher: typeof fetch = fetch) {
  for (const url of PLAYER_STATS_SOURCE_URLS) {
    const response = await fetcher(url, {
      headers: {
        accept: "text/html,application/xhtml+xml",
        "accept-language": "en-US,en;q=0.9",
        "user-agent": "Mozilla/5.0 (compatible; iihf-2026-tipovacka/0.1)"
      },
      cache: "no-store"
    });

    if (response.status === 403 || response.status === 404) continue;
    if (!response.ok) throw new Error(`IIHF player stats failed with HTTP ${response.status}`);

    const stats = parseIihfPlayerStatsHtml(await response.text(), url);
    if (stats.length > 0) return stats;
  }

  return [];
}

export function parseIihfPlayerStatsHtml(html: string, source: string): PlayerStat[] {
  const text = html
    .replace(/<[^>]*\bs-flag--([a-z]{3})\b[^>]*>/gi, "\n$1\n")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\u00a0/g, " ");

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\s+/g, " "))
    .filter(Boolean);

  const rows = parsePipeRows(lines, source);
  if (rows.length > 0) return dedupeStats(rows);

  const verticalRows = parseVerticalStatRows(lines, source);
  if (verticalRows.length > 0) return dedupeStats(verticalRows);

  return dedupeStats(parseCardRows(lines, source));
}

export function sortPlayerStats(stats: PlayerStat[], view: "points" | "goals" | "assists") {
  const primary = view === "goals" ? "goals" : view === "assists" ? "assists" : "points";
  return [...stats].sort((a, b) => {
    return (
      b[primary] - a[primary] ||
      b.points - a.points ||
      b.goals - a.goals ||
      b.assists - a.assists ||
      a.playerName.localeCompare(b.playerName, "cs")
    );
  });
}

export async function upsertPlayerStats(supabase: SupabaseClient, stats: PlayerStat[]) {
  if (stats.length === 0) return;

  const { error } = await supabase.from("player_stats").upsert(
    stats.map((stat) => ({
      player_name: stat.playerName,
      team_code: stat.teamCode,
      position: stat.position,
      games_played: stat.gamesPlayed,
      goals: stat.goals,
      assists: stat.assists,
      points: stat.points,
      plus_minus: stat.plusMinus,
      penalty_minutes: stat.penaltyMinutes,
      source: stat.source,
      updated_at: new Date().toISOString()
    })),
    { onConflict: "player_name,team_code" }
  );

  if (error) throw error;
}

function parsePipeRows(lines: string[], source: string): PlayerStat[] {
  const stats: PlayerStat[] = [];
  for (const line of lines) {
    const cells = line
      .split("|")
      .map((cell) => cell.trim())
      .filter(Boolean);
    if (cells.length < 12 || !/^\d+$/.test(cells[0])) continue;

    const teamCode = cells.find((cell) => TEAM_CODE_PATTERN.test(cell))?.match(TEAM_CODE_PATTERN)?.[1];
    const numericTail = cells.slice(-8);
    const [gamesPlayed, goals, assists, points, penaltyMinutes] = numericTail.map((value) => Number(value.replace("+", "")));
    if (!teamCode || !Number.isFinite(gamesPlayed) || !Number.isFinite(points)) continue;

    const name = cells[1]?.replace(/\s+/g, " ").trim();
    if (!name || name.toLowerCase() === "name") continue;

    stats.push({
      playerName: name,
      teamCode,
      position: cells.find((cell) => ["F", "D"].includes(cell)) ?? null,
      gamesPlayed,
      goals,
      assists,
      points,
      penaltyMinutes: Number.isFinite(penaltyMinutes) ? penaltyMinutes : null,
      plusMinus: numericTail[5] ?? null,
      source
    });
  }
  return stats;
}

function parseCardRows(lines: string[], source: string): PlayerStat[] {
  const stats: PlayerStat[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const name = lines[index];
    const position = lines[index + 1];
    if (!/^[A-Z][A-Z' -]+ [A-Z][A-Za-z' -]+$/.test(name) || !["Forward", "Defender"].includes(position)) continue;

    const window = lines.slice(index, index + 80);
    const teamCode = window.find((line) => TEAM_CODE_PATTERN.test(line))?.match(TEAM_CODE_PATTERN)?.[1];
    const statHeaderIndex = window.findIndex((line) => /^gp\s+g\s+a\s+pts/i.test(line.replace(/\s+/g, " ")));
    const statLine = statHeaderIndex >= 0 ? window[statHeaderIndex + 1] : null;
    if (!teamCode || !statLine) continue;

    const values = statLine.split(/\s+/);
    const gamesPlayed = Number(values[0]);
    const goals = Number(values[1]);
    const assists = Number(values[2]);
    const points = Number(values[3]);
    const penaltyMinutes = Number(values[4]);
    if (![gamesPlayed, goals, assists, points].every(Number.isFinite)) continue;

    stats.push({
      playerName: name,
      teamCode,
      position,
      gamesPlayed,
      goals,
      assists,
      points,
      penaltyMinutes: Number.isFinite(penaltyMinutes) ? penaltyMinutes : null,
      plusMinus: values[6] ?? null,
      source
    });
  }
  return stats;
}

function parseVerticalStatRows(lines: string[], source: string): PlayerStat[] {
  const stats: PlayerStat[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const name = lines[index];
    const position = lines[index + 1];
    if (!isPlayerName(name) || !["Forward", "Defender"].includes(position)) continue;

    const headerIndex = findStatHeaderIndex(lines, index, index + 120);
    if (headerIndex < 0) continue;

    const teamCode = findNearestTeamCode(lines, index);
    const values = lines.slice(headerIndex + STAT_HEADERS.length, headerIndex + STAT_HEADERS.length + 10);
    const gamesPlayed = toNumber(values[0]);
    const goals = toNumber(values[1]);
    const assists = toNumber(values[2]);
    const points = toNumber(values[3]);
    const penaltyMinutes = toNumber(values[4]);

    if (!teamCode || ![gamesPlayed, goals, assists, points].every(Number.isFinite)) continue;

    stats.push({
      playerName: name,
      teamCode,
      position,
      gamesPlayed,
      goals,
      assists,
      points,
      penaltyMinutes: Number.isFinite(penaltyMinutes) ? penaltyMinutes : null,
      plusMinus: values[6] ?? null,
      source
    });
  }

  return stats;
}

const STAT_HEADERS = ["gp", "g", "a", "pts", "pim", "sog", "+/-", "gwg", "ppg", "shg"];

function findStatHeaderIndex(lines: string[], start: number, end: number) {
  for (let index = start; index < Math.min(lines.length, end); index += 1) {
    if (STAT_HEADERS.every((header, offset) => lines[index + offset]?.toLowerCase() === header)) {
      return index;
    }
  }
  return -1;
}

function findNearestTeamCode(lines: string[], playerNameIndex: number) {
  for (let index = playerNameIndex - 1; index >= Math.max(0, playerNameIndex - 12); index -= 1) {
    const code = normalizeTeamCode(lines[index]);
    if (code) return code;
  }

  for (let index = playerNameIndex + 1; index < Math.min(lines.length, playerNameIndex + 30); index += 1) {
    const code = normalizeTeamCode(lines[index]);
    if (code) return code;
  }

  return null;
}

function normalizeTeamCode(value: string | undefined) {
  const code = value?.trim().toUpperCase();
  return code && TEAM_CODE_PATTERN.test(code) ? code.match(TEAM_CODE_PATTERN)?.[1] ?? null : null;
}

function isPlayerName(value: string | undefined) {
  return Boolean(value && /^[A-Z][A-Z' -]+ [A-Z][A-Za-z' -]+$/.test(value));
}

function toNumber(value: string | undefined) {
  return Number(value?.replace("+", ""));
}

function dedupeStats(stats: PlayerStat[]) {
  const seen = new Set<string>();
  return stats.filter((stat) => {
    const key = `${stat.playerName}:${stat.teamCode}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
