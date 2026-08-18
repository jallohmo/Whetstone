import {
  wallClockToUtc,
  utcToWallClock,
  zoneOffsetMs,
  PLATFORM_TIMEZONE,
} from "@/lib/time";

/**
 * The conversion that decides what an availability slot actually means. It is
 * pure, so it is testable without a browser or a database — which matters,
 * because the bug it fixes (wall-clock text parsed in the server's zone) was
 * invisible on screen: input and display were wrong by the same amount and
 * agreed with each other.
 *
 * Sydney is deliberately awkward — it is +10/+11 and its DST transitions run
 * opposite to the northern hemisphere — so it exercises the offset maths harder
 * than a fixed-offset zone would.
 */
describe("time zone handling", () => {
  const SYD = "Australia/Sydney";

  it("defaults the platform zone to Sydney", () => {
    expect(PLATFORM_TIMEZONE).toBe("Australia/Sydney");
  });

  describe("wallClockToUtc", () => {
    it("reads a winter wall-clock time as AEST (+10), not as UTC", () => {
      // 18 Aug is winter in Sydney: UTC+10. 09:00 local is 23:00 the day before.
      expect(wallClockToUtc("2026-08-18T09:00", SYD).toISOString()).toBe(
        "2026-08-17T23:00:00.000Z",
      );
    });

    it("reads a summer wall-clock time as AEDT (+11)", () => {
      // 18 Jan is daylight saving in Sydney: UTC+11. 09:00 local is 22:00 prior.
      expect(wallClockToUtc("2026-01-18T09:00", SYD).toISOString()).toBe(
        "2026-01-17T22:00:00.000Z",
      );
    });

    it("uses the offset in force on the chosen date, not today's", () => {
      // The whole point of resolving per-instant: two identical wall-clock times
      // six months apart must land on different UTC offsets.
      const winter = wallClockToUtc("2026-08-18T09:00", SYD);
      const summer = wallClockToUtc("2026-01-18T09:00", SYD);
      expect(zoneOffsetMs(winter, SYD)).toBe(10 * 60 * 60 * 1000);
      expect(zoneOffsetMs(summer, SYD)).toBe(11 * 60 * 60 * 1000);
    });

    it("handles the hour after DST starts (clocks jump forward)", () => {
      // Sydney 2026: DST begins 4 October, 02:00 -> 03:00. 03:00 exists at +11.
      expect(wallClockToUtc("2026-10-04T03:00", SYD).toISOString()).toBe(
        "2026-10-03T16:00:00.000Z",
      );
    });

    it("handles the hour after DST ends (clocks go back)", () => {
      // Sydney 2026: DST ends 5 April, 03:00 -> 02:00. 03:00 is unambiguous at +10.
      expect(wallClockToUtc("2026-04-05T03:00", SYD).toISOString()).toBe(
        "2026-04-04T17:00:00.000Z",
      );
    });

    it("treats a fixed-offset zone as that offset", () => {
      expect(wallClockToUtc("2026-08-18T09:00", "UTC").toISOString()).toBe(
        "2026-08-18T09:00:00.000Z",
      );
      // Brisbane never observes DST: always +10.
      expect(wallClockToUtc("2026-01-18T09:00", "Australia/Brisbane").toISOString()).toBe(
        "2026-01-17T23:00:00.000Z",
      );
    });

    it("accepts seconds, and the space-separated form", () => {
      expect(wallClockToUtc("2026-08-18T09:30:15", SYD).toISOString()).toBe(
        "2026-08-17T23:30:15.000Z",
      );
      expect(wallClockToUtc("2026-08-18 09:00", SYD).toISOString()).toBe(
        "2026-08-17T23:00:00.000Z",
      );
    });

    it("returns an Invalid Date for junk, so callers can keep checking NaN", () => {
      for (const junk of ["", "not a date", "2026-13-99T99:99", "18/08/2026"]) {
        expect(Number.isNaN(wallClockToUtc(junk, SYD).getTime())).toBe(true);
      }
    });

    it("rejects out-of-range components instead of rolling them over", () => {
      // Date.UTC would happily turn these into some other real date, which would
      // store a time the advisor never picked.
      for (const bad of [
        "2026-13-01T09:00", // month 13
        "2026-00-01T09:00", // month 0
        "2026-02-31T09:00", // 31 February
        "2026-04-31T09:00", // 31 April
        "2026-08-18T24:00", // hour 24
        "2026-08-18T09:60", // minute 60
      ]) {
        expect(Number.isNaN(wallClockToUtc(bad, SYD).getTime())).toBe(true);
      }
    });
  });

  describe("utcToWallClock", () => {
    it("renders an instant as local wall-clock text for the input's min", () => {
      expect(utcToWallClock(new Date("2026-08-17T23:00:00.000Z"), SYD)).toBe(
        "2026-08-18T09:00",
      );
    });

    it("round-trips with wallClockToUtc across both offsets", () => {
      for (const wall of ["2026-08-18T09:00", "2026-01-18T09:00", "2026-12-31T23:59"]) {
        expect(utcToWallClock(wallClockToUtc(wall, SYD), SYD)).toBe(wall);
      }
    });
  });

  describe("the bug this replaces", () => {
    it("no longer agrees with a naive parse in a UTC runtime", () => {
      // new Date("2026-08-18T09:00") under TZ=UTC gives 09:00Z — 7pm in Sydney.
      // That silent 10-hour shift is what this module exists to stop.
      const naiveInUtcRuntime = Date.UTC(2026, 7, 18, 9, 0);
      expect(wallClockToUtc("2026-08-18T09:00", SYD).getTime()).not.toBe(naiveInUtcRuntime);
      expect(naiveInUtcRuntime - wallClockToUtc("2026-08-18T09:00", SYD).getTime()).toBe(
        10 * 60 * 60 * 1000,
      );
    });
  });
});
