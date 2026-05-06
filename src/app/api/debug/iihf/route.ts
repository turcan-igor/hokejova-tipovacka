import { NextResponse } from "next/server";
import { fetchIihfMatches } from "@/lib/sync";

export async function GET() {
  try {
    const matches = await fetchIihfMatches();
    return NextResponse.json({
      ok: true,
      count: matches.length,
      source: matches[0]?.iihfGameId?.startsWith("static-") ? "static-fallback" : "iihf",
      firstMatches: matches.slice(0, 5)
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        detail: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
