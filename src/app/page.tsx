import Link from "next/link";
import { CalendarClock, Medal, Trophy } from "lucide-react";
import { LiveTipStateBadge } from "@/components/live-tip-state";
import { MatchTipForm } from "@/components/match-tip-form";
import { MedalForm } from "@/components/medal-form";
import { PageShell } from "@/components/page-shell";
import { Matchup } from "@/components/team-badge";
import { requireUser } from "@/lib/auth";
import { TOURNAMENT_START } from "@/lib/constants";
import type { MatchPredictionRow, MatchRow, MedalPredictionRow } from "@/lib/db-types";
import { getLivePredictionState, isLocked } from "@/lib/scoring";
import { formatTournamentDateTime } from "@/lib/time-zone";

export default async function HomePage() {
  const { supabase, user, profile } = await requireUser();
  const now = new Date();
  const medalLocked = isLocked(TOURNAMENT_START, now);

  const [{ data: matches }, { data: predictions }, { data: medalPrediction }] = await Promise.all([
    supabase
      .from("matches")
      .select("id,iihf_game_id,phase,starts_at,venue,group_name,home_team_code,away_team_code,home_score,away_score,status")
      .not("home_team_code", "is", null)
      .not("away_team_code", "is", null)
      .or(`status.eq.live,starts_at.gt.${now.toISOString()}`)
      .order("starts_at", { ascending: true })
      .limit(8),
    supabase
      .from("match_predictions")
      .select("id,user_id,match_id,home_score,away_score,points,is_exact")
      .eq("user_id", user.id),
    supabase
      .from("medal_predictions")
      .select("id,user_id,gold_team_code,silver_team_code,bronze_team_code,points")
      .eq("user_id", user.id)
      .maybeSingle()
  ]);

  const matchRows = ((matches ?? []) as MatchRow[]).filter((match) => match.status === "live" || !isLocked(match.starts_at, now));
  const predictionRows = (predictions ?? []) as MatchPredictionRow[];

  return (
    <PageShell isAdmin={profile.role === "ADMIN"}>
      <section className="mb-8">
        <p className="text-sm font-semibold uppercase text-rink-blue dark:text-sky-300">MS v hokeji 2026</p>
        <h1 className="mt-2 text-3xl font-bold text-ice-900 dark:text-slate-100">Moje tipy</h1>
        <p className="mt-3 max-w-2xl text-slate-700 dark:text-slate-300">
          Tipy lze upravovat do začátku každého zápasu. Tady se zobrazují otevřené zápasy a zápasy, které se právě hrají.
        </p>
      </section>

      <div className={`grid gap-6 ${medalLocked ? "" : "lg:grid-cols-[1fr_360px]"}`}>
        <section className="rounded-lg border border-ice-100 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="inline-flex items-center gap-2 text-xl font-bold text-ice-900 dark:text-slate-100">
              <Trophy size={21} />
              Nejbližší zápasy
            </h2>
            <Link href="/zapasy" className="text-sm font-semibold text-rink-blue dark:text-sky-300">
              Všechny zápasy
            </Link>
          </div>
          <div className="space-y-4">
            {matchRows.length === 0 ? (
              <p className="rounded-md bg-ice-100 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Žádné otevřené ani právě hrané zápasy teď nejsou dostupné.
              </p>
            ) : null}
            {matchRows.map((match) => {
              const prediction = predictionRows.find((item) => item.match_id === match.id);
              const liveState = prediction ? getLivePredictionState(prediction, match) : null;
              const liveScore =
                match.status === "live" && match.home_score !== null && match.away_score !== null
                  ? `${match.home_score}:${match.away_score}`
                  : null;

              return (
                <article key={match.id} className="rounded-md border border-ice-100 p-4 dark:border-slate-700">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <Matchup homeTeamCode={match.home_team_code} awayTeamCode={match.away_team_code} />
                      <p className="mt-2 inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-300">
                        <CalendarClock size={15} />
                        {formatTournamentDateTime(match.starts_at, { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <span className="rounded-md bg-ice-100 px-2 py-1 text-xs font-semibold text-ice-900 dark:bg-slate-800 dark:text-slate-100">
                        {liveScore ? `Live ${liveScore}` : "Otevřeno"}
                      </span>
                      <LiveTipStateBadge state={liveState} />
                    </div>
                  </div>
                  <MatchTipForm
                    matchId={match.id}
                    defaultHome={prediction?.home_score}
                    defaultAway={prediction?.away_score}
                    disabled={match.status === "live"}
                  />
                </article>
              );
            })}
          </div>
        </section>

        {!medalLocked ? (
          <aside className="rounded-lg border border-ice-100 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-4 inline-flex items-center gap-2 text-xl font-bold text-ice-900 dark:text-slate-100">
              <Medal size={21} />
              Medaile
            </h2>
            <MedalForm defaults={medalPrediction as MedalPredictionRow | null} disabled={false} />
            <p className="mt-4 rounded-md bg-ice-100 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              Stav: otevřeno
            </p>
          </aside>
        ) : null}
      </div>
    </PageShell>
  );
}
