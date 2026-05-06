import { AdminSyncButton, FinalMedalsAdmin, MatchOverrideAdmin } from "@/components/admin-forms";
import { PageShell } from "@/components/page-shell";
import { requireAdmin } from "@/lib/auth";
import type { AuditLogRow, FinalMedalsRow, InviteCodeRow, MatchRow, SyncRunRow } from "@/lib/db-types";

export default async function AdminPage() {
  const { supabase, profile } = await requireAdmin();
  const { data: syncRuns } = await supabase
    .from("sync_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(10);
  const { data: finalMedals } = await supabase.from("final_medals").select("*").eq("id", 1).maybeSingle();
  const { data: matches } = await supabase.from("matches").select("*").order("starts_at", { ascending: true });
  const { data: auditLog } = await supabase
    .from("admin_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);
  const { data: inviteCodes } = await supabase.from("invite_codes").select("*").order("created_at", { ascending: false });

  return (
    <PageShell isAdmin={profile.role === "ADMIN"}>
      <h1 className="mb-6 text-3xl font-bold text-ice-900">Admin</h1>
      <div className="grid gap-6">
        <section className="rounded-lg border border-ice-100 bg-white p-5 shadow-soft">
          <h2 className="mb-4 text-xl font-bold text-ice-900">Synchronizace IIHF</h2>
          <AdminSyncButton />
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-[720px] w-full text-left text-sm">
              <thead className="bg-ice-100">
                <tr>
                  <th className="px-3 py-2">Start</th>
                  <th className="px-3 py-2">Stav</th>
                  <th className="px-3 py-2">Zápasy</th>
                  <th className="px-3 py-2">Chyba</th>
                </tr>
              </thead>
              <tbody>
                {((syncRuns ?? []) as SyncRunRow[]).map((run) => (
                  <tr key={run.id} className="border-t border-ice-100">
                    <td className="px-3 py-2">{new Intl.DateTimeFormat("cs-CZ", { dateStyle: "short", timeStyle: "short" }).format(new Date(run.started_at))}</td>
                    <td className="px-3 py-2">{run.status}</td>
                    <td className="px-3 py-2">{run.matches_seen ?? "-"}</td>
                    <td className="px-3 py-2">{run.error_message ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg border border-ice-100 bg-white p-5 shadow-soft">
          <h2 className="mb-4 text-xl font-bold text-ice-900">Finální medaile</h2>
          <FinalMedalsAdmin defaults={finalMedals as FinalMedalsRow | null} />
        </section>

        <section className="rounded-lg border border-ice-100 bg-white p-5 shadow-soft">
          <h2 className="mb-4 text-xl font-bold text-ice-900">Override zápasu</h2>
          <MatchOverrideAdmin matches={(matches ?? []) as MatchRow[]} />
        </section>

        <section className="rounded-lg border border-ice-100 bg-white p-5 shadow-soft">
          <h2 className="mb-4 text-xl font-bold text-ice-900">Pozvací kódy</h2>
          <div className="grid gap-2 md:grid-cols-2">
            {((inviteCodes ?? []) as InviteCodeRow[]).map((code) => (
              <div key={code.id} className="rounded-md border border-ice-100 p-3">
                <p className="font-semibold">{code.code}</p>
                <p className="text-sm text-slate-600">
                  Použito {code.used_count}
                  {code.max_uses === null ? "" : ` / ${code.max_uses}`} | {code.is_active ? "aktivní" : "neaktivní"}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-ice-100 bg-white p-5 shadow-soft">
          <h2 className="mb-4 text-xl font-bold text-ice-900">Audit log</h2>
          <div className="space-y-2">
            {((auditLog ?? []) as AuditLogRow[]).map((entry) => (
              <div key={entry.id} className="rounded-md bg-ice-100 px-3 py-2 text-sm">
                <strong>{entry.action}</strong> {entry.entity_type} {entry.entity_id ?? ""} | {new Intl.DateTimeFormat("cs-CZ", { dateStyle: "short", timeStyle: "short" }).format(new Date(entry.created_at))}
              </div>
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
