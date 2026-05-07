import { describe, expect, it } from "vitest";
import type { MatchRow } from "@/lib/db-types";
import { calculateFallbackGroupStandings, parseIihfGroupStandingsHtml } from "@/lib/group-standings";

describe("group standings", () => {
  it("parses IIHF-style group standings HTML", () => {
    const html = `
      <section>
        <h2>Group A</h2>
        <div>FIN</div>
        <div>GER</div>
        <div>2 6 2 0 0 0 8:3</div>
        <div>2 3 1 0 0 1 5:5</div>
      </section>
      <section>
        <h2>Group B</h2>
        <div>CZE</div>
        <div>CAN</div>
        <div>2 6 2 0 0 0 9:4</div>
        <div>2 3 1 0 0 1 6:4</div>
      </section>
    `;

    expect(parseIihfGroupStandingsHtml(html)).toMatchObject([
      {
        groupName: "A",
        rank: 1,
        teamCode: "FIN",
        gamesPlayed: 2,
        wins: 2,
        losses: 0,
        goalsFor: 8,
        goalsAgainst: 3,
        goalDifference: 5,
        points: 6,
        source: "iihf"
      },
      { groupName: "A", rank: 2, teamCode: "GER", points: 3 },
      { groupName: "B", rank: 1, teamCode: "CZE", points: 6 },
      { groupName: "B", rank: 2, teamCode: "CAN", points: 3 }
    ]);
  });

  it("calculates fallback standings from final preliminary games only", () => {
    const standings = calculateFallbackGroupStandings([
      match({ id: "1", group_name: "A", home_team_code: "FIN", away_team_code: "GER", home_score: 3, away_score: 1 }),
      match({ id: "2", group_name: "A", home_team_code: "USA", away_team_code: "FIN", home_score: 2, away_score: 4 }),
      match({ id: "3", group_name: "A", home_team_code: "GER", away_team_code: "USA", home_score: 5, away_score: 2 }),
      match({
        id: "4",
        phase: "Quarterfinals",
        group_name: null,
        home_team_code: "FIN",
        away_team_code: "CZE",
        home_score: 1,
        away_score: 2
      }),
      match({ id: "5", status: "scheduled", group_name: "A", home_team_code: "FIN", away_team_code: "USA", home_score: null, away_score: null })
    ]);

    expect(standings).toMatchObject([
      { groupName: "A", rank: 1, teamCode: "FIN", gamesPlayed: 2, wins: 2, losses: 0, goalsFor: 7, goalsAgainst: 3, points: 6 },
      { groupName: "A", rank: 2, teamCode: "GER", gamesPlayed: 2, wins: 1, losses: 1, goalsFor: 6, goalsAgainst: 5, points: 3 },
      { groupName: "A", rank: 3, teamCode: "USA", gamesPlayed: 2, wins: 0, losses: 2, goalsFor: 4, goalsAgainst: 9, points: 0 }
    ]);
  });
});

function match(overrides: Partial<MatchRow>): MatchRow {
  return {
    id: "match",
    iihf_game_id: null,
    phase: "Preliminary Round",
    starts_at: "2026-05-15T14:20:00.000Z",
    venue: "Swiss Life Arena",
    group_name: "A",
    home_team_code: "FIN",
    away_team_code: "GER",
    home_score: 1,
    away_score: 0,
    status: "final",
    ...overrides
  };
}
