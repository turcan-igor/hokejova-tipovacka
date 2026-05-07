import { TOURNAMENT_START } from "@/lib/constants";
import type { MatchPredictionRow, MatchRow, MedalPredictionRow, ProfileRow } from "@/lib/db-types";
import { isLocked } from "@/lib/scoring";

export type MissingTipsOverviewRow = {
  userId: string;
  displayName: string;
  missingMatchCount: number;
  missingMedalTip: boolean;
  nextMissingMatches: Array<{
    id: string;
    startsAt: string;
    homeTeamCode: string;
    awayTeamCode: string;
  }>;
};

export function getMissingTipsOverview({
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
}): MissingTipsOverviewRow[] {
  const openKnownMatches = matches
    .filter((match) => {
      return (
        Boolean(match.home_team_code) &&
        Boolean(match.away_team_code) &&
        !isLocked(match.starts_at, now)
      );
    })
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  const medalTipsLocked = isLocked(TOURNAMENT_START, now);

  return profiles
    .map((profile) => {
      const predictedMatchIds = new Set(
        matchPredictions
          .filter((prediction) => prediction.user_id === profile.id)
          .map((prediction) => prediction.match_id)
      );
      const missingMatches = openKnownMatches.filter((match) => !predictedMatchIds.has(match.id));
      const hasMedalPrediction = medalPredictions.some((prediction) => prediction.user_id === profile.id);

      return {
        userId: profile.id,
        displayName: profile.display_name,
        missingMatchCount: missingMatches.length,
        missingMedalTip: !medalTipsLocked && !hasMedalPrediction,
        nextMissingMatches: missingMatches.slice(0, 4).map((match) => ({
          id: match.id,
          startsAt: match.starts_at,
          homeTeamCode: match.home_team_code!,
          awayTeamCode: match.away_team_code!
        }))
      };
    })
    .sort((a, b) => {
      const aTotal = a.missingMatchCount + (a.missingMedalTip ? 1 : 0);
      const bTotal = b.missingMatchCount + (b.missingMedalTip ? 1 : 0);
      return bTotal - aTotal || a.displayName.localeCompare(b.displayName, "cs");
    });
}
