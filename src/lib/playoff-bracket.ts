import type { MatchRow } from "@/lib/db-types";

export type PlayoffRound = {
  label: string;
  matches: MatchRow[];
};

const ROUND_ORDER = [
  ["Quarterfinals", "Čtvrtfinále"],
  ["Semifinals", "Semifinále"],
  ["Bronze Medal Game", "O bronz"],
  ["Gold Medal Game", "Finále"]
] as const;

export function getPlayoffBracket(matches: MatchRow[]): PlayoffRound[] {
  return ROUND_ORDER.map(([phase, label]) => ({
    label,
    matches: matches
      .filter((match) => match.phase === phase)
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
  })).filter((round) => round.matches.length > 0);
}
