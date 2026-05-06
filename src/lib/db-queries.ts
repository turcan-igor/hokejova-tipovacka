import type { SupabaseClient } from "@supabase/supabase-js";
import { assignSharedRanks } from "@/lib/scoring";
import type { MedalPredictionRow, MatchPredictionRow, ProfileRow } from "@/lib/db-types";

export async function getLeaderboard(supabase: SupabaseClient) {
  const { data: profilesData } = await supabase.from("profiles").select("id, display_name").order("display_name");
  const { data: matchPredictionsData } = await supabase.from("match_predictions").select("user_id, points, is_exact");
  const { data: medalPredictionsData } = await supabase.from("medal_predictions").select("user_id, points");

  const profiles = (profilesData ?? []) as ProfileRow[];
  const matchPredictions = (matchPredictionsData ?? []) as MatchPredictionRow[];
  const medalPredictions = (medalPredictionsData ?? []) as MedalPredictionRow[];

  const rows = profiles.map((profile) => {
    const userMatchPredictions = matchPredictions.filter((prediction) => prediction.user_id === profile.id);
    const matchPoints = userMatchPredictions.reduce((sum, prediction) => sum + (prediction.points ?? 0), 0);
    const medalPoints = medalPredictions
      .filter((prediction) => prediction.user_id === profile.id)
      .reduce((sum, prediction) => sum + (prediction.points ?? 0), 0);

    return {
      user_id: profile.id,
      display_name: profile.display_name,
      match_points: matchPoints,
      medal_points: medalPoints,
      total_points: matchPoints + medalPoints,
      exact_scores: userMatchPredictions.filter((prediction) => prediction.is_exact).length
    };
  });

  return assignSharedRanks(rows.sort((a, b) => b.total_points - a.total_points || a.display_name.localeCompare(b.display_name, "cs")));
}
