import type { SupabaseClient } from "@supabase/supabase-js";
import { assignSharedRanks, isLocked } from "@/lib/scoring";
import { TOURNAMENT_TIME_ZONE } from "@/lib/time-zone";
import type { MatchPredictionRow, MatchRow, MedalPredictionRow, ProfileRow } from "@/lib/db-types";

type RankedTipper = {
  user_id: string;
  display_name: string;
  match_points: number;
  medal_points: number;
  total_points: number;
  exact_scores: number;
  rank: number;
};

export type TipperStatsProfile = RankedTipper & {
  finalPredictedMatches: number;
  finalMissedMatches: number;
  lockedKnownMatches: number;
  filledLockedKnownMatches: number;
  correctWinnerCount: number;
  onePointCount: number;
  winnerAccuracy: number | null;
  exactAccuracy: number | null;
  pointEfficiency: number | null;
  averagePointsPerFinalPrediction: number | null;
  disciplineRate: number | null;
  pointsLast5: number;
  pointsLast10: number;
  bestDay: { label: string; points: number } | null;
  currentPointStreak: number;
  longestPointStreak: number;
  averagePredictedGoals: number | null;
  oneGoalMarginTips: number;
  againstMajorityCount: number;
  pointsBehindLeader: number;
  pointsBehindTop3: number;
  exactBehindLeader: number;
  leaderHeadToHead: {
    leaderUserId: string | null;
    leaderName: string | null;
    betterMatches: number;
    worseMatches: number;
    tiedMatches: number;
  };
};

export type TipperAward = {
  key: string;
  group: "Výkon" | "Forma" | "Styl tipování" | "Zábavné ceny";
  title: string;
  winnerName: string | null;
  winnerUserId: string | null;
  value: string;
  description: string;
};

export type TipperStatsDataset = {
  profiles: TipperStatsProfile[];
  awards: TipperAward[];
  finalMatchCount: number;
  lockedKnownMatchCount: number;
};

export async function getTipperStats(supabase: SupabaseClient) {
  const { data: profilesData } = await supabase.from("profiles").select("id, display_name").order("display_name");
  const { data: matchesData } = await supabase.from("matches").select("*").order("starts_at", { ascending: true });
  const { data: matchPredictionsData } = await supabase.from("match_predictions").select("*");
  const { data: medalPredictionsData } = await supabase.from("medal_predictions").select("*");

  return calculateTipperStats({
    profiles: (profilesData ?? []) as ProfileRow[],
    matches: (matchesData ?? []) as MatchRow[],
    matchPredictions: (matchPredictionsData ?? []) as MatchPredictionRow[],
    medalPredictions: (medalPredictionsData ?? []) as MedalPredictionRow[]
  });
}

