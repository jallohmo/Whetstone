import { safeNext } from "@/lib/safe-next";

/**
 * The open-redirect guard on the post-auth "?next=" destination. The signup-first
 * funnel makes this load-bearing: middleware bounces anonymous visitors to
 * /signup?next=<where they were going>, so an attacker-supplied next value is
 * handed to redirect() for every user who signs in or signs up.
 */
describe("safeNext", () => {
  describe("accepts same-site paths", () => {
    it.each([
      "/home",
      "/needs/new",
      "/bookings/new?advisorId=abc123&needId=def456",
      "/advisors/cm123?needId=cm456",
      "/",
    ])("keeps %s", (path) => {
      expect(safeNext(path)).toBe(path);
    });

    it("preserves the query string, which the booking entry point depends on", () => {
      expect(safeNext("/bookings/new?advisorId=abc")).toBe("/bookings/new?advisorId=abc");
    });
  });

  describe("rejects anything that leaves the site", () => {
    it.each([
      ["absolute http", "http://evil.com"],
      ["absolute https", "https://evil.com/path"],
      ["protocol-relative", "//evil.com"],
      ["protocol-relative with path", "//evil.com/steal"],
      ["backslash variant some parsers normalise", "/\\evil.com"],
      ["javascript scheme", "javascript:alert(1)"],
      ["data scheme", "data:text/html,<script>alert(1)</script>"],
      ["bare host", "evil.com"],
      ["relative path", "home"],
    ])("rejects %s", (_label, value) => {
      expect(safeNext(value)).toBeNull();
    });
  });

  describe("rejects absent or non-string input", () => {
    it.each([
      ["undefined", undefined],
      ["null", null],
      ["empty string", ""],
      ["whitespace only", "   "],
      ["a number", 42],
      ["an object", {}],
    ])("rejects %s", (_label, value) => {
      expect(safeNext(value)).toBeNull();
    });
  });

  it("trims surrounding whitespace before deciding", () => {
    expect(safeNext("  /home  ")).toBe("/home");
    // Leading whitespace must not smuggle a protocol-relative URL through.
    expect(safeNext("  //evil.com")).toBeNull();
  });
});
