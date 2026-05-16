import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { TeamBadge } from "@/components/team-badge";
import { requireUser } from "@/lib/auth";
import type { PlayerStatRow } from "@/lib/db-types";
import { sortPlayerStats, type PlayerStat } from "@/lib/player-stats";

const VIEWS = [
  { key: "points", label: "Body" },
  { key: "goals", label: "Střelci" },
  { key: "assists", label: "Asistenti" }
] as const;

export default async function PlayerStatsPage({
  searchParams
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { supabase, profile } = await requireUser();
  const params = await searchParams;
  const view = params.view === "goals" || params.view === "assists" ? params.view : "points";
  const { data } = await supabase
    .from("player_stats")
    .select("id,player_name,team_code,position,games_played,goals,assists,points,plus_minus,penalty_minutes,source,updated_at");
  const rows = sortPlayerStats(((data ?? []) as PlayerStatRow[]).map(toPlayerStat), view);

  return (
    <PageShell isAdmin={profile.role === "ADMIN"}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase text-rink-blue dark:text-sky-300">IIHF statistiky</p>
          <h1 className="mt-2 text-3xl font-bold text-ice-900 dark:text-slate-100">Statistiky hráčů</h1>
        </div>
        <nav className="flex rounded-md bg-ice-100 p-1 dark:bg-slate-800">
          {VIEWS.map((item) => (
            <Link
              key={item.key}
              href={`/statistiky?view=${item.key}`}
              className={`rounded-md px-3 py-2 text-sm font-semibold ${
                view === item.key
                  ? "bg-white text-ice-900 shadow-sm dark:bg-slate-950 dark:text-slate-100"
                  : "text-slate-600 dark:text-slate-300"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <section className="rounded-lg border border-ice-100 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
        {rows.length === 0 ? (
          <p className="text-slate-700 dark:text-slate-300">
            Statistiky zatím nejsou dostupné. Objeví se po tom, co je IIHF začne zveřejňovat a proběhne sync.
          </p>
        ) : (
          <div className="overflow-x-auto table-scroll">
            <table className="min-w-[760px] w-full text-left text-sm">
              <thead className="bg-ice-100 text-ice-900 dark:bg-slate-800 dark:text-slate-100">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Hráč</th>
                  <th className="px-3 py-2">Tým</th>
                  <th className="px-3 py-2">Z</th>
                  <th className="px-3 py-2">G</th>
                  <th className="px-3 py-2">A</th>
                  <th className="px-3 py-2">B</th>
                  <th className="px-3 py-2">+/-</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={`${row.playerName}-${row.teamCode}`} className="border-t border-ice-100 dark:border-slate-700">
                    <td className="px-3 py-3 font-semibold">{index + 1}</td>
                    <td className="px-3 py-3 font-semibold text-ice-900 dark:text-slate-100">{row.playerName}</td>
                    <td className="px-3 py-3">
                      <TeamBadge code={row.teamCode} />
                    </td>
                    <td className="px-3 py-3">{row.gamesPlayed}</td>
                    <td className="px-3 py-3">{row.goals}</td>
                    <td className="px-3 py-3">{row.assists}</td>
                    <td className="px-3 py-3 text-lg font-bold text-rink-blue dark:text-sky-300">{row.points}</td>
                    <td className="px-3 py-3">{row.plusMinus ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PageShell>
  );
}

function toPlayerStat(row: PlayerStatRow): PlayerStat {
  return {
    playerName: row.player_name,
    teamCode: row.team_code,
    position: row.position,
    gamesPlayed: row.games_played,
    goals: row.goals,
    assists: row.assists,
    points: row.points,
    plusMinus: row.plus_minus,
    penaltyMinutes: row.penalty_minutes,
    source: row.source ?? "database"
  };
}