export function calculateTipperStats({
  profiles,
  matches,
  matchPredictions,
  medalPredictions,
  now = new Date()
}: {
  profiles: ProfileRow[];
  matches: MatchRow[];
  matchPredictions: MatchPredictionRow[];
  medalPredictions: MedalPredictionRow[];
  now?: Date;
}): TipperStatsDataset {
  const finalMatches = matches
    .filter((match) => match.status === "final" && match.home_score !== null && match.away_score !== null)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  const lockedKnownMatches = matches.filter(
    (match) => isLocked(match.starts_at, now) && Boolean(match.home_team_code && match.away_team_code)
  );
  const majorityByMatch = getMajorityWinnerByMatch(matchPredictions);

  const ranked = assignSharedRanks(
    profiles
      .map((profile) => {
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
      })
      .sort((a, b) => b.total_points - a.total_points || a.display_name.localeCompare(b.display_name, "cs"))
  );
  const leader = ranked[0] ?? null;
  const top3Cutoff = ranked.find((row) => row.rank === 3)?.total_points ?? ranked[ranked.length - 1]?.total_points ?? 0;

  const detailed = ranked.map((row) => {
    const userPredictions = matchPredictions.filter((prediction) => prediction.user_id === row.user_id);
    const predictionsByMatch = new Map(userPredictions.map((prediction) => [prediction.match_id, prediction]));
    const finalPredictions = finalMatches
      .map((match) => {
        const prediction = predictionsByMatch.get(match.id);
        return prediction ? { match, prediction } : null;
      })
      .filter((item): item is { match: MatchRow; prediction: MatchPredictionRow } => item !== null);
    const correctWinnerCount = finalPredictions.filter(({ match, prediction }) =>
      winner(prediction.home_score, prediction.away_score) === winner(match.home_score ?? 0, match.away_score ?? 0)
    ).length;
    const dayScores = getDayScores(finalPredictions);
    const streaks = getPointStreaks(finalMatches, predictionsByMatch);
    const filledLockedKnownMatches = lockedKnownMatches.filter((match) => predictionsByMatch.has(match.id)).length;
    const againstMajorityCount = userPredictions.filter((prediction) => {
      const majority = majorityByMatch.get(prediction.match_id);
      return majority !== null && majority !== undefined && winner(prediction.home_score, prediction.away_score) !== majority;
    }).length;
    const leaderComparison = getLeaderHeadToHead(row.user_id, leader?.user_id ?? null, finalMatches, matchPredictions);

    return {
      ...row,
      finalPredictedMatches: finalPredictions.length,
      finalMissedMatches: Math.max(0, finalMatches.length - finalPredictions.length),
      lockedKnownMatches: lockedKnownMatches.length,
      filledLockedKnownMatches,
      correctWinnerCount,
      onePointCount: userPredictions.filter((prediction) => prediction.points === 1).length,
      winnerAccuracy: ratio(correctWinnerCount, finalPredictions.length),
      exactAccuracy: ratio(row.exact_scores, finalPredictions.length),
      pointEfficiency: ratio(row.match_points, finalMatches.length * 3),
      averagePointsPerFinalPrediction: finalPredictions.length ? row.match_points / finalPredictions.length : null,
      disciplineRate: ratio(filledLockedKnownMatches, lockedKnownMatches.length),
      pointsLast5: pointsInLastMatches(finalMatches, predictionsByMatch, 5),
      pointsLast10: pointsInLastMatches(finalMatches, predictionsByMatch, 10),
      bestDay: dayScores[0] ?? null,
      currentPointStreak: streaks.current,
      longestPointStreak: streaks.longest,
      averagePredictedGoals: userPredictions.length
        ? userPredictions.reduce((sum, prediction) => sum + prediction.home_score + prediction.away_score, 0) / userPredictions.length
        : null,
      oneGoalMarginTips: userPredictions.filter((prediction) => Math.abs(prediction.home_score - prediction.away_score) === 1).length,
      againstMajorityCount,
      pointsBehindLeader: leader ? Math.max(0, leader.total_points - row.total_points) : 0,
      pointsBehindTop3: row.rank <= 3 ? 0 : Math.max(0, top3Cutoff - row.total_points),
      exactBehindLeader: leader ? Math.max(0, leader.exact_scores - row.exact_scores) : 0,
      leaderHeadToHead: leaderComparison
    };
  });

  return {
    profiles: detailed,
    awards: buildAwards(detailed),
    finalMatchCount: finalMatches.length,
    lockedKnownMatchCount: lockedKnownMatches.length
  };
}

function buildAwards(profiles: TipperStatsProfile[]): TipperAward[] {
  return [
    award("exact-king", "Výkon", "Král přesného skóre", profiles, (row) => row.exact_scores, "Nejvíc trefených přesných výsledků."),
    award("winner-oracle", "Výkon", "Věštec vítězů", profiles, (row) => row.winnerAccuracy, "Nejvyšší úspěšnost správného vítěze."),
    award("one-point", "Výkon", "Sběrač jedniček", profiles, (row) => row.onePointCount, "Nejvíc tipů za správného vítěze bez přesného skóre."),
    award("discipline", "Výkon", "Poctivec turnaje", profiles, (row) => row.disciplineRate, "Nejvyšší podíl vyplněných uzamčených zápasů."),
    award("form5", "Forma", "Nejlepší forma za 5 zápasů", profiles, (row) => row.pointsLast5, "Nejvíc bodů v posledních pěti finálních zápasech."),
    award("best-day", "Forma", "Nejlepší den", profiles, (row) => row.bestDay?.points ?? null, "Nejvíc bodů získaných v jednom hracím dni."),
    award("behind", "Forma", "Největší ztráta na lídra", profiles, (row) => row.pointsBehindLeader, "Největší bodová mezera vůči prvnímu místu."),
    award("average", "Výkon", "Nejvyšší průměr bodů", profiles, (row) => row.averagePointsPerFinalPrediction, "Nejlepší průměr bodů na finální natipovaný zápas."),
    award("drama", "Styl tipování", "Drama queen", profiles, (row) => row.oneGoalMarginTips, "Nejvíc tipů o jeden gól."),
    award("shootout", "Styl tipování", "Milovník přestřelek", profiles, (row) => row.averagePredictedGoals, "Nejvyšší průměr tipovaných gólů."),
    award("concrete", "Styl tipování", "Betonář", profiles, (row) => row.averagePredictedGoals, "Nejnižší průměr tipovaných gólů.", "asc"),
    award("contrarian", "Zábavné ceny", "Proti proudu", profiles, (row) => row.againstMajorityCount, "Nejvíc tipů proti většině ostatních.")
  ];
}

