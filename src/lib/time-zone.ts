export const TOURNAMENT_TIME_ZONE = "Europe/Zurich";

export function tournamentLocalTimeToUtcIso({
  year,
  monthIndex,
  day,
  time
}: {
  year: number;
  monthIndex: number;
  day: number;
  time: string;
}) {
  const [hour, minute] = time.split(":").map(Number);
  const initialUtc = Date.UTC(year, monthIndex, day, hour, minute);
  const offset = getTimeZoneOffsetMs(new Date(initialUtc), TOURNAMENT_TIME_ZONE);
  return new Date(initialUtc - offset).toISOString();
}

export function formatTournamentDateTime(date: string | Date, options: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat("cs-CZ", {
    timeZone: TOURNAMENT_TIME_ZONE,
    ...options
  }).format(new Date(date));
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second)
  );

  return asUtc - date.getTime();
}
