import { PageShell } from "@/components/page-shell";
import { Matchup } from "@/components/team-badge";
import { TOURNAMENT_START } from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import { isLocked } from "@/lib/scoring";
import { formatTournamentDateTime } from "@/lib/time-zone";
import type { MatchPredictionRow, MatchRow, MedalPredictionRow, ProfileRow } from "@/lib/db-types";

export default async function OthersTipsPage() {
  const { supabase, profile } = await requireUser();
  const { data: profiles } = await supabase.from("profiles").select("id, display_name").order("display_name");
  const { data: matches } = await supabase.from("matches").select("*").order("starts_at", { ascending: true });
  const profileRows = (profiles ?? []) as ProfileRow[];
  const matchRows = (matches ?? []) as MatchRow[];
  const lockedMatches = matchRows.filter((match) => isLocked(match.starts_at));
  const lockedMatchIds = lockedMatches.map((match) => match.id);
  const { data: matchPredictions } = lockedMatchIds.length
    ? await supabase.from("match_predictions").select("*").in("match_id", lockedMatchIds)
    : { data: [] };
  const { data: medalPredictions } = isLocked(TOURNAMENT_START)
    ? await supabase.from("medal_predictions").select("*")
    : { data: [] };

  return (
    <PageShell isAdmin={profile.role === "ADMIN"}>
      <h1 className="mb-6 text-3xl font-bold text-ice-900 dark:text-slate-100">Tipy ostatních</h1>

      <section className="mb-8 rounded-lg border border-ice-100 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-4 text-xl font-bold text-ice-900 dark:text-slate-100">Zápasové tipy</h2>
        <div className="space-y-4">
          {lockedMatches.length === 0 ? (
            <p className="rounded-md bg-ice-100 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              Zatím není uzamčený žádný zápas.
            </p>
          ) : null}
          {lockedMatches.map((match) => {
            const predictionsForMatch = ((matchPredictions ?? []) as MatchPredictionRow[]).filter(
              (prediction) => prediction.match_id === match.id
            );

            return (
              <article key={match.id} className="rounded-md border border-ice-100 p-4 dark:border-slate-700">
                <div className="mb-3 flex flex-wrap justify-between gap-2">
                  <div>
                    <Matchup homeTeamCode={match.home_team_code} awayTeamCode={match.away_team_code} />
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                      {formatTournamentDateTime(match.starts_at)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    {match.status === "final" && match.home_score !== null && match.away_score !== null
                      ? `${match.home_score}:${match.away_score}`
                      : "Uzamčeno"}
                  </p>
                </div>

                {predictionsForMatch.length > 0 ? (
                  <div className="grid gap-2 md:grid-cols-3">
                    {predictionsForMatch.map((prediction) => {
                      const owner = profileRows.find((item) => item.id === prediction.user_id);
                      const isExact = prediction.is_exact || prediction.points === 3;

                      return (
                        <div
                          key={prediction.id}
                          className={
                            isExact
                              ? "rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100"
                              : "rounded-md bg-ice-100 px-3 py-2 text-sm text-ice-900 dark:bg-slate-800 dark:text-slate-100"
                          }
                        >
                          <div className="flex items-center justify-between gap-2">
                            <strong>{owner?.display_name ?? "Uživatel"}</strong>
                            {isExact ? (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100">
                                Přesně
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 font-semibold">
                            {prediction.home_score}:{prediction.away_score}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-md bg-ice-100 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    K tomuto zápasu zatím nejsou viditelné žádné tipy.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-ice-100 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-4 text-xl font-bold text-ice-900 dark:text-slate-100">Medailové tipy</h2>
        {isLocked(TOURNAMENT_START) ? (
          <div className="grid gap-3 md:grid-cols-2">
            {((medalPredictions ?? []) as MedalPredictionRow[]).map((prediction) => {
              const owner = profileRows.find((item) => item.id === prediction.user_id);
              return (
                <div key={prediction.id} className="rounded-md border border-ice-100 p-3 dark:border-slate-700">
                  <p className="font-semibold text-ice-900 dark:text-slate-100">{owner?.display_name ?? "Uživatel"}</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    Zlato {prediction.gold_team_code}, stříbro {prediction.silver_team_code}, bronz {prediction.bronze_team_code}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-slate-700 dark:text-slate-300">Medailové tipy se zobrazí po uzamčení.</p>
        )}
      </section>
    </PageShell>
  );
}
