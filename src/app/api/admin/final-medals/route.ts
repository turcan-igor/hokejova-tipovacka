import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { recomputeScores } from "@/lib/sync";

const schema = z.object({
  gold: z.string().length(3),
  silver: z.string().length(3),
  bronze: z.string().length(3)
});

export async function POST(request: Request) {
  const supabaseUser = await createClient();
  const { data: auth } = await supabaseUser.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabaseUser.from("profiles").select("role").eq("id", auth.user.id).single();
  if (profile?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success || new Set(Object.values(parsed.data)).size !== 3) {
    return NextResponse.json({ error: "Neplatné medaile." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: previous } = await supabase.from("final_medals").select("*").eq("id", 1).maybeSingle();

  await supabase.from("final_medals").upsert({
    id: 1,
    gold_team_code: parsed.data.gold,
    silver_team_code: parsed.data.silver,
    bronze_team_code: parsed.data.bronze,
    updated_at: new Date().toISOString()
  });

  await supabase.from("admin_audit_log").insert({
    actor_id: auth.user.id,
    action: "override_final_medals",
    entity_type: "final_medals",
    entity_id: "1",
    previous_value: previous,
    new_value: parsed.data
  });

  await recomputeScores(supabase);
  return NextResponse.json({ ok: true });
}
