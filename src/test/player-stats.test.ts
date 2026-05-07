import { describe, expect, it } from "vitest";
import { parseIihfPlayerStatsHtml, sortPlayerStats } from "@/lib/player-stats";

const fixture = `
  KAZDA Timothy
  Forward
  Position: Forward
  Team
  SVK
  gp g a pts pim sog +/- gwg ppg shg
  5 6 4 10 0 27 +3 1 1 0

  CULLEN Wyatt
  Forward
  Team
  USA
  gp g a pts pim sog +/- gwg ppg shg
  5 3 6 9 6 15 +3 0 0 0

  HERMANSSON Elton
  Forward
  Team
  SWE
  gp g a pts pim sog +/- gwg ppg shg
  5 2 7 9 4 20 +3 0 0 0
`;

describe("parseIihfPlayerStatsHtml", () => {
  it("parses player scoring rows from IIHF-like text", () => {
    const stats = parseIihfPlayerStatsHtml(fixture, "fixture");

    expect(stats).toHaveLength(3);
    expect(stats[0]).toMatchObject({
      playerName: "KAZDA Timothy",
      teamCode: "SVK",
      gamesPlayed: 5,
      goals: 6,
      assists: 4,
      points: 10,
      plusMinus: "+3"
    });
  });
});

describe("sortPlayerStats", () => {
  it("sorts by points, goals, and assists views", () => {
    const stats = parseIihfPlayerStatsHtml(fixture, "fixture");

    expect(sortPlayerStats(stats, "points").map((stat) => stat.playerName)).toEqual([
      "KAZDA Timothy",
      "CULLEN Wyatt",
      "HERMANSSON Elton"
    ]);
    expect(sortPlayerStats(stats, "goals")[0].playerName).toBe("KAZDA Timothy");
    expect(sortPlayerStats(stats, "assists")[0].playerName).toBe("HERMANSSON Elton");
  });
});
