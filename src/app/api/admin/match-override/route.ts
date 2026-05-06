import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { recomputeScores } from "@/lib/sync";

const schema = z.object({
  matchId: z.string().uuid(),
  homeTeamCode: z.string().length(3).nullable(),
  awayTeamCode: z.string().length(3).nullable(),
  homeScore: z.number().int().min(0).max(30).nullable(),
  awayScore: z.number().int().min(0).max(30).nullable(),
  status: z.enum(["scheduled", "live", "final", "postponed", "cancelled"])
});

export async function POST(request: Request) {
  const userClient = await createClient();
  const { data: auth } = await userClient.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await userClient.from("profiles").select("role").eq("id", auth.user.id).single();
  if (profile?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Neplatná data." }, { status: 400 });

  const { homeTeamCode, awayTeamCode, homeScore, awayScore, status } = parsed.data;
  if (homeTeamCode && awayTeamCode && homeTeamCode === awayTeamCode) {
    return NextResponse.json({ error: "Týmy musí být různé." }, { status: 400 });
  }
  if (status === "final" && (homeScore === null || awayScore === null || homeScore === awayScore)) {
    return NextResponse.json({ error: "Finální zápas musí mít vítězné skóre bez remízy." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: previous } = await supabase
    .from("matches")
    .select("*")
    .eq("id", parsed.data.matchId)
    .single();

  const nextValue = {
    home_team_code: homeTeamCode,
    away_team_code: awayTeamCode,
    home_score: homeScore,
    away_score: awayScore,
    status,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from("matches").update(nextValue).eq("id", parsed.data.matchId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.from("admin_audit_log").insert({
    actor_id: auth.user.id,
    action: "override_match",
    entity_type: "matches",
    entity_id: parsed.data.matchId,
    previous_value: previous,
    new_value: nextValue
  });

  await recomputeScores(supabase);
  return NextResponse.json({ ok: true });
}
