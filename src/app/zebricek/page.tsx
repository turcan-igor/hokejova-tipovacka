import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { requireUser } from "@/lib/auth";
import { getCachedLeaderboard } from "@/lib/db-queries";

export default async function LeaderboardPage() {
  const { profile } = await requireUser();
  const leaderboard = await getCachedLeaderboard();

  return (
    <PageShell isAdmin={profile.role === "ADMIN"}>
      <h1 className="mb-6 text-3xl font-bold text-ice-900 dark:text-slate-100">Žebříček</h1>
      <div className="overflow-x-auto rounded-lg border border-ice-100 bg-white shadow-soft table-scroll dark:border-slate-700 dark:bg-slate-900">
        <table className="min-w-[720px] w-full border-collapse text-left">
          <thead className="bg-ice-100 text-sm text-ice-900 dark:bg-slate-800 dark:text-slate-100">
            <tr>
              <th className="px-4 py-3">Pořadí</th>
              <th className="px-4 py-3">Jméno</th>
              <th className="px-4 py-3">Zápasy</th>
              <th className="px-4 py-3">Medaile</th>
              <th className="px-4 py-3">Celkem</th>
              <th className="px-4 py-3">Přesné skóre</th>
              <th className="px-4 py-3">Detail</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((row) => (
              <tr key={row.user_id} className="border-t border-ice-100 dark:border-slate-700">
                <td className="px-4 py-4 font-bold">{row.rank}.</td>
                <td className="px-4 py-4">
                  <Link href={`/tiperi/${row.user_id}`} className="font-semibold text-rink-blue hover:underline dark:text-sky-300">
                    {row.display_name}
                  </Link>
                </td>
                <td className="px-4 py-4">{row.match_points}</td>
                <td className="px-4 py-4">{row.medal_points}</td>
                <td className="px-4 py-4 text-lg font-bold text-rink-blue dark:text-sky-300">{row.total_points}</td>
                <td className="px-4 py-4">{row.exact_scores}</td>
                <td className="px-4 py-4">
                  <Link href={`/tiperi/${row.user_id}`} className="text-sm font-semibold text-rink-blue hover:underline dark:text-sky-300">
                    Statistiky
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
