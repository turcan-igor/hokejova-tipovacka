import type { MatchStatus } from "@/lib/types";
import { tournamentLocalTimeToUtcIso } from "@/lib/time-zone";

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
    const [homeScore, awayScore] = (status === "final" || status === "live") && scoreCandidates.length >= 2
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

export function parseIihfStatsScheduleHtml(html: string): ParsedIihfMatch[] {
  const lines = toTextLines(html);
  const parsed: ParsedIihfMatch[] = [];
  let currentDate: { day: string; month: string } | null = null;
  let currentTime: string | null = null;
  let currentVenue: string | null = null;
  let currentGameNumber: string | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const dateMatch = line.match(/^(\d{1,2})\s+May\s+2026/);
    if (dateMatch) {
      currentDate = { day: dateMatch[1], month: "May" };
      continue;
    }

    const timeMatch = line.match(/^(\d{1,2}:\d{2})\s+GMT\+2/);
    if (timeMatch) {
      currentTime = timeMatch[1];
      continue;
    }

    const venueWithGameMatch = line.match(/^(Swiss Life Arena|BCF Arena)\s+(\d+)$/);
    if (venueWithGameMatch) {
      currentVenue = venueWithGameMatch[1];
      currentGameNumber = venueWithGameMatch[2];
      continue;
    }

    const venueMatch = line.match(/^(Swiss Life Arena|BCF Arena)$/);
    if (venueMatch) {
      currentVenue = venueMatch[1];
      continue;
    }

    if (currentVenue && /^\d+$/.test(line)) {
      currentGameNumber = line;
      continue;
    }

    const combinedMatchLine = line.match(/^(PRE|QF|SF|BMG|GMG)\s+([A-Z()]+(?:\(QF\))?)\s+-\s+([A-Z()]+(?:\(QF\))?)(?:\s+(.+))?$/);
    const tokenizedMatchLine = /^(PRE|QF|SF|BMG|GMG)$/.test(line) && lines[index + 2] === "-"
      ? [line, line, lines[index + 1], lines[index + 3], lines[index + 4] ?? ""]
      : null;
    const matchLine = combinedMatchLine ?? tokenizedMatchLine;
    if (!matchLine || !currentDate || !currentTime) continue;

    const [, phaseCode, homeRaw, awayRaw, resultRaw = ""] = matchLine;
    const scoreMatch = resultRaw.match(/(\d+)\s+-\s+(\d+)/);
    const nextStatusLines = lines.slice(index + 1, index + 12).join(" ").toLowerCase();
    const source = `${resultRaw} ${nextStatusLines}`.toLowerCase();
    const status = source.includes("completed")
      ? "final"
      : source.includes("period") || source.includes("live")
        ? "live"
        : "scheduled";

    parsed.push({
      iihfGameId: currentGameNumber ? `static-2026-${currentGameNumber.padStart(2, "0")}` : null,
      dateLabel: `${currentDate.day} ${currentDate.month}`,
      startsAt: toIsoDate(currentDate.day, currentDate.month, currentTime),
      homeTeamCode: normalizeTeam(homeRaw),
      awayTeamCode: normalizeTeam(awayRaw),
      homeScore: scoreMatch ? Number(scoreMatch[1]) : null,
      awayScore: scoreMatch ? Number(scoreMatch[2]) : null,
      status,
      phase: phaseFromCode(phaseCode),
      venue: currentVenue,
      groupName: inferGroup(normalizeTeam(homeRaw), normalizeTeam(awayRaw))
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

function phaseFromCode(code: string) {
  if (code === "QF") return "Quarterfinals";
  if (code === "SF") return "Semifinals";
  if (code === "BMG") return "Bronze Medal Game";
  if (code === "GMG") return "Gold Medal Game";
  return "Preliminary Round";
}

const GROUP_A_TEAMS = new Set(["AUT", "FIN", "GBR", "GER", "HUN", "LAT", "SUI", "USA"]);
const GROUP_B_TEAMS = new Set(["CAN", "CZE", "DEN", "ITA", "NOR", "SLO", "SVK", "SWE"]);

function inferGroup(homeTeamCode: string | null, awayTeamCode: string | null) {
  if (homeTeamCode && awayTeamCode && GROUP_A_TEAMS.has(homeTeamCode) && GROUP_A_TEAMS.has(awayTeamCode)) return "A";
  if (homeTeamCode && awayTeamCode && GROUP_B_TEAMS.has(homeTeamCode) && GROUP_B_TEAMS.has(awayTeamCode)) return "B";
  return null;
}

function toIsoDate(day: string, month: string, time: string) {
  return tournamentLocalTimeToUtcIso({
    year: 2026,
    monthIndex: MONTHS[month],
    day: Number(day),
    time
  });
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

function toTextLines(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\u00a0/g, " ")
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\s+/g, " "))
    .filter(Boolean);
}
