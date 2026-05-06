import type { ParsedIihfMatch } from "@/lib/iihf-parser";

type StaticMatch = {
  day: number;
  time: string;
  home: string | null;
  away: string | null;
  venue: "Swiss Life Arena" | "BCF Arena";
  group: "A" | "B" | null;
  phase: string;
};

const STATIC_MATCHES: StaticMatch[] = [
  m(15, "16:20", "FIN", "GER", "Swiss Life Arena", "A"),
  m(15, "16:20", "CAN", "SWE", "BCF Arena", "B"),
  m(15, "20:20", "USA", "SUI", "Swiss Life Arena", "A"),
  m(15, "20:20", "CZE", "DEN", "BCF Arena", "B"),
  m(16, "12:20", "GBR", "AUT", "Swiss Life Arena", "A"),
  m(16, "12:20", "SVK", "NOR", "BCF Arena", "B"),
  m(16, "16:20", "HUN", "FIN", "Swiss Life Arena", "A"),
  m(16, "16:20", "ITA", "CAN", "BCF Arena", "B"),
  m(16, "20:20", "SUI", "LAT", "Swiss Life Arena", "A"),
  m(16, "20:20", "SLO", "CZE", "BCF Arena", "B"),
  m(17, "12:20", "GBR", "USA", "Swiss Life Arena", "A"),
  m(17, "12:20", "ITA", "SVK", "BCF Arena", "B"),
  m(17, "16:20", "AUT", "HUN", "Swiss Life Arena", "A"),
  m(17, "16:20", "DEN", "SWE", "BCF Arena", "B"),
  m(17, "20:20", "GER", "LAT", "Swiss Life Arena", "A"),
  m(17, "20:20", "NOR", "SLO", "BCF Arena", "B"),
  m(18, "16:20", "FIN", "USA", "Swiss Life Arena", "A"),
  m(18, "16:20", "CAN", "DEN", "BCF Arena", "B"),
  m(18, "20:20", "GER", "SUI", "Swiss Life Arena", "A"),
  m(18, "20:20", "SWE", "CZE", "BCF Arena", "B"),
  m(19, "16:20", "LAT", "AUT", "Swiss Life Arena", "A"),
  m(19, "16:20", "ITA", "NOR", "BCF Arena", "B"),
  m(19, "20:20", "HUN", "GBR", "Swiss Life Arena", "A"),
  m(19, "20:20", "SLO", "SVK", "BCF Arena", "B"),
  m(20, "16:20", "AUT", "SUI", "Swiss Life Arena", "A"),
  m(20, "16:20", "CZE", "ITA", "BCF Arena", "B"),
  m(20, "20:20", "USA", "GER", "Swiss Life Arena", "A"),
  m(20, "20:20", "SWE", "SLO", "BCF Arena", "B"),
  m(21, "16:20", "LAT", "FIN", "Swiss Life Arena", "A"),
  m(21, "16:20", "CAN", "NOR", "BCF Arena", "B"),
  m(21, "20:20", "SUI", "GBR", "Swiss Life Arena", "A"),
  m(21, "20:20", "DEN", "SVK", "BCF Arena", "B"),
  m(22, "16:20", "GER", "HUN", "Swiss Life Arena", "A"),
  m(22, "16:20", "CAN", "SLO", "BCF Arena", "B"),
  m(22, "20:20", "FIN", "GBR", "Swiss Life Arena", "A"),
  m(22, "20:20", "SWE", "ITA", "BCF Arena", "B"),
  m(23, "12:20", "LAT", "USA", "Swiss Life Arena", "A"),
  m(23, "12:20", "DEN", "SLO", "BCF Arena", "B"),
  m(23, "16:20", "SUI", "HUN", "Swiss Life Arena", "A"),
  m(23, "16:20", "SVK", "CZE", "BCF Arena", "B"),
  m(23, "20:20", "AUT", "GER", "Swiss Life Arena", "A"),
  m(23, "20:20", "NOR", "SWE", "BCF Arena", "B"),
  m(24, "16:20", "GBR", "LAT", "Swiss Life Arena", "A"),
  m(24, "16:20", "DEN", "ITA", "BCF Arena", "B"),
  m(24, "20:20", "FIN", "AUT", "Swiss Life Arena", "A"),
  m(24, "20:20", "SVK", "CAN", "BCF Arena", "B"),
  m(25, "16:20", "USA", "HUN", "Swiss Life Arena", "A"),
  m(25, "16:20", "CZE", "NOR", "BCF Arena", "B"),
  m(25, "20:20", "GER", "GBR", "Swiss Life Arena", "A"),
  m(25, "20:20", "SLO", "ITA", "BCF Arena", "B"),
  m(26, "12:20", "HUN", "LAT", "Swiss Life Arena", "A"),
  m(26, "12:20", "NOR", "DEN", "BCF Arena", "B"),
  m(26, "16:20", "USA", "AUT", "Swiss Life Arena", "A"),
  m(26, "16:20", "SWE", "SVK", "BCF Arena", "B"),
  m(26, "20:20", "SUI", "FIN", "Swiss Life Arena", "A"),
  m(26, "20:20", "CZE", "CAN", "BCF Arena", "B"),
  playoff(28, "16:20", "Swiss Life Arena", "Quarterfinals"),
  playoff(28, "16:20", "BCF Arena", "Quarterfinals"),
  playoff(28, "20:20", "Swiss Life Arena", "Quarterfinals"),
  playoff(28, "20:20", "BCF Arena", "Quarterfinals"),
  playoff(30, "15:20", "Swiss Life Arena", "Semifinals"),
  playoff(30, "20:00", "Swiss Life Arena", "Semifinals"),
  playoff(31, "15:30", "Swiss Life Arena", "Bronze Medal Game"),
  playoff(31, "20:20", "Swiss Life Arena", "Gold Medal Game")
];

export function getStaticSchedule(): ParsedIihfMatch[] {
  return STATIC_MATCHES.map((match, index) => ({
    iihfGameId: `static-2026-${String(index + 1).padStart(2, "0")}`,
    dateLabel: `${match.day} May`,
    startsAt: toIsoDate(match.day, match.time),
    homeTeamCode: match.home,
    awayTeamCode: match.away,
    homeScore: null,
    awayScore: null,
    status: "scheduled",
    phase: match.phase,
    venue: match.venue,
    groupName: match.group
  }));
}

function m(
  day: number,
  time: string,
  home: string,
  away: string,
  venue: StaticMatch["venue"],
  group: "A" | "B"
): StaticMatch {
  return { day, time, home, away, venue, group, phase: "Preliminary Round" };
}

function playoff(
  day: number,
  time: string,
  venue: StaticMatch["venue"],
  phase: string
): StaticMatch {
  return { day, time, home: null, away: null, venue, group: null, phase };
}

function toIsoDate(day: number, time: string) {
  return new Date(Date.UTC(2026, 4, day, Number(time.slice(0, 2)) - 2, Number(time.slice(3, 5)))).toISOString();
}
