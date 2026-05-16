import { MedalForm } from "@/components/medal-form";
import { PageShell } from "@/components/page-shell";
import { TOURNAMENT_START } from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import { isLocked } from "@/lib/scoring";

export default async function MedalsPage() {
  const { supabase, user, profile } = await requireUser();
  const { data: medalPrediction } = await supabase
    .from("medal_predictions")
    .select("id,user_id,gold_team_code,silver_team_code,bronze_team_code,points")
    .eq("user_id", user.id)
    .maybeSingle();

  const locked = isLocked(TOURNAMENT_START);

  return (
    <PageShell isAdmin={profile.role === "ADMIN"}>
      <section className="rounded-lg border border-ice-100 bg-white p-6 shadow-soft dark:border-slate-700 dark:bg-slate-900">
        <h1 className="text-3xl font-bold text-ice-900 dark:text-slate-100">Medailové tipy</h1>
        <p className="mt-3 max-w-2xl text-slate-700 dark:text-slate-300">
          Za správné zlato, stříbro a bronz je 5 bodů. Každý tým lze vybrat jen jednou.
        </p>
        <div className="mt-6">
          <MedalForm defaults={medalPrediction} disabled={locked} />
        </div>
      </section>
    </PageShell>
  );
}
