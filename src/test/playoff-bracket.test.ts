import { describe, expect, it } from "vitest";
import type { MatchRow } from "@/lib/db-types";
import { getPlayoffBracket } from "@/lib/playoff-bracket";

describe("getPlayoffBracket", () => {
  it("groups playoff matches by bracket round and keeps placeholder matches", () => {
    const bracket = getPlayoffBracket([
      match({ id: "sf", phase: "Semifinals", starts_at: "2026-05-30T13:20:00.000Z", home_team_code: null, away_team_code: null }),
      match({ id: "qf2", phase: "Quarterfinals", starts_at: "2026-05-28T18:20:00.000Z" }),
      match({ id: "pre", phase: "Preliminary Round", starts_at: "2026-05-15T14:20:00.000Z" }),
      match({ id: "qf1", phase: "Quarterfinals", starts_at: "2026-05-28T14:20:00.000Z" }),
      match({ id: "bronze", phase: "Bronze Medal Game", starts_at: "2026-05-31T13:30:00.000Z" }),
      match({ id: "final", phase: "Gold Medal Game", starts_at: "2026-05-31T18:20:00.000Z" })
    ]);

    expect(bracket.map((round) => round.label)).toEqual(["Čtvrtfinále", "Semifinále", "O bronz", "Finále"]);
    expect(bracket[0].matches.map((matchRow) => matchRow.id)).toEqual(["qf1", "qf2"]);
    expect(bracket[1].matches[0]).toMatchObject({ id: "sf", home_team_code: null, away_team_code: null });
  });
});

function match(overrides: Partial<MatchRow>): MatchRow {
  return {
    id: "match",
    iihf_game_id: null,
    phase: "Quarterfinals",
    starts_at: "2026-05-28T14:20:00.000Z",
    venue: "Swiss Life Arena",
    group_name: null,
    home_team_code: "FIN",
    away_team_code: "GER",
    home_score: null,
    away_score: null,
    status: "scheduled",
    ...overrides
  };
}
