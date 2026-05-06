import Link from "next/link";
import { CalendarClock, Medal, Trophy } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { MatchTipForm } from "@/components/match-tip-form";
import { MedalForm } from "@/components/medal-form";
import { requireUser } from "@/lib/auth";
import { isLocked } from "@/lib/scoring";
import { TOURNAMENT_START } from "@/lib/constants";
import type { MatchPredictionRow, MatchRow, MedalPredictionRow } from "@/lib/db-types";

export default async function HomePage() {
  const { supabase, user, profile } = await requireUser();

  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .not("home_team_code", "is", null)
    .not("away_team_code", "is", null)
    .order("starts_at", { ascending: true })
    .limit(8);

  const { data: predictions } = await supabase
    .from("match_predictions")
    .select("*")
    .eq("user_id", user.id);

  const { data: medalPrediction } = await supabase
    .from("medal_predictions")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const medalLocked = isLocked(TOURNAMENT_START);

  return (
    <PageShell isAdmin={profile.role === "ADMIN"}>
      <section className="mb-8">
        <p className="text-sm font-semibold uppercase text-rink-blue">MS v hokeji 2026</p>
        <h1 className="mt-2 text-3xl font-bold text-ice-900">Moje tipy</h1>
        <p className="mt-3 max-w-2xl text-slate-700">
          Tipy lze upravovat do začátku každého zápasu. Medailové tipy se zamknou před prvním zápasem turnaje.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-lg border border-ice-100 bg-white p-5 shadow-soft">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="inline-flex items-center gap-2 text-xl font-bold text-ice-900">
              <Trophy size={21} />
              Nejbližší zápasy
            </h2>
            <Link href="/zapasy" className="text-sm font-semibold text-rink-blue">
              Všechny zápasy
            </Link>
          </div>
          <div className="space-y-4">
            {((matches ?? []) as MatchRow[]).map((match) => {
              const prediction = ((predictions ?? []) as MatchPredictionRow[]).find((item) => item.match_id === match.id);
              const locked = isLocked(match.starts_at);
              return (
                <article key={match.id} className="rounded-md border border-ice-100 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-ice-900">
                        {match.home_team_code} - {match.away_team_code}
                      </p>
                      <p className="inline-flex items-center gap-1 text-sm text-slate-600">
                        <CalendarClock size={15} />
                        {new Intl.DateTimeFormat("cs-CZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(match.starts_at))}
                      </p>
                    </div>
                    <span className="rounded-md bg-ice-100 px-2 py-1 text-xs font-semibold text-ice-900">
                      {locked ? "Uzamčeno" : "Otevřeno"}
                    </span>
                  </div>
                  <MatchTipForm
                    matchId={match.id}
                    defaultHome={prediction?.home_score}
                    defaultAway={prediction?.away_score}
                    disabled={locked}
                  />
                </article>
              );
            })}
          </div>
        </section>

        <aside className="rounded-lg border border-ice-100 bg-white p-5 shadow-soft">
          <h2 className="mb-4 inline-flex items-center gap-2 text-xl font-bold text-ice-900">
            <Medal size={21} />
            Medaile
          </h2>
          <MedalForm defaults={medalPrediction as MedalPredictionRow | null} disabled={medalLocked} />
          <p className="mt-4 rounded-md bg-ice-100 px-3 py-2 text-sm text-slate-700">
            Stav: {medalLocked ? "uzamčeno" : "otevřeno"}
          </p>
        </aside>
      </div>
    </PageShell>
  );
}
