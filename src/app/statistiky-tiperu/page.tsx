import { PageShell } from "@/components/page-shell";
import { TipperStatCard } from "@/components/tipper-stat-card";
import { TipperTrophyBadge } from "@/components/tipper-trophy-badge";
import { requireUser } from "@/lib/auth";
import { formatDecimal, formatPercent, getCachedTipperStats } from "@/lib/tipper-stats";
import { createTrophyFromAward } from "@/lib/tipper-trophy-config";

const awardGroups = ["Výkon", "Forma", "Styl tipování", "Zábavné ceny"] as const;

export default async function TipperStatsPage() {
  const { profile } = await requireUser();
  const stats = await getCachedTipperStats();

  return (
    <PageShell isAdmin={profile.role === "ADMIN"}>
      <div className="mb-6">
        <p className="text-sm font-bold uppercase text-rink-blue dark:text-sky-300">Tipéři</p>
        <h1 className="mt-2 text-3xl font-bold text-ice-900 dark:text-slate-100">Statistiky tipérů</h1>
        <p className="mt-2 max-w-3xl text-slate-700 dark:text-slate-300">
          Přehled formy, přesnosti a trochu zbytečně vážných ocenění pro všechny účastníky.
        </p>
      </div>

      <section className="mb-8 grid gap-4 md:grid-cols-4">
        <TipperStatCard title="Finální zápasy" value={stats.finalMatchCount} description="Zápasy započítané do úspěšnosti." />
        <TipperStatCard title="Uzamčené zápasy" value={stats.lockedKnownMatchCount} description="Zápasy použité pro disciplínu tipování." />
        <TipperStatCard
          title="Nejlepší úspěšnost vítěze"
          value={formatPercent(Math.max(...stats.profiles.map((item) => item.winnerAccuracy ?? 0), 0))}
          description="Z finálních natipovaných zápasů."
        />
        <TipperStatCard
          title="Nejvyšší průměr"
          value={formatDecimal(Math.max(...stats.profiles.map((item) => item.averagePointsPerFinalPrediction ?? 0), 0))}
          description="Body na finální natipovaný zápas."
        />
      </section>

      {awardGroups.map((group) => (
        <section key={group} className="mb-8">
          <h2 className="mb-4 text-xl font-bold text-ice-900 dark:text-slate-100">{group}</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {stats.awards
              .filter((award) => award.group === group)
              .map((award) => (
                <TipperStatCard
                  key={award.key}
                  title={award.title}
                  value={award.winnerLabel}
                  description={award.description}
                  href={award.winners.length === 1 && award.winnerUserId ? `/tiperi/${award.winnerUserId}` : undefined}
                  icon={<TipperTrophyBadge trophy={createTrophyFromAward(award)} size="lg" />}
                />
              ))}
          </div>
        </section>
      ))}
    </PageShell>
  );
}
