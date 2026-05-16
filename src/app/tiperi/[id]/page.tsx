import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { TipperStatCard } from "@/components/tipper-stat-card";
import { TipperTrophyList } from "@/components/tipper-trophy-badge";
import { requireUser } from "@/lib/auth";
import { formatDecimal, formatPercent, getCachedTipperStats } from "@/lib/tipper-stats";

export default async function TipperDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await requireUser();
  const stats = await getCachedTipperStats();
  const tipper = stats.profiles.find((item) => item.user_id === id);
  const leader = stats.profiles[0] ?? null;
  if (!tipper) notFound();

  return (
    <PageShell isAdmin={profile.role === "ADMIN"}>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/zebricek" className="text-sm font-semibold text-rink-blue hover:underline dark:text-sky-300">
            ← Zpět na žebříček
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-ice-900 dark:text-slate-100">{tipper.display_name}</h1>
          <p className="mt-2 text-slate-700 dark:text-slate-300">Detail formy, přesnosti a vztahu k lídrovi soutěže.</p>
          <div className="mt-4">
            <TipperTrophyList trophies={tipper.trophies} emptyLabel="Zatím bez trofeje" />
          </div>
        </div>
        <Link href="/statistiky-tiperu" className="text-sm font-semibold text-rink-blue hover:underline dark:text-sky-300">
          Síň statistik
        </Link>
      </div>

      <section className="mb-8 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <TipperStatCard title="Pořadí" value={`${tipper.rank}.`} />
        <TipperStatCard title="Celkem" value={tipper.total_points} description="Body ze zápasů i medailí." />
        <TipperStatCard title="Na lídra" value={tipper.pointsBehindLeader ? `-${tipper.pointsBehindLeader}` : "0"} />
        <TipperStatCard title="Na top 3" value={tipper.pointsBehindTop3 ? `-${tipper.pointsBehindTop3}` : "0"} />
        <TipperStatCard title="Zápasy" value={tipper.match_points} />
        <TipperStatCard title="Medaile" value={tipper.medal_points} />
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-xl font-bold text-ice-900 dark:text-slate-100">Přesnost</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <TipperStatCard title="Úspěšnost vítěze" value={formatPercent(tipper.winnerAccuracy)} description={`${tipper.correctWinnerCount}/${tipper.finalPredictedMatches} finálních tipů`} />
          <TipperStatCard title="Přesné skóre" value={formatPercent(tipper.exactAccuracy)} description={`${tipper.exact_scores} přesných tref`} />
          <TipperStatCard title="Bodová úspěšnost" value={formatPercent(tipper.pointEfficiency)} description="Získané zápasové body vůči maximu." />
          <TipperStatCard title="Průměr na zápas" value={formatDecimal(tipper.averagePointsPerFinalPrediction)} description="Body na finální natipovaný zápas." />
          <TipperStatCard title="Disciplína" value={formatPercent(tipper.disciplineRate)} description={`${tipper.filledLockedKnownMatches}/${tipper.lockedKnownMatches} uzamčených známých zápasů`} />
          <TipperStatCard title="Netipováno" value={tipper.finalMissedMatches} description="Finální zápasy bez tipu." />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-xl font-bold text-ice-900 dark:text-slate-100">Forma</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <TipperStatCard title="Posledních 5 zápasů" value={tipper.pointsLast5} />
          <TipperStatCard title="Posledních 10 zápasů" value={tipper.pointsLast10} />
          <TipperStatCard title="Nejlepší den" value={tipper.bestDay ? `${tipper.bestDay.points} b.` : "Nedostatek dat"} description={tipper.bestDay?.label} />
          <TipperStatCard title="Aktuální bodová série" value={tipper.currentPointStreak} />
          <TipperStatCard title="Nejdelší bodová série" value={tipper.longestPointStreak} />
          <TipperStatCard title="Jednobodové zásahy" value={tipper.onePointCount} />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-xl font-bold text-ice-900 dark:text-slate-100">Proti lídrovi</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <TipperStatCard title="Lídr" value={leader?.display_name ?? "Nedostatek dat"} href={leader ? `/tiperi/${leader.user_id}` : undefined} />
          <TipperStatCard title="Rozdíl bodů" value={tipper.pointsBehindLeader ? `-${tipper.pointsBehindLeader}` : "0"} />
          <TipperStatCard title="Rozdíl přesných tref" value={tipper.exactBehindLeader ? `-${tipper.exactBehindLeader}` : "0"} />
          <TipperStatCard title="Lepší zápasy" value={tipper.leaderHeadToHead.betterMatches} description="Zápasy, kde měl tipér víc bodů než lídr." />
          <TipperStatCard title="Horší zápasy" value={tipper.leaderHeadToHead.worseMatches} description="Zápasy, kde lídr získal víc." />
          <TipperStatCard title="Remízy s lídrem" value={tipper.leaderHeadToHead.tiedMatches} />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold text-ice-900 dark:text-slate-100">Styl tipování</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <TipperStatCard title="Průměr tipovaných gólů" value={formatDecimal(tipper.averagePredictedGoals)} />
          <TipperStatCard title="Tipy o jeden gól" value={tipper.oneGoalMarginTips} description="Drama queen index." />
          <TipperStatCard title="Proti většině" value={tipper.againstMajorityCount} description="Tipy s jiným vítězem než většina." />
        </div>
      </section>
    </PageShell>
  );
}
