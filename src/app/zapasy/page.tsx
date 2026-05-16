import { AdminSyncButton } from "@/components/admin-forms";
import { MatchDayGroupsList, type MatchDayGroupView } from "@/components/match-day-groups-list";
import { PageShell } from "@/components/page-shell";
import { requireUser } from "@/lib/auth";
import type { MatchPredictionRow, MatchRow } from "@/lib/db-types";
import { groupMatchesByDay } from "@/lib/match-groups";
import { isLocked } from "@/lib/scoring";
import { TOURNAMENT_TIME_ZONE } from "@/lib/time-zone";

export default async function MatchesPage() {
  const { supabase, user, profile } = await requireUser();
  const { data: matches } = await supabase.from("matches").select("*").order("starts_at", { ascending: true });
  const { data: predictions } = await supabase.from("match_predictions").select("*").eq("user_id", user.id);
  const matchRows = (matches ?? []) as MatchRow[];
  const predictionRows = (predictions ?? []) as MatchPredictionRow[];
  const matchGroups = groupMatchesByDay(matchRows);
  const viewGroups: MatchDayGroupView[] = matchGroups.map((group) => ({
    key: group.key,
    label: group.label,
    matches: group.matches.map((match) => {
      const prediction = predictionRows.find((item) => item.match_id === match.id);
      const result =
        (match.status === "final" || match.status === "live") &&
        match.home_score !== null &&
        match.away_score !== null
          ? `${match.home_score}:${match.away_score}`
          : match.status;

      return {
        id: match.id,
        phase: match.phase,
        venue: match.venue,
        homeTeamCode: match.home_team_code,
        awayTeamCode: match.away_team_code,
        homeScore: match.home_score,
        awayScore: match.away_score,
        status: match.status,
        timeLabel: new Intl.DateTimeFormat("cs-CZ", {
          timeZone: TOURNAMENT_TIME_ZONE,
          hour: "2-digit",
          minute: "2-digit"
        }).format(new Date(match.starts_at)),
        resultLabel: match.status === "live" ? `Live ${result}` : result,
        locked: isLocked(match.starts_at),
        prediction: prediction
          ? {
              homeScore: prediction.home_score,
              awayScore: prediction.away_score,
              points: prediction.points
            }
          : null
      };
    })
  }));

  return (
    <PageShell isAdmin={profile.role === "ADMIN"}>
      <h1 className="mb-6 text-3xl font-bold text-ice-900 dark:text-slate-100">Zápasy</h1>
      {matchRows.length === 0 ? (
        <section className="mb-6 rounded-lg border border-ice-100 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-xl font-bold text-ice-900 dark:text-slate-100">Zápasy zatím nejsou načtené</h2>
          <p className="mt-2 max-w-2xl text-slate-700 dark:text-slate-300">
            Administrátor musí nejdřív spustit synchronizaci s IIHF. Po úspěšném syncu se zde zobrazí rozpis zápasů.
          </p>
          {profile.role === "ADMIN" ? (
            <div className="mt-4">
              <AdminSyncButton />
            </div>
          ) : null}
        </section>
      ) : null}

      <MatchDayGroupsList groups={viewGroups} />
    </PageShell>
  );
}
