import { describe, expect, it } from "vitest";
import {
  assignSharedRanks,
  getLivePredictionState,
  isLocked,
  isScorePredictionValid,
  scoreMatchPrediction,
  scoreMedalPrediction
} from "@/lib/scoring";

describe("scoreMatchPrediction", () => {
  it("gives 3 points for an exact final score", () => {
    expect(
      scoreMatchPrediction(
        { home_score: 3, away_score: 2 },
        { home_score: 3, away_score: 2, status: "final" }
      )
    ).toBe(3);
  });

  it("gives 1 point for the correct winner with a different score", () => {
    expect(
      scoreMatchPrediction(
        { home_score: 4, away_score: 1 },
        { home_score: 3, away_score: 2, status: "final" }
      )
    ).toBe(1);
  });

  it("gives 0 points for the wrong winner", () => {
    expect(
      scoreMatchPrediction(
        { home_score: 1, away_score: 2 },
        { home_score: 3, away_score: 2, status: "final" }
      )
    ).toBe(0);
  });

  it("does not score unfinished matches", () => {
    expect(
      scoreMatchPrediction(
        { home_score: 3, away_score: 2 },
        { home_score: null, away_score: null, status: "scheduled" }
      )
    ).toBeNull();
  });
});

describe("scoreMedalPrediction", () => {
  it("scores each exact medal placement separately", () => {
    expect(
      scoreMedalPrediction(
        { gold_team_code: "CZE", silver_team_code: "CAN", bronze_team_code: "SWE" },
        { gold_team_code: "CZE", silver_team_code: "USA", bronze_team_code: "SWE" }
      )
    ).toBe(10);
  });

  it("waits until all final medals are known", () => {
    expect(
      scoreMedalPrediction(
        { gold_team_code: "CZE", silver_team_code: "CAN", bronze_team_code: "SWE" },
        { gold_team_code: "CZE", silver_team_code: null, bronze_team_code: "SWE" }
      )
    ).toBeNull();
  });
});

describe("getLivePredictionState", () => {
  it("marks the current exact live score", () => {
    expect(
      getLivePredictionState(
        { home_score: 2, away_score: 1 },
        { home_score: 2, away_score: 1, status: "live" }
      )
    ).toBe("exact-now");
  });

  it("marks the current correct winner without exact score", () => {
    expect(
      getLivePredictionState(
        { home_score: 4, away_score: 2 },
        { home_score: 2, away_score: 1, status: "live" }
      )
    ).toBe("winner-now");
  });

  it("does not mark a live tie as a correct winner", () => {
    expect(
      getLivePredictionState(
        { home_score: 4, away_score: 2 },
        { home_score: 1, away_score: 1, status: "live" }
      )
    ).toBe("can-still-hit");
  });

  it("marks a tip that can still hit the exact score", () => {
    expect(
      getLivePredictionState(
        { home_score: 3, away_score: 2 },
        { home_score: 1, away_score: 2, status: "live" }
      )
    ).toBe("can-still-hit");
  });

  it("marks a tip whose exact score is no longer possible", () => {
    expect(
      getLivePredictionState(
        { home_score: 1, away_score: 2 },
        { home_score: 3, away_score: 2, status: "live" }
      )
    ).toBe("out");
  });
});

describe("validation and ranking", () => {
  it("rejects draw predictions", () => {
    expect(isScorePredictionValid(2, 2)).toBe(false);
    expect(isScorePredictionValid(3, 2)).toBe(true);
  });

  it("uses shared ranks for equal point totals", () => {
    expect(
      assignSharedRanks([
        { name: "A", total_points: 10 },
        { name: "B", total_points: 10 },
        { name: "C", total_points: 5 }
      ])
    ).toEqual([
      { name: "A", total_points: 10, rank: 1 },
      { name: "B", total_points: 10, rank: 1 },
      { name: "C", total_points: 5, rank: 3 }
    ]);
  });

  it("locks at or after the deadline", () => {
    expect(isLocked("2026-05-15T14:20:00.000Z", new Date("2026-05-15T14:19:59.000Z"))).toBe(false);
    expect(isLocked("2026-05-15T14:20:00.000Z", new Date("2026-05-15T14:20:00.000Z"))).toBe(true);
  });
});
