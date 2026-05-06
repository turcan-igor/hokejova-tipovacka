import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isLocked, isScorePredictionValid } from "@/lib/scoring";

const schema = z.object({
  matchId: z.string().uuid(),
  homeScore: z.number().int().min(0).max(30),
  awayScore: z.number().int().min(0).max(30)
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success || !isScorePredictionValid(parsed.data.homeScore, parsed.data.awayScore)) {
    return NextResponse.json({ error: "Tip musí být platné vítězné skóre bez remízy." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: match } = await supabase
    .from("matches")
    .select("id, starts_at, home_team_code, away_team_code")
    .eq("id", parsed.data.matchId)
    .single();

  if (!match || !match.home_team_code || !match.away_team_code) {
    return NextResponse.json({ error: "Na tento zápas zatím nejde tipovat." }, { status: 400 });
  }

  if (isLocked(match.starts_at)) {
    return NextResponse.json({ error: "Zápas už je uzamčený." }, { status: 409 });
  }

  const { error } = await supabase.from("match_predictions").upsert(
    {
      user_id: auth.user.id,
      match_id: parsed.data.matchId,
      home_score: parsed.data.homeScore,
      away_score: parsed.data.awayScore,
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id,match_id" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
