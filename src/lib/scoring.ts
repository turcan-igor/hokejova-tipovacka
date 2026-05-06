import type { FinalMedals, Match, MatchPrediction, MedalPrediction } from "@/lib/types";

export function scoreMatchPrediction(
  prediction: Pick<MatchPrediction, "home_score" | "away_score">,
  match: Pick<Match, "home_score" | "away_score" | "status">
) {
  if (match.status !== "final" || match.home_score === null || match.away_score === null) {
    return null;
  }

  if (
    prediction.home_score === match.home_score &&
    prediction.away_score === match.away_score
  ) {
    return 3;
  }

  const predictedWinner = winner(prediction.home_score, prediction.away_score);
  const actualWinner = winner(match.home_score, match.away_score);

  return predictedWinner !== null && predictedWinner === actualWinner ? 1 : 0;
}

export function scoreMedalPrediction(
  prediction: Pick<MedalPrediction, "gold_team_code" | "silver_team_code" | "bronze_team_code">,
  finalMedals: FinalMedals | null
) {
  if (!finalMedals?.gold_team_code || !finalMedals.silver_team_code || !finalMedals.bronze_team_code) {
    return null;
  }

  let points = 0;
  if (prediction.gold_team_code === finalMedals.gold_team_code) points += 5;
  if (prediction.silver_team_code === finalMedals.silver_team_code) points += 5;
  if (prediction.bronze_team_code === finalMedals.bronze_team_code) points += 5;
  return points;
}

export function isScorePredictionValid(homeScore: number, awayScore: number) {
  return (
    Number.isInteger(homeScore) &&
    Number.isInteger(awayScore) &&
    homeScore >= 0 &&
    awayScore >= 0 &&
    homeScore !== awayScore
  );
}

export function assignSharedRanks<T extends { total_points: number }>(rows: T[]) {
  let currentRank = 0;
  let previousPoints: number | null = null;

  return rows.map((row, index) => {
    if (previousPoints === null || row.total_points !== previousPoints) {
      currentRank = index + 1;
      previousPoints = row.total_points;
    }
    return { ...row, rank: currentRank };
  });
}

export function isLocked(startsAt: string, now = new Date()) {
  return new Date(startsAt).getTime() <= now.getTime();
}

function winner(homeScore: number, awayScore: number) {
  if (homeScore === awayScore) return null;
  return homeScore > awayScore ? "home" : "away";
}
