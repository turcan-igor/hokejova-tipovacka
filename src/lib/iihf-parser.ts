import type { MatchStatus } from "@/lib/types";

export type ParsedIihfMatch = {
  iihfGameId: string | null;
  dateLabel: string;
  startsAt: string;
  homeTeamCode: string | null;
  awayTeamCode: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  phase: string;
  venue: string | null;
  groupName: string | null;
};

const MONTHS: Record<string, number> = {
  May: 4
};

export function parseIihfScheduleHtml(html: string): ParsedIihfMatch[] {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const gameIds = Array.from(html.matchAll(/gamecenter\/playbyplay\/(\d+)\//g)).map((match) => match[1]);
  const parsed: ParsedIihfMatch[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const dateMatch = lines[index].match(/^(\d{1,2})\s+(May)$/);
    if (!dateMatch) continue;

    const candidate = lines.slice(index, index + 24);
    const versusIndex = candidate.findIndex((line) => /^[A-Z()]+(?:\(QF\))?\s+vs\s+[A-Z()]+(?:\(QF\))?$/.test(line));
    if (versusIndex === -1) continue;

    const teams = candidate[versusIndex].split(" vs ");
    const time = candidate.find((line) => /^\d{1,2}:\d{2}$/.test(line));
    if (!time) continue;

    const venueLine = candidate[versusIndex + 1] ?? "";
    const scoreCandidates = candidate
      .slice(0, versusIndex)
      .filter((line) => /^\d+$/.test(line))
      .map(Number);
    const statusSource = candidate.join(" ").toLowerCase();
    const status = normalizeStatus(statusSource);
    const [homeScore, awayScore] = status === "final" && scoreCandidates.length >= 2
      ? [scoreCandidates[0], scoreCandidates[1]]
      : [null, null];

    parsed.push({
      iihfGameId: gameIds[parsed.length] ?? null,
      dateLabel: lines[index],
      startsAt: toIsoDate(dateMatch[1], dateMatch[2], time),
      homeTeamCode: normalizeTeam(teams[0]),
      awayTeamCode: normalizeTeam(teams[1]),
      homeScore,
      awayScore,
      status,
      phase: inferPhase(teams[0], venueLine),
      venue: venueLine.split(",")[0] || null,
      groupName: venueLine.match(/Group\s+([AB])/)?.[1] ?? null
    });
  }

  return dedupe(parsed);
}

function normalizeStatus(source: string): MatchStatus {
  if (source.includes("final")) return "final";
  if (source.includes("upcoming")) return "scheduled";
  if (source.includes("live")) return "live";
  return "scheduled";
}

function normalizeTeam(team: string) {
  const trimmed = team.trim();
  if (["QF", "W(QF)", "L(SF)", "W(SF)"].includes(trimmed)) return null;
  return /^[A-Z]{3}$/.test(trimmed) ? trimmed : null;
}

function inferPhase(homeTeam: string, venueLine: string) {
  if (homeTeam === "QF") return "Quarterfinals";
  if (homeTeam === "W(QF)") return "Semifinals";
  if (homeTeam === "L(SF)") return "Bronze Medal Game";
  if (homeTeam === "W(SF)") return "Gold Medal Game";
  if (venueLine.includes("Group")) return "Preliminary Round";
  return "Playoffs";
}

function toIsoDate(day: string, month: string, time: string) {
  const date = new Date(Date.UTC(2026, MONTHS[month], Number(day), Number(time.slice(0, 2)) - 2, Number(time.slice(3, 5))));
  return date.toISOString();
}

function dedupe(matches: ParsedIihfMatch[]) {
  const seen = new Set<string>();
  return matches.filter((match) => {
    const key = `${match.startsAt}:${match.homeTeamCode ?? match.phase}:${match.awayTeamCode ?? match.venue}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
