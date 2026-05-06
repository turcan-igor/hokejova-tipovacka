import { PageShell } from "@/components/page-shell";
import { MatchTipForm } from "@/components/match-tip-form";
import { AdminSyncButton } from "@/components/admin-forms";
import { requireUser } from "@/lib/auth";
import { isLocked } from "@/lib/scoring";
import type { MatchPredictionRow, MatchRow } from "@/lib/db-types";

export default async function MatchesPage() {
  const { supabase, user, profile } = await requireUser();
  const { data: matches } = await supabase.from("matches").select("*").order("starts_at", { ascending: true });
  const { data: predictions } = await supabase.from("match_predictions").select("*").eq("user_id", user.id);
  const matchRows = (matches ?? []) as MatchRow[];
  const predictionRows = (predictions ?? []) as MatchPredictionRow[];

  return (
    <PageShell isAdmin={profile.role === "ADMIN"}>
      <h1 className="mb-6 text-3xl font-bold text-ice-900">Zápasy</h1>
      {matchRows.length === 0 ? (
        <section className="mb-6 rounded-lg border border-ice-100 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold text-ice-900">Zápasy zatím nejsou načtené</h2>
          <p className="mt-2 max-w-2xl text-slate-700">
            Administrátor musí nejdřív spustit synchronizaci s IIHF. Po úspěšném syncu se zde zobrazí rozpis zápasů.
          </p>
          {profile.role === "ADMIN" ? (
            <div className="mt-4">
              <AdminSyncButton />
            </div>
          ) : null}
        </section>
      ) : null}
      <div className="overflow-x-auto rounded-lg border border-ice-100 bg-white shadow-soft table-scroll">
        <table className="min-w-[900px] w-full border-collapse text-left">
          <thead className="bg-ice-100 text-sm text-ice-900">
            <tr>
              <th className="px-4 py-3">Čas</th>
              <th className="px-4 py-3">Fáze</th>
              <th className="px-4 py-3">Zápas</th>
              <th className="px-4 py-3">Výsledek</th>
              <th className="px-4 py-3">Můj tip</th>
              <th className="px-4 py-3">Body</th>
            </tr>
          </thead>
          <tbody>
            {matchRows.map((match) => {
              const prediction = predictionRows.find((item) => item.match_id === match.id);
              const locked = isLocked(match.starts_at);
              const teamsKnown = match.home_team_code && match.away_team_code;
              return (
                <tr key={match.id} className="border-t border-ice-100 align-top">
                  <td className="px-4 py-4 text-sm text-slate-700">
                    {new Intl.DateTimeFormat("cs-CZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(match.starts_at))}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">{match.phase}</td>
                  <td className="px-4 py-4 font-semibold text-ice-900">
                    {teamsKnown ? `${match.home_team_code} - ${match.away_team_code}` : "Týmy zatím nejsou známy"}
                  </td>
                  <td className="px-4 py-4 text-sm">
                    {match.status === "final" ? `${match.home_score}:${match.away_score}` : match.status}
                  </td>
                  <td className="px-4 py-4">
                    {teamsKnown ? (
                      <MatchTipForm
                        matchId={match.id}
                        defaultHome={prediction?.home_score}
                        defaultAway={prediction?.away_score}
                        disabled={locked}
                      />
                    ) : (
                      <span className="text-sm text-slate-500">Bude otevřeno po doplnění týmů</span>
                    )}
                  </td>
                  <td className="px-4 py-4 font-semibold">{prediction?.points ?? "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
