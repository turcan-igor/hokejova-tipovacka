import { describe, expect, it } from "vitest";
import { groupMatchesByDay } from "@/lib/match-groups";
import type { MatchRow } from "@/lib/db-types";

function match(id: string, startsAt: string): MatchRow {
  return {
    id,
    iihf_game_id: id,
    phase: "Preliminary Round",
    starts_at: startsAt,
    venue: null,
    group_name: "A",
    home_team_code: "CZE",
    away_team_code: "CAN",
    home_score: null,
    away_score: null,
    status: "scheduled"
  };
}

describe("groupMatchesByDay", () => {
  it("groups multiple matches on the same day", () => {
    const groups = groupMatchesByDay([
      match("m1", "2026-05-15T14:20:00.000Z"),
      match("m2", "2026-05-15T18:20:00.000Z")
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].matches.map((item) => item.id)).toEqual(["m1", "m2"]);
  });

  it("creates separate day groups and keeps chronological ordering", () => {
    const groups = groupMatchesByDay([
      match("m3", "2026-05-16T18:20:00.000Z"),
      match("m1", "2026-05-15T18:20:00.000Z"),
      match("m2", "2026-05-16T14:20:00.000Z")
    ]);

    expect(groups.map((group) => group.matches.map((item) => item.id))).toEqual([
      ["m1"],
      ["m2", "m3"]
    ]);
  });
});
