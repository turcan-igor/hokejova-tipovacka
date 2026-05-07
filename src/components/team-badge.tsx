import { TEAM_OPTIONS } from "@/lib/constants";

const TEAM_FLAG_COUNTRIES: Record<string, string> = {
  AUT: "at",
  CAN: "ca",
  CZE: "cz",
  DEN: "dk",
  FIN: "fi",
  GBR: "gb",
  GER: "de",
  HUN: "hu",
  ITA: "it",
  LAT: "lv",
  NOR: "no",
  SLO: "si",
  SUI: "ch",
  SVK: "sk",
  SWE: "se",
  USA: "us"
};

export function TeamBadge({ code }: { code: string | null }) {
  if (!code) {
    return (
      <span className="inline-flex h-8 items-center rounded-md bg-slate-100 px-2 text-sm font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        ?
      </span>
    );
  }

  const team = TEAM_OPTIONS.find((item) => item.code === code);
  const flagCountry = TEAM_FLAG_COUNTRIES[code];

  return (
    <span
      title={team?.name ?? code}
      className="inline-flex h-8 items-center gap-2 rounded-md bg-ice-100 px-2 text-sm font-bold text-ice-900 dark:bg-slate-800 dark:text-slate-100"
    >
      {flagCountry ? (
        <span
          aria-hidden="true"
          className="block h-3.5 w-5 rounded-[2px] bg-cover bg-center shadow-sm ring-1 ring-black/10 dark:ring-white/10"
          style={{ backgroundImage: `url("https://flagcdn.com/w40/${flagCountry}.png")` }}
        />
      ) : null}
      {code}
    </span>
  );
}

export function Matchup({
  homeTeamCode,
  awayTeamCode
}: {
  homeTeamCode: string | null;
  awayTeamCode: string | null;
}) {
  if (!homeTeamCode || !awayTeamCode) {
    return <span className="font-semibold text-slate-600 dark:text-slate-300">Týmy zatím nejsou známy</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <TeamBadge code={homeTeamCode} />
      <span className="text-sm font-semibold text-slate-400">vs</span>
      <TeamBadge code={awayTeamCode} />
    </div>
  );
}
