import { describe, expect, it } from "vitest";
import { calculateTipperStats } from "@/lib/tipper-stats";
import { FALLBACK_TROPHY_CONFIG, TIPPER_TROPHY_CONFIG } from "@/lib/tipper-trophy-config";
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
    expect(stats.awards.find((award) => award.key === "exact-king")?.winners.map((winner) => winner.displayName)).toEqual(["Anna", "Boris"]);
    expect(stats.awards.find((award) => award.key === "exact-king")?.winnerLabel).toBe("Anna, Boris · 1");
    expect(stats.awards.find((award) => award.key === "medal-master")?.winnerName).toBeNull();
    expect(stats.awards.find((award) => award.key === "winner-oracle")?.winnerName).toBe("Anna");
    expect(stats.awards.find((award) => award.key === "contrarian")?.winnerName).toBe("Cyril");
  });

  it("assigns trophy badges to award winners", () => {
    const trophyProfiles: ProfileRow[] = [
      ...profiles,
      { id: "u4", display_name: "Dana" }
    ];
    const stats = calculateTipperStats({
      profiles: trophyProfiles,
      matches: [
        finalMatch("m1", "2026-05-15T14:20:00.000Z", 3, 2),
        finalMatch("m2", "2026-05-16T14:20:00.000Z", 1, 4)
      ],
      matchPredictions: [
        prediction("u1", "m1", 3, 2, 3),
        prediction("u1", "m2", 2, 4, 1),
        prediction("u2", "m1", 2, 5, 0),
        prediction("u2", "m2", 5, 1, 0),
        prediction("u3", "m1", 8, 7, 1),
        prediction("u3", "m2", 7, 6, 0)
      ],
      medalPredictions: [medal("u1", 10), medal("u2", 5), medal("u3", 0)],
      now: new Date("2026-05-17T12:00:00.000Z")
    });

    const anna = stats.profiles.find((row) => row.user_id === "u1");
    const cyril = stats.profiles.find((row) => row.user_id === "u3");
    const dana = stats.profiles.find((row) => row.user_id === "u4");

    expect(anna?.trophies.map((trophy) => trophy.key)).toContain("exact-king");
    expect(anna?.trophies.map((trophy) => trophy.key)).toContain("medal-master");
    expect(anna?.trophies.length).toBeGreaterThan(1);
    expect(cyril?.trophies.map((trophy) => trophy.key)).toContain("shootout");
    expect(dana?.trophies.map((trophy) => trophy.key)).toContain("behind");
    expect(Object.keys(TIPPER_TROPHY_CONFIG).sort()).toEqual(stats.awards.map((award) => award.key).sort());
    expect(FALLBACK_TROPHY_CONFIG.icon).toBe("Trophy");
  });

  it("does not assign trophy badges for zero-value shared awards", () => {
    const stats = calculateTipperStats({
      profiles,
      matches: [finalMatch("m1", "2026-05-15T14:20:00.000Z", 3, 2)],
      matchPredictions: [],
      medalPredictions: [],
      now: new Date("2026-05-17T12:00:00.000Z")
    });

    expect(stats.awards.find((award) => award.key === "exact-king")?.winners).toEqual([]);
    expect(stats.awards.find((award) => award.key === "exact-king")?.winnerName).toBeNull();
    expect(stats.awards.find((award) => award.key === "exact-king")?.winnerLabel).toBe("Nedostatek dat");
    expect(stats.profiles.every((profile) => profile.trophies.length === 0)).toBe(true);
  });
});
