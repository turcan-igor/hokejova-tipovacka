import { PageShell } from "@/components/page-shell";
import { TOURNAMENT_START } from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import { isLocked } from "@/lib/scoring";
import type { MatchPredictionRow, MatchRow, MedalPredictionRow, ProfileRow } from "@/lib/db-types";

export default async function OthersTipsPage() {
  const { supabase, profile } = await requireUser();
  const { data: profiles } = await supabase.from("profiles").select("id, display_name").order("display_name");
  const { data: matches } = await supabase.from("matches").select("*").order("starts_at", { ascending: true });
  const profileRows = (profiles ?? []) as ProfileRow[];
  const matchRows = (matches ?? []) as MatchRow[];
  const lockedMatchIds = matchRows.filter((match) => isLocked(match.starts_at)).map((match) => match.id);
  const { data: matchPredictions } = lockedMatchIds.length
    ? await supabase.from("match_predictions").select("*").in("match_id", lockedMatchIds)
    : { data: [] };
  const { data: medalPredictions } = isLocked(TOURNAMENT_START)
    ? await supabase.from("medal_predictions").select("*")
    : { data: [] };

  return (
    <PageShell isAdmin={profile.role === "ADMIN"}>
      <h1 className="mb-6 text-3xl font-bold text-ice-900">Tipy ostatních</h1>

      <section className="mb-8 rounded-lg border border-ice-100 bg-white p-5 shadow-soft">
        <h2 className="mb-4 text-xl font-bold text-ice-900">Medailové tipy</h2>
        {isLocked(TOURNAMENT_START) ? (
          <div className="grid gap-3 md:grid-cols-2">
            {((medalPredictions ?? []) as MedalPredictionRow[]).map((prediction) => {
              const owner = profileRows.find((item) => item.id === prediction.user_id);
              return (
                <div key={prediction.id} className="rounded-md border border-ice-100 p-3">
                  <p className="font-semibold">{owner?.display_name ?? "Uživatel"}</p>
                  <p className="text-sm text-slate-700">
                    Zlato {prediction.gold_team_code}, stříbro {prediction.silver_team_code}, bronz {prediction.bronze_team_code}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-slate-700">Medailové tipy se zobrazí po uzamčení.</p>
        )}
      </section>

      <section className="rounded-lg border border-ice-100 bg-white p-5 shadow-soft">
        <h2 className="mb-4 text-xl font-bold text-ice-900">Zápasové tipy</h2>
        <div className="space-y-4">
          {matchRows.map((match) => {
            const locked = isLocked(match.starts_at);
            return (
              <article key={match.id} className="rounded-md border border-ice-100 p-4">
                <div className="mb-3 flex flex-wrap justify-between gap-2">
                  <p className="font-semibold">
                    {match.home_team_code ?? "?"} - {match.away_team_code ?? "?"}
                  </p>
                  <p className="text-sm text-slate-600">{locked ? "Uzamčeno" : "Zatím skryto"}</p>
                </div>
                {locked ? (
                  <div className="grid gap-2 md:grid-cols-3">
                    {((matchPredictions ?? []) as MatchPredictionRow[])
                      .filter((prediction) => prediction.match_id === match.id)
                      .map((prediction) => {
                        const owner = profileRows.find((item) => item.id === prediction.user_id);
                        return (
                          <div key={prediction.id} className="rounded-md bg-ice-100 px-3 py-2 text-sm">
                            <strong>{owner?.display_name ?? "Uživatel"}:</strong> {prediction.home_score}:{prediction.away_score}
                          </div>
                        );
                      })}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </PageShell>
  );
}
