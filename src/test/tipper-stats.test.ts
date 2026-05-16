import { describe, expect, it } from "vitest";
import { calculateTipperStats } from "@/lib/tipper-stats";
import type { MatchPredictionRow, MatchRow, MedalPredictionRow, ProfileRow } from "@/lib/db-types";

const profiles: ProfileRow[] = [
  { id: "u1", display_name: "Anna" },
  { id: "u2", display_name: "Boris" },
  { id: "u3", display_name: "Cyril" }
];

function finalMatch(id: string, startsAt: string, homeScore: number, awayScore: number): MatchRow {
  return {
    id,
    iihf_game_id: id,
    phase: "Preliminary Round",
    starts_at: startsAt,
    venue: null,
    group_name: "A",
    home_team_code: "CZE",
    away_team_code: "CAN",
    home_score: homeScore,
    away_score: awayScore,
    status: "final"
  };
}

function scheduledMatch(id: string, startsAt: string): MatchRow {
  return {
    id,
    iihf_game_id: id,
    phase: "Preliminary Round",
    starts_at: startsAt,
    venue: null,
    group_name: "A",
    home_team_code: "FIN",
    away_team_code: "GER",
    home_score: null,
    away_score: null,
    status: "scheduled"
  };
}

function prediction(userId: string, matchId: string, homeScore: number, awayScore: number, points: number | null): MatchPredictionRow {
  return {
    id: `${userId}-${matchId}`,
    user_id: userId,
    match_id: matchId,
    home_score: homeScore,
    away_score: awayScore,
    points,
    is_exact: points === 3
  };
}

function medal(userId: string, points: number): MedalPredictionRow {
  return {
    id: `medal-${userId}`,
    user_id: userId,
    gold_team_code: "CZE",
    silver_team_code: "CAN",
    bronze_team_code: "SWE",
    points
  };
}

describe("calculateTipperStats", () => {
  it("calculates accuracy, efficiency, discipline, and leaderboard gaps", () => {
    const stats = calculateTipperStats({
      profiles,
      matches: [
        finalMatch("m1", "2026-05-15T14:20:00.000Z", 3, 2),
        finalMatch("m2", "2026-05-16T14:20:00.000Z", 1, 4),
        scheduledMatch("m3", "2026-05-14T14:20:00.000Z")
      ],
      matchPredictions: [
        prediction("u1", "m1", 3, 2, 3),
        prediction("u1", "m2", 2, 4, 1),
        prediction("u1", "m3", 2, 1, null),
        prediction("u2", "m1", 2, 3, 0),
        prediction("u2", "m2", 1, 4, 3),
        prediction("u3", "m1", 4, 3, 1)
      ],
      medalPredictions: [medal("u1", 5), medal("u2", 0), medal("u3", 0)],
      now: new Date("2026-05-17T12:00:00.000Z")
    });

    const anna = stats.profiles.find((row) => row.user_id === "u1");
    const boris = stats.profiles.find((row) => row.user_id === "u2");

    expect(anna?.rank).toBe(1);
    expect(anna?.total_points).toBe(9);
    expect(anna?.winnerAccuracy).toBe(1);
    expect(anna?.exactAccuracy).toBe(0.5);
    expect(anna?.pointEfficiency).toBe(4 / 6);
    expect(anna?.disciplineRate).toBe(1);
    expect(anna?.pointsLast5).toBe(4);
    expect(anna?.bestDay?.points).toBe(3);
    expect(boris?.pointsBehindLeader).toBe(6);
    expect(boris?.leaderHeadToHead.betterMatches).toBe(1);
    expect(boris?.leaderHeadToHead.worseMatches).toBe(1);
  });

  it("builds global awards with deterministic winners", () => {
    const stats = calculateTipperStats({
      profiles,
      matches: [
        finalMatch("m1", "2026-05-15T14:20:00.000Z", 3, 2),
        finalMatch("m2", "2026-05-16T14:20:00.000Z", 1, 4)
      ],
      matchPredictions: [
        prediction("u1", "m1", 3, 2, 3),
        prediction("u1", "m2", 2, 4, 1),
        prediction("u2", "m1", 5, 4, 1),
        prediction("u2", "m2", 1, 4, 3),
        prediction("u3", "m1", 2, 3, 0),
        prediction("u3", "m2", 3, 2, 0)
      ],
      medalPredictions: [],
      now: new Date("2026-05-17T12:00:00.000Z")
    });

    expect(stats.awards.find((award) => award.key === "exact-king")?.winnerName).toBe("Anna");
    expect(stats.awards.find((award) => award.key === "winner-oracle")?.winnerName).toBe("Anna");
    expect(stats.awards.find((award) => award.key === "contrarian")?.winnerName).toBe("Cyril");
  });
});
