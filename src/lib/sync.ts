import type { SupabaseClient } from "@supabase/supabase-js";
import { IIHF_SCHEDULE_URL } from "@/lib/constants";
import type { FinalMedalsRow, MatchPredictionRow, MatchRow, MedalPredictionRow } from "@/lib/db-types";
import { parseIihfScheduleHtml, type ParsedIihfMatch } from "@/lib/iihf-parser";
import { scoreMatchPrediction, scoreMedalPrediction } from "@/lib/scoring";
import { getStaticSchedule } from "@/lib/static-schedule";

export async function fetchIihfMatches(fetcher: typeof fetch = fetch) {
  const response = await fetcher(IIHF_SCHEDULE_URL, {
    headers: {
      "user-agent": "iihf-2026-tipovacka/0.1"
    },
    cache: "no-store"
  });

  if (response.status === 403) {
    return getStaticSchedule();
  }

  if (!response.ok) {
    throw new Error(`IIHF sync failed with HTTP ${response.status}`);
  }

  const parsed = parseIihfScheduleHtml(await response.text());
  return parsed.length > 0 ? parsed : getStaticSchedule();
}

export async function upsertParsedMatches(supabase: SupabaseClient, matches: ParsedIihfMatch[]) {
  const rows = matches.map((match) => ({
    iihf_game_id: match.iihfGameId ?? stableFallbackGameId(match),
    phase: match.phase,
    starts_at: match.startsAt,
    venue: match.venue,
    group_name: match.groupName,
    home_team_code: match.homeTeamCode,
    away_team_code: match.awayTeamCode,
    home_score: match.homeScore,
    away_score: match.awayScore,
    status: match.status
  }));

  const { error } = await supabase
    .from("matches")
    .upsert(rows, { onConflict: "iihf_game_id", ignoreDuplicates: false });

  if (error) throw error;
}

function stableFallbackGameId(match: ParsedIihfMatch) {
  return [
    "fallback",
    match.startsAt,
    match.homeTeamCode ?? match.phase,
    match.awayTeamCode ?? match.venue ?? "unknown"
  ].join(":");
}

export async function recomputeScores(supabase: SupabaseClient) {
  const { data: matchesData, error: matchError } = await supabase.from("matches").select("*");
  if (matchError) throw matchError;

  const { data: predictionsData, error: predictionError } = await supabase.from("match_predictions").select("*");
  if (predictionError) throw predictionError;

  const matches = (matchesData ?? []) as MatchRow[];
  const predictions = (predictionsData ?? []) as MatchPredictionRow[];

  for (const prediction of predictions) {
    const match = matches.find((item) => item.id === prediction.match_id);
    if (!match) continue;
    const points = scoreMatchPrediction(prediction, match);
    const isExact = points === 3;
    await supabase
      .from("match_predictions")
      .update({ points, is_exact: isExact, scored_at: points === null ? null : new Date().toISOString() })
      .eq("id", prediction.id);
  }

  const { data: finalMedalsData } = await supabase.from("final_medals").select("*").eq("id", 1).maybeSingle();
  const { data: medalPredictionsData } = await supabase.from("medal_predictions").select("*");
  const finalMedals = finalMedalsData as FinalMedalsRow | null;
  const medalPredictions = (medalPredictionsData ?? []) as MedalPredictionRow[];

  for (const prediction of medalPredictions) {
    const points = scoreMedalPrediction(prediction, finalMedals);
    await supabase
      .from("medal_predictions")
      .update({ points, scored_at: points === null ? null : new Date().toISOString() })
      .eq("id", prediction.id);
  }
}
