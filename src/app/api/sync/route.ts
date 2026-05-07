import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createUserClient } from "@/lib/supabase/server";
import {
  fetchIihfMatches,
  recomputeScores,
  syncGroupStandingsFromDb,
  syncPlayerStats,
  upsertParsedMatches
} from "@/lib/sync";

export async function POST(request: Request) {
  const expectedSecret = process.env.SYNC_SECRET;
  const actualSecret = request.headers.get("authorization")?.replace("Bearer ", "");
  const hasValidSecret = Boolean(expectedSecret && actualSecret === expectedSecret);

  if (!hasValidSecret) {
    const userClient = await createUserClient();
    const { data: auth } = await userClient.auth.getUser();
    if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: profile } = await userClient.from("profiles").select("role").eq("id", auth.user.id).single();
    if (profile?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createAdminClient();
  const startedAt = new Date().toISOString();

  try {
    const matches = await fetchIihfMatches();
    await upsertParsedMatches(supabase, matches);
    await recomputeScores(supabase);
    const playerStatsSeen = await syncPlayerStats(supabase);
    const groupStandings = await syncGroupStandingsFromDb(supabase);

    await supabase.from("sync_runs").insert({
      source: "iihf",
      status: "success",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      matches_seen: matches.length
    });

    return NextResponse.json({
      ok: true,
      matchesSeen: matches.length,
      playerStatsSeen,
      groupStandingsSeen: groupStandings.count,
      groupStandingsSource: groupStandings.source
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await supabase.from("sync_runs").insert({
      source: "iihf",
      status: "error",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      error_message: errorMessage
    });

    return NextResponse.json({ error: "Sync failed", detail: errorMessage }, { status: 500 });
  }
}
