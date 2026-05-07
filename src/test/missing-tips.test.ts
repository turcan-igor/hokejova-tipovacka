import { describe, expect, it } from "vitest";
import { getMissingTipsOverview } from "@/lib/missing-tips";
import type { MatchPredictionRow, MatchRow, MedalPredictionRow, ProfileRow } from "@/lib/db-types";

const profiles: ProfileRow[] = [
  { id: "u1", display_name: "Anna" },
  { id: "u2", display_name: "Boris" }
];

function match(id: string, startsAt: string, home = "CZE", away = "CAN"): MatchRow {
  return {
    id,
    iihf_game_id: id,
    phase: "Preliminary Round",
    starts_at: startsAt,
    venue: null,
    group_name: "A",
    home_team_code: home,
    away_team_code: away,
    home_score: null,
    away_score: null,
    status: "scheduled"
  };
}

function prediction(userId: string, matchId: string): MatchPredictionRow {
  return {
    id: `${userId}-${matchId}`,
    user_id: userId,
    match_id: matchId,
    home_score: 3,
    away_score: 2,
    points: null,
    is_exact: false
  };
}

function medalPrediction(userId: string): MedalPredictionRow {
  return {
    id: `medal-${userId}`,
    user_id: userId,
    gold_team_code: "CZE",
    silver_team_code: "CAN",
    bronze_team_code: "SWE",
    points: null
  };
}

describe("getMissingTipsOverview", () => {
  it("counts missing open known matches per user", () => {
    const rows = getMissingTipsOverview({
      profiles,
      matches: [
        match("m1", "2026-05-15T14:20:00.000Z"),
        match("m2", "2026-05-16T14:20:00.000Z")
      ],
      matchPredictions: [prediction("u1", "m1")],
      medalPredictions: [],
      now: new Date("2026-05-14T12:00:00.000Z")
    });

    expect(rows.find((row) => row.userId === "u1")?.missingMatchCount).toBe(1);
    expect(rows.find((row) => row.userId === "u2")?.missingMatchCount).toBe(2);
  });

  it("ignores locked matches and playoff placeholders without teams", () => {
    const rows = getMissingTipsOverview({
      profiles: [profiles[0]],
      matches: [
        match("locked", "2026-05-14T14:20:00.000Z"),
        match("placeholder", "2026-05-16T14:20:00.000Z", null as unknown as string, null as unknown as string),
        match("open", "2026-05-17T14:20:00.000Z")
      ],
      matchPredictions: [],
      medalPredictions: [],
      now: new Date("2026-05-15T12:00:00.000Z")
    });

    expect(rows[0].missingMatchCount).toBe(1);
    expect(rows[0].nextMissingMatches[0].id).toBe("open");
  });

  it("counts missing medal tips only before the tournament deadline", () => {
    const beforeDeadline = getMissingTipsOverview({
      profiles: [profiles[0]],
      matches: [],
      matchPredictions: [],
      medalPredictions: [],
      now: new Date("2026-05-14T12:00:00.000Z")
    });

    const afterDeadline = getMissingTipsOverview({
      profiles: [profiles[0]],
      matches: [],
      matchPredictions: [],
      medalPredictions: [],
      now: new Date("2026-05-15T14:20:00.000Z")
    });

    const withPrediction = getMissingTipsOverview({
      profiles: [profiles[0]],
      matches: [],
      matchPredictions: [],
      medalPredictions: [medalPrediction("u1")],
      now: new Date("2026-05-14T12:00:00.000Z")
    });

    expect(beforeDeadline[0].missingMedalTip).toBe(true);
    expect(afterDeadline[0].missingMedalTip).toBe(false);
    expect(withPrediction[0].missingMedalTip).toBe(false);
  });
});
