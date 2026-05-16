import { OthersMatchTipsList, type OthersMatchTipMatch } from "@/components/others-match-tips-list";
import { PageShell } from "@/components/page-shell";
import { TOURNAMENT_START } from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import { isLocked } from "@/lib/scoring";
import { formatTournamentDateTime } from "@/lib/time-zone";
import type { MatchPredictionRow, MatchRow, MedalPredictionRow, ProfileRow } from "@/lib/db-types";

export default async function OthersTipsPage() {
  const { supabase, profile } = await requireUser();
  const { data: profiles } = await supabase.from("profiles").select("id, display_name").order("display_name");
  const { data: matches } = await supabase.from("matches").select("*").order("starts_at", { ascending: false });
  const profileRows = (profiles ?? []) as ProfileRow[];
  const matchRows = (matches ?? []) as MatchRow[];
  const lockedMatches = matchRows.filter((match) => isLocked(match.starts_at) || match.status === "live");
  const lockedMatchIds = lockedMatches.map((match) => match.id);
  const { data: matchPredictions } = lockedMatchIds.length
    ? await supabase.from("match_predictions").select("*").in("match_id", lockedMatchIds)
    : { data: [] };
  const { data: medalPredictions } = isLocked(TOURNAMENT_START)
    ? await supabase.from("medal_predictions").select("*")
    : { data: [] };
  const matchPredictionRows = (matchPredictions ?? []) as MatchPredictionRow[];
  const matchTipMatches: OthersMatchTipMatch[] = lockedMatches.map((match) => {
    const predictions = matchPredictionRows
      .filter((prediction) => prediction.match_id === match.id)
      .map((prediction) => {
        const owner = profileRows.find((item) => item.id === prediction.user_id);
        return {
          id: prediction.id,
          userName: owner?.display_name ?? "Uživatel",
          homeScore: prediction.home_score,
          awayScore: prediction.away_score,
          points: prediction.points,
          isExact: prediction.is_exact
        };
      });
    const visibleResult =
      (match.status === "final" || match.status === "live") &&
      match.home_score !== null &&
      match.away_score !== null
        ? `${match.home_score}:${match.away_score}`
        : null;

    return {
      id: match.id,
      homeTeamCode: match.home_team_code,
      awayTeamCode: match.away_team_code,
      startsAtLabel: formatTournamentDateTime(match.starts_at),
      status: match.status,
      homeScore: match.home_score,
      awayScore: match.away_score,
      resultLabel: match.status === "live" && visibleResult ? `Live ${visibleResult}` : visibleResult ?? "Uzamčeno",
      predictions
    };
  });

  return (
    <PageShell isAdmin={profile.role === "ADMIN"}>
      <h1 className="mb-6 text-3xl font-bold text-ice-900 dark:text-slate-100">Tipy ostatních</h1>

      <section className="mb-8 rounded-lg border border-ice-100 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-4 text-xl font-bold text-ice-900 dark:text-slate-100">Zápasové tipy</h2>
        <OthersMatchTipsList matches={matchTipMatches} />
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
