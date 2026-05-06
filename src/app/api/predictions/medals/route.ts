import { NextResponse } from "next/server";
import { z } from "zod";
import { TOURNAMENT_START } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { isLocked } from "@/lib/scoring";

const schema = z.object({
  goldTeamCode: z.string().length(3),
  silverTeamCode: z.string().length(3),
  bronzeTeamCode: z.string().length(3)
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Vyberte všechny medaile." }, { status: 400 });
  }

  const values = Object.values(parsed.data);
  if (new Set(values).size !== values.length) {
    return NextResponse.json({ error: "Každý tým může být vybraný jen jednou." }, { status: 400 });
  }

  if (isLocked(TOURNAMENT_START)) {
    return NextResponse.json({ error: "Medailové tipy jsou uzamčené." }, { status: 409 });
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase.from("medal_predictions").upsert(
    {
      user_id: auth.user.id,
      gold_team_code: parsed.data.goldTeamCode,
      silver_team_code: parsed.data.silverTeamCode,
      bronze_team_code: parsed.data.bronzeTeamCode,
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
