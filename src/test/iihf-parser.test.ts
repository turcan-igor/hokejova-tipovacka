import { describe, expect, it } from "vitest";
import { parseIihfScheduleHtml, parseIihfStatsScheduleHtml } from "@/lib/iihf-parser";

describe("parseIihfScheduleHtml", () => {
  it("parses upcoming preliminary matches and game ids", () => {
    const html = `
      <a href="/en/events/2026/wm/gamecenter/playbyplay/69588/1-fin-vs-ger">Game Centre</a>
      15 May
      FIN
      FIN
      0
      live
      UPCOMING
      UPCOMING{{status}}
      0
      GER
      GER
      FIN vs GER
      Swiss Life Arena, Group A
      16:20
    `;

    const matches = parseIihfScheduleHtml(html);
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      iihfGameId: "69588",
      homeTeamCode: "FIN",
      awayTeamCode: "GER",
      status: "scheduled",
      phase: "Preliminary Round",
      groupName: "A"
    });
    expect(matches[0].startsAt).toBe("2026-05-15T14:20:00.000Z");
  });

  it("keeps playoff placeholders closed for tipping", () => {
    const html = `
      <a href="/en/events/2026/wm/gamecenter/playbyplay/69644/qf">Game Centre</a>
      28 May
      QF
      QF
      0
      UPCOMING
      0
      QF
      QF
      QF vs QF
      Swiss Life Arena
      16:20
    `;

    const matches = parseIihfScheduleHtml(html);
    expect(matches[0]).toMatchObject({
      homeTeamCode: null,
      awayTeamCode: null,
      phase: "Quarterfinals"
    });
  });

  it("parses final scores", () => {
    const html = `
      <a href="/en/events/2026/wm/gamecenter/playbyplay/1/test">Game Centre</a>
      15 May
      CZE
      CZE
      4
      FINAL
      FINAL{{status}}
      2
      DEN
      DEN
      CZE vs DEN
      BCF Arena, Group B
      20:20
    `;

    const matches = parseIihfScheduleHtml(html);
    expect(matches[0]).toMatchObject({
      homeScore: 4,
      awayScore: 2,
      status: "final"
    });
  });

  it("parses completed games from IIHF stats schedule", () => {
    const html = `
      15 May 2026, Fri
      16:20  GMT+2  Zurich
      Swiss Life Arena  1
      PRE FIN  -  GER   3 - 1
      ( 1 - 0 ,  0 - 0 ,  2 - 1 )  Game
      Completed  Roster Lineups Summary
      15 May 2026, Fri
      16:20  GMT+2  Fribourg
      BCF Arena  2
      PRE CAN  -  SWE   5 - 3
      Completed
      15 May 2026, Fri
      20:20  GMT+2  Zurich
      Swiss Life Arena  3
      PRE USA  -  SUI   0 - 1   Live
      ( 0 - 1 )  Period 1
    `;

    const matches = parseIihfStatsScheduleHtml(html);
    expect(matches).toMatchObject([
      {
        iihfGameId: "static-2026-01",
        homeTeamCode: "FIN",
        awayTeamCode: "GER",
        homeScore: 3,
        awayScore: 1,
        status: "final",
        groupName: "A"
      },
      {
        iihfGameId: "static-2026-02",
        homeTeamCode: "CAN",
        awayTeamCode: "SWE",
        homeScore: 5,
        awayScore: 3,
        status: "final",
        groupName: "B"
      },
      {
        iihfGameId: "static-2026-03",
        homeTeamCode: "USA",
        awayTeamCode: "SUI",
        homeScore: 0,
        awayScore: 1,
        status: "live",
        groupName: "A"
      }
    ]);
  });
});
