import { TEAM_OPTIONS } from "@/lib/constants";

const TEAM_FLAGS: Record<string, string> = {
  AUT: "🇦🇹",
  CAN: "🇨🇦",
  CZE: "🇨🇿",
  DEN: "🇩🇰",
  FIN: "🇫🇮",
  GBR: "🇬🇧",
  GER: "🇩🇪",
  HUN: "🇭🇺",
  ITA: "🇮🇹",
  LAT: "🇱🇻",
  NOR: "🇳🇴",
  SLO: "🇸🇮",
  SUI: "🇨🇭",
  SVK: "🇸🇰",
  SWE: "🇸🇪",
  USA: "🇺🇸"
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
  const flag = TEAM_FLAGS[code] ?? "🏒";

  return (
    <span
      title={team?.name ?? code}
      className="inline-flex h-8 items-center gap-2 rounded-md bg-ice-100 px-2 text-sm font-bold text-ice-900 dark:bg-slate-800 dark:text-slate-100"
    >
      <span aria-hidden="true" className="text-base leading-none">
        {flag}
      </span>
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