function award(
  key: string,
  group: TipperAward["group"],
  title: string,
  profiles: TipperStatsProfile[],
  valueGetter: (profile: TipperStatsProfile) => number | null,
  description: string,
  direction: "asc" | "desc" = "desc"
): TipperAward {
  const candidates = profiles
    .map((profile) => ({ profile, value: valueGetter(profile) }))
    .filter((item): item is { profile: TipperStatsProfile; value: number } => item.value !== null && Number.isFinite(item.value));
  const sorted = candidates.sort((a, b) => {
    const valueDiff = direction === "asc" ? a.value - b.value : b.value - a.value;
    return valueDiff || a.profile.display_name.localeCompare(b.profile.display_name, "cs");
  });
  const winnerItem = sorted[0];

  return {
    key,
    group,
    title,
    winnerName: winnerItem?.profile.display_name ?? null,
    winnerUserId: winnerItem?.profile.user_id ?? null,
    value: winnerItem ? formatMetricValue(winnerItem.value, key) : "Nedostatek dat",
    description
  };
}

function getDayScores(items: { match: MatchRow; prediction: MatchPredictionRow }[]) {
  const days = new Map<string, { label: string; points: number }>();
  for (const item of items) {
    const date = new Date(item.match.starts_at);
    const key = new Intl.DateTimeFormat("en-CA", { timeZone: TOURNAMENT_TIME_ZONE }).format(date);
    const label = new Intl.DateTimeFormat("cs-CZ", {
      timeZone: TOURNAMENT_TIME_ZONE,
      day: "numeric",
      month: "numeric"
    }).format(date);
    const current = days.get(key) ?? { label, points: 0 };
    current.points += item.prediction.points ?? 0;
    days.set(key, current);
  }
  return Array.from(days.values()).sort((a, b) => b.points - a.points || a.label.localeCompare(b.label, "cs"));
}

function getPointStreaks(finalMatches: MatchRow[], predictionsByMatch: Map<string, MatchPredictionRow>) {
  let current = 0;
  let longest = 0;
  for (const match of finalMatches) {
    const points = predictionsByMatch.get(match.id)?.points ?? 0;
    if (points > 0) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }
  return { current, longest };
}

function getLeaderHeadToHead(
  userId: string,
  leaderUserId: string | null,
  finalMatches: MatchRow[],
  predictions: MatchPredictionRow[]
) {
  if (!leaderUserId || userId === leaderUserId) {
    return { leaderUserId, leaderName: null, betterMatches: 0, worseMatches: 0, tiedMatches: 0 };
  }

  let betterMatches = 0;
  let worseMatches = 0;
  let tiedMatches = 0;
  for (const match of finalMatches) {
    const userPoints = predictions.find((prediction) => prediction.user_id === userId && prediction.match_id === match.id)?.points ?? 0;
    const leaderPoints = predictions.find((prediction) => prediction.user_id === leaderUserId && prediction.match_id === match.id)?.points ?? 0;
    if (userPoints > leaderPoints) betterMatches += 1;
    else if (userPoints < leaderPoints) worseMatches += 1;
    else tiedMatches += 1;
  }

  return { leaderUserId, leaderName: null, betterMatches, worseMatches, tiedMatches };
}

function pointsInLastMatches(finalMatches: MatchRow[], predictionsByMatch: Map<string, MatchPredictionRow>, count: number) {
  return finalMatches
    .slice(-count)
    .reduce((sum, match) => sum + (predictionsByMatch.get(match.id)?.points ?? 0), 0);
}

function getMajorityWinnerByMatch(predictions: MatchPredictionRow[]) {
  const result = new Map<string, "home" | "away" | null>();
  const grouped = new Map<string, MatchPredictionRow[]>();
  for (const prediction of predictions) {
    grouped.set(prediction.match_id, [...(grouped.get(prediction.match_id) ?? []), prediction]);
  }
  for (const [matchId, rows] of grouped) {
    const home = rows.filter((prediction) => winner(prediction.home_score, prediction.away_score) === "home").length;
    const away = rows.filter((prediction) => winner(prediction.home_score, prediction.away_score) === "away").length;
    result.set(matchId, home === away ? null : home > away ? "home" : "away");
  }
  return result;
}

function winner(homeScore: number, awayScore: number) {
  if (homeScore === awayScore) return null;
  return homeScore > awayScore ? "home" : "away";
}

function ratio(value: number, total: number) {
  if (total <= 0) return null;
  return value / total;
}

export function formatPercent(value: number | null) {
  if (value === null) return "Nedostatek dat";
  return `${Math.round(value * 100)} %`;
}

export function formatDecimal(value: number | null, digits = 2) {
  if (value === null) return "Nedostatek dat";
  return value.toFixed(digits).replace(".", ",");
}

function formatMetricValue(value: number, key: string) {
  if (["winner-oracle", "discipline"].includes(key)) return formatPercent(value);
  if (["average", "shootout", "concrete"].includes(key)) return formatDecimal(value);
  return String(Math.round(value));
}
