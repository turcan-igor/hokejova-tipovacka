import { AdminSyncButton } from "@/components/admin-forms";
import { MatchTipForm } from "@/components/match-tip-form";
import { PageShell } from "@/components/page-shell";
import { Matchup } from "@/components/team-badge";
import { requireUser } from "@/lib/auth";
import type { MatchPredictionRow, MatchRow } from "@/lib/db-types";
import { groupMatchesByDay } from "@/lib/match-groups";
import { isLocked } from "@/lib/scoring";

export default async function MatchesPage() {
  const { supabase, user, profile } = await requireUser();
  const { data: matches } = await supabase.from("matches").select("*").order("starts_at", { ascending: true });
  const { data: predictions } = await supabase.from("match_predictions").select("*").eq("user_id", user.id);
  const matchRows = (matches ?? []) as MatchRow[];
  const predictionRows = (predictions ?? []) as MatchPredictionRow[];
  const matchGroups = groupMatchesByDay(matchRows);

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

      <div className="grid gap-6">
        {matchGroups.map((group) => (
          <section
            key={group.key}
            className="rounded-lg border border-ice-100 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900"
          >
            <h2 className="mb-4 text-xl font-bold capitalize text-ice-900 dark:text-slate-100">{group.label}</h2>
            <div className="grid gap-3">
              {group.matches.map((match) => {
                const prediction = predictionRows.find((item) => item.match_id === match.id);
                const locked = isLocked(match.starts_at);
                const teamsKnown = match.home_team_code && match.away_team_code;

                return (
                  <article
                    key={match.id}
                    className="grid gap-4 rounded-md border border-ice-100 p-4 dark:border-slate-700 md:grid-cols-[88px_1fr_120px_minmax(240px,auto)_72px] md:items-center"
                  >
                    <div>
                      <p className="text-lg font-bold text-ice-900 dark:text-slate-100">
                        {new Intl.DateTimeFormat("cs-CZ", {
                          timeZone: "Europe/Prague",
                          hour: "2-digit",
                          minute: "2-digit"
                        }).format(new Date(match.starts_at))}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{match.venue ?? ""}</p>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase text-rink-blue dark:text-sky-300">{match.phase}</p>
                      <Matchup homeTeamCode={match.home_team_code} awayTeamCode={match.away_team_code} />
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Výsledek</p>
                      <p className="font-semibold text-ice-900 dark:text-slate-100">
                        {match.status === "final" ? `${match.home_score}:${match.away_score}` : match.status}
                      </p>
                    </div>

                    <div>
                      {teamsKnown ? (
                        <MatchTipForm
                          matchId={match.id}
                          defaultHome={prediction?.home_score}
                          defaultAway={prediction?.away_score}
                          disabled={locked}
                        />
                      ) : (
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          Bude otevřeno po doplnění týmů
                        </span>
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Body</p>
                      <p className="text-lg font-bold text-rink-blue dark:text-sky-300">{prediction?.points ?? "-"}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
