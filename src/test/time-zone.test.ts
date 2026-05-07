import { describe, expect, it } from "vitest";
import { formatTournamentDateTime, tournamentLocalTimeToUtcIso } from "@/lib/time-zone";

describe("tournament time zone", () => {
  it("converts Swiss tournament time in May to UTC", () => {
    expect(
      tournamentLocalTimeToUtcIso({
        year: 2026,
        monthIndex: 4,
        day: 15,
        time: "16:20"
      })
    ).toBe("2026-05-15T14:20:00.000Z");
  });

  it("formats times in the tournament time zone", () => {
    expect(
      formatTournamentDateTime("2026-05-15T14:20:00.000Z", {
        hour: "2-digit",
        minute: "2-digit"
      })
    ).toBe("16:20");
  });
});
