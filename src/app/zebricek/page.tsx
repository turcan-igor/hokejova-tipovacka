import { PageShell } from "@/components/page-shell";
import { requireUser } from "@/lib/auth";
import { getLeaderboard } from "@/lib/db-queries";

export default async function LeaderboardPage() {
  const { supabase, profile } = await requireUser();
  const leaderboard = await getLeaderboard(supabase);

  return (
    <PageShell isAdmin={profile.role === "ADMIN"}>
      <h1 className="mb-6 text-3xl font-bold text-ice-900">Žebříček</h1>
      <div className="overflow-hidden rounded-lg border border-ice-100 bg-white shadow-soft">
        <table className="w-full border-collapse text-left">
          <thead className="bg-ice-100 text-sm text-ice-900">
            <tr>
              <th className="px-4 py-3">Pořadí</th>
              <th className="px-4 py-3">Jméno</th>
              <th className="px-4 py-3">Zápasy</th>
              <th className="px-4 py-3">Medaile</th>
              <th className="px-4 py-3">Celkem</th>
              <th className="px-4 py-3">Přesné skóre</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((row) => (
              <tr key={row.user_id} className="border-t border-ice-100">
                <td className="px-4 py-4 font-bold">{row.rank}.</td>
                <td className="px-4 py-4">{row.display_name}</td>
                <td className="px-4 py-4">{row.match_points}</td>
                <td className="px-4 py-4">{row.medal_points}</td>
                <td className="px-4 py-4 text-lg font-bold text-rink-blue">{row.total_points}</td>
                <td className="px-4 py-4">{row.exact_scores}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
