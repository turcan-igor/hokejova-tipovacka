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

  it("parses vertical IIHF skaters HTML cards", () => {
    const html = `
      <div class="s-flag s-flag--fin"></div>
      <div class="s-name js-player-name is-enabled-statistics">LUNDELL Anton</div>
      <div>Forward</div>
      <div>1</div><div>g</div>
      <div>1</div><div>a</div>
      <div>2</div><div>pts</div>
      <div>0</div><div>+/-</div>
      <div class="s-name">LUNDELL Anton</div>
      <div>Position:</div>
      <div>Forward</div>
      <div>gp</div>
      <div>g</div>
      <div>a</div>
      <div>pts</div>
      <div>pim</div>
      <div>sog</div>
      <div>+/-</div>
      <div>gwg</div>
      <div>ppg</div>
      <div>shg</div>
      <div>1</div>
      <div>1</div>
      <div>1</div>
      <div>2</div>
      <div>0</div>
      <div>3</div>
      <div>0</div>
      <div>0</div>
      <div>1</div>
      <div>0</div>
    `;

    const stats = parseIihfPlayerStatsHtml(html, "fixture");

    expect(stats).toHaveLength(1);
    expect(stats[0]).toMatchObject({
      playerName: "LUNDELL Anton",
      teamCode: "FIN",
      position: "Forward",
      gamesPlayed: 1,
      goals: 1,
      assists: 1,
      points: 2,
      penaltyMinutes: 0,
      plusMinus: "0"
    });
  });

  it("parses IIHF table rows with team and stat cells", () => {
    const html = `
      <tr class="s-row js-table-row">
        <td class="s-cell s-cell--rank js-table-cell"><span class="s-value js-table-cell-value">3</span></td>
        <td class="s-cell s-cell--name js-table-cell"><span class="s-value js-table-cell-value">MINTEN Fraser</span></td>
        <td class="s-cell s-cell--position js-table-cell"><span class="s-value js-table-cell-value">F</span></td>
        <td class="s-cell s-cell--team js-table-cell">
          <span class="s-flag s-flag--can"></span>
          <span class="s-value js-table-cell-value">CAN</span>
        </td>
        <td class="s-cell s-cell--value s-cell--gp js-table-cell"><span class="s-value js-table-cell-value">1</span></td>
        <td class="s-cell s-cell--value s-cell--g js-table-cell"><span class="s-value js-table-cell-value">0</span></td>
        <td class="s-cell s-cell--value s-cell--a js-table-cell"><span class="s-value js-table-cell-value">2</span></td>
        <td class="s-cell s-cell--value s-cell--pts js-table-cell"><span class="s-value js-table-cell-value">2</span></td>
        <td class="s-cell s-cell--value s-cell--pim js-table-cell"><span class="s-value js-table-cell-value">0</span></td>
        <td class="s-cell s-cell--value s-cell--plusminus js-table-cell"><span class="s-value js-table-cell-value">+2</span></td>
      </tr>
    `;

    const stats = parseIihfPlayerStatsHtml(html, "fixture");

    expect(stats).toHaveLength(1);
    expect(stats[0]).toMatchObject({
      playerName: "MINTEN Fraser",
      teamCode: "CAN",
      position: "Forward",
      gamesPlayed: 1,
      goals: 0,
      assists: 2,
      points: 2,
      penaltyMinutes: 0,
      plusMinus: "+2"
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
