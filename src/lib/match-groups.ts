import type { MatchRow } from "@/lib/db-types";

export type MatchDayGroup = {
  key: string;
  label: string;
  matches: MatchRow[];
};

export function groupMatchesByDay(matches: MatchRow[], locale = "cs-CZ"): MatchDayGroup[] {
  const sorted = [...matches].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
  );
  const groups = new Map<string, MatchDayGroup>();

  for (const match of sorted) {
    const date = new Date(match.starts_at);
    const key = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Prague",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(date);

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: new Intl.DateTimeFormat(locale, {
          timeZone: "Europe/Prague",
          weekday: "long",
          day: "numeric",
          month: "numeric",
          year: "numeric"
        }).format(date),
        matches: []
      });
    }

    groups.get(key)!.matches.push(match);
  }

  return Array.from(groups.values());
}
