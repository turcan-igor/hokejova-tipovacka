import { AdminSyncButton, FinalMedalsAdmin, MatchOverrideAdmin } from "@/components/admin-forms";
import { PageShell } from "@/components/page-shell";
import { requireAdmin } from "@/lib/auth";
import type {
  AuditLogRow,
  FinalMedalsRow,
  InviteCodeRow,
  MatchPredictionRow,
  MatchRow,
  MedalPredictionRow,
  ProfileRow,
  SyncRunRow
} from "@/lib/db-types";
import { getMissingTipsOverview } from "@/lib/missing-tips";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatTournamentDateTime } from "@/lib/time-zone";

export default async function AdminPage() {
  const { profile } = await requireAdmin();
  const supabase = createAdminClient();
  const { data: syncRuns } = await supabase
    .from("sync_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(10);
  const { data: finalMedals } = await supabase.from("final_medals").select("*").eq("id", 1).maybeSingle();
  const { data: matches } = await supabase.from("matches").select("*").order("starts_at", { ascending: true });
  const { data: profiles } = await supabase.from("profiles").select("id, display_name").order("display_name");
  const { data: matchPredictions } = await supabase.from("match_predictions").select("*");
  const { data: medalPredictions } = await supabase.from("medal_predictions").select("*");
  const { data: auditLog } = await supabase
    .from("admin_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);
  const { data: inviteCodes } = await supabase.from("invite_codes").select("*").order("created_at", { ascending: false });

  const matchRows = (matches ?? []) as MatchRow[];
  const missingTips = getMissingTipsOverview({
    profiles: (profiles ?? []) as ProfileRow[],
    matches: matchRows,
    matchPredictions: (matchPredictions ?? []) as MatchPredictionRow[],
    medalPredictions: (medalPredictions ?? []) as MedalPredictionRow[]
  });

  return (
    <PageShell isAdmin={profile.role === "ADMIN"}>
      <h1 className="mb-6 text-3xl font-bold text-ice-900 dark:text-slate-100">Admin</h1>
      <div className="grid gap-6">
        <section className="rounded-lg border border-ice-100 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
          <h2 className="mb-4 text-xl font-bold text-ice-900 dark:text-slate-100">Chybějící tipy</h2>
          <div className="overflow-x-auto table-scroll">
            <table className="min-w-[860px] w-full text-left text-sm">
              <thead className="bg-ice-100 text-ice-900 dark:bg-slate-800 dark:text-slate-100">
                <tr>
                  <th className="px-3 py-2">Uživatel</th>
                  <th className="px-3 py-2">Chybí zápasů</th>
                  <th className="px-3 py-2">Medailový tip</th>
                  <th className="px-3 py-2">Nejbližší chybějící zápasy</th>
                </tr>
              </thead>
              <tbody>
                {missingTips.map((row) => (
                  <tr key={row.userId} className="border-t border-ice-100 dark:border-slate-700">
                    <td className="px-3 py-3 font-semibold text-ice-900 dark:text-slate-100">{row.displayName}</td>
                    <td className="px-3 py-3">
                      <span className={row.missingMatchCount > 0 ? "font-bold text-rink-red" : "font-semibold text-emerald-700 dark:text-emerald-300"}>
                        {row.missingMatchCount}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {row.missingMedalTip ? (
                        <span className="rounded-md bg-red-50 px-2 py-1 font-semibold text-rink-red dark:bg-red-950/40 dark:text-red-300">
                          Chybí
                        </span>
                      ) : (
                        <span className="rounded-md bg-emerald-50 px-2 py-1 font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          OK
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-700 dark:text-slate-300">
                      {row.nextMissingMatches.length > 0
                        ? row.nextMissingMatches
                            .map((match) => `${match.homeTeamCode}-${match.awayTeamCode} (${formatTournamentDateTime(match.startsAt, { dateStyle: "short", timeStyle: "short" })})`)
                            .join(", ")
                        : "Nic nechybí"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg border border-ice-100 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
          <h2 className="mb-4 text-xl font-bold text-ice-900 dark:text-slate-100">Synchronizace IIHF</h2>
          <AdminSyncButton />
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-[720px] w-full text-left text-sm">
              <thead className="bg-ice-100 dark:bg-slate-800 dark:text-slate-100">
                <tr>
                  <th className="px-3 py-2">Start</th>
                  <th className="px-3 py-2">Stav</th>
                  <th className="px-3 py-2">Zápasy</th>
                  <th className="px-3 py-2">Chyba</th>
                </tr>
              </thead>
              <tbody>
                {((syncRuns ?? []) as SyncRunRow[]).map((run) => (
                  <tr key={run.id} className="border-t border-ice-100 dark:border-slate-700">
                    <td className="px-3 py-2">{formatTournamentDateTime(run.started_at, { dateStyle: "short", timeStyle: "short" })}</td>
                    <td className="px-3 py-2">{run.status}</td>
                    <td className="px-3 py-2">{run.matches_seen ?? "-"}</td>
                    <td className="px-3 py-2">{run.error_message ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg border border-ice-100 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
          <h2 className="mb-4 text-xl font-bold text-ice-900 dark:text-slate-100">Finální medaile</h2>
          <FinalMedalsAdmin defaults={finalMedals as FinalMedalsRow | null} />
        </section>

        <section className="rounded-lg border border-ice-100 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
          <h2 className="mb-4 text-xl font-bold text-ice-900 dark:text-slate-100">Override zápasu</h2>
          <MatchOverrideAdmin matches={matchRows} />
        </section>

        <section className="rounded-lg border border-ice-100 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
          <h2 className="mb-4 text-xl font-bold text-ice-900 dark:text-slate-100">Pozvací kódy</h2>
          <div className="grid gap-2 md:grid-cols-2">
            {((inviteCodes ?? []) as InviteCodeRow[]).map((code) => (
              <div key={code.id} className="rounded-md border border-ice-100 p-3 dark:border-slate-700">
                <p className="font-semibold">{code.code}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Použito {code.used_count}
                  {code.max_uses === null ? "" : ` / ${code.max_uses}`} | {code.is_active ? "aktivní" : "neaktivní"}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-ice-100 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
          <h2 className="mb-4 text-xl font-bold text-ice-900 dark:text-slate-100">Audit log</h2>
          <div className="space-y-2">
            {((auditLog ?? []) as AuditLogRow[]).map((entry) => (
              <div key={entry.id} className="rounded-md bg-ice-100 px-3 py-2 text-sm dark:bg-slate-800 dark:text-slate-200">
                <strong>{entry.action}</strong> {entry.entity_type} {entry.entity_id ?? ""} | {formatTournamentDateTime(entry.created_at, { dateStyle: "short", timeStyle: "short" })}
              </div>
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
