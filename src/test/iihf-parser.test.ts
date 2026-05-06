import { describe, expect, it } from "vitest";
import { parseIihfScheduleHtml } from "@/lib/iihf-parser";

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
});
