/**
 * The module under test is server-only and uses AbortSignal.timeout, which the
 * default jsdom environment does not implement. Run it where it actually runs.
 *
 * @jest-environment node
 */
import { createHash } from "crypto";
import {
  checkPasswordBreached,
  breachedPasswordMessage,
} from "@/lib/password-security";

/**
 * Leaked-password protection. Supabase gates its native HIBP check behind the Pro
 * plan, so this runs in the application against the same corpus.
 *
 * The network is stubbed throughout — these assert our half of the contract:
 * that only a 5-character hash prefix ever leaves the process, that padding
 * entries are not mistaken for hits, and that a failed lookup fails OPEN.
 */
const sha1Upper = (s: string) =>
  createHash("sha1").update(s, "utf8").digest("hex").toUpperCase();

function mockRange(body: string, init: { ok?: boolean; status?: number } = {}) {
  const fn = jest.fn().mockResolvedValue({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    text: async () => body,
  });
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

afterEach(() => {
  jest.restoreAllMocks();
  // @ts-expect-error -- clearing the stub between tests
  delete global.fetch;
});

describe("checkPasswordBreached", () => {
  const password = "hunter2-please-no";
  const digest = sha1Upper(password);
  const prefix = digest.slice(0, 5);
  const suffix = digest.slice(5);

  describe("k-anonymity contract", () => {
    it("sends only the first five hex characters of the hash", async () => {
      const fetchMock = mockRange("");
      await checkPasswordBreached(password);

      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe(`https://api.pwnedpasswords.com/range/${prefix}`);
      expect(prefix).toHaveLength(5);
    });

    it("never puts the password or its full hash on the wire", async () => {
      const fetchMock = mockRange("");
      await checkPasswordBreached(password);

      const call = JSON.stringify(fetchMock.mock.calls[0]);
      expect(call).not.toContain(password);
      expect(call).not.toContain(digest);
      expect(call).not.toContain(suffix);
    });

    it("asks for padding so the response size reveals nothing", async () => {
      const fetchMock = mockRange("");
      await checkPasswordBreached(password);

      const [, options] = fetchMock.mock.calls[0];
      expect(options.headers["Add-Padding"]).toBe("true");
    });
  });

  describe("detection", () => {
    it("flags a password whose suffix appears with a positive count", async () => {
      mockRange(`${suffix}:37\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:5`);
      await expect(checkPasswordBreached(password)).resolves.toEqual({
        breached: true,
        count: 37,
        degraded: false,
      });
    });

    it("clears a password whose suffix is absent", async () => {
      mockRange("0000000000000000000000000000000000A:12\n1111111111111111111111111111111111B:3");
      await expect(checkPasswordBreached(password)).resolves.toEqual({
        breached: false,
        count: 0,
        degraded: false,
      });
    });

    it("does not treat a zero-count padding entry as a hit", async () => {
      // HIBP returns decoy hashes with a count of 0 when padding is requested.
      mockRange(`${suffix}:0`);
      const result = await checkPasswordBreached(password);
      expect(result.breached).toBe(false);
    });

    it("tolerates CRLF line endings and stray whitespace", async () => {
      mockRange(`\r\n${suffix}:9\r\n`);
      const result = await checkPasswordBreached(password);
      expect(result).toEqual({ breached: true, count: 9, degraded: false });
    });

    it("matches case-insensitively against the uppercase corpus", async () => {
      mockRange(`${suffix.toUpperCase()}:4`);
      await expect(checkPasswordBreached(password)).resolves.toMatchObject({
        breached: true,
      });
    });
  });

  describe("fails open", () => {
    it("allows the password when the network throws", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("ECONNREFUSED")) as never;
      await expect(checkPasswordBreached(password)).resolves.toEqual({
        breached: false,
        count: 0,
        degraded: true,
      });
    });

    it("allows the password on a non-OK response", async () => {
      mockRange("", { ok: false, status: 503 });
      const result = await checkPasswordBreached(password);
      expect(result.breached).toBe(false);
      expect(result.degraded).toBe(true);
    });

    it("allows the password when the lookup times out", async () => {
      global.fetch = jest
        .fn()
        .mockRejectedValue(Object.assign(new Error("timeout"), { name: "TimeoutError" })) as never;
      await expect(checkPasswordBreached(password)).resolves.toMatchObject({
        breached: false,
        degraded: true,
      });
    });

    it("marks a failed lookup as degraded, distinguishing it from a clean result", async () => {
      mockRange("", { ok: false, status: 500 });
      const failed = await checkPasswordBreached(password);
      mockRange("0000000000000000000000000000000000A:1");
      const clean = await checkPasswordBreached(password);

      expect(failed.degraded).toBe(true);
      expect(clean.degraded).toBe(false);
    });
  });

  it("short-circuits an empty password without calling out", async () => {
    const fetchMock = mockRange("");
    await expect(checkPasswordBreached("")).resolves.toEqual({
      breached: false,
      count: 0,
      degraded: false,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("breachedPasswordMessage", () => {
  it("states the count and what to do", () => {
    const msg = breachedPasswordMessage(37);
    expect(msg).toContain("37 times");
    expect(msg).toContain("choose a different one");
  });

  it("rounds large counts to something readable", () => {
    expect(breachedPasswordMessage(24_000)).toContain("24,000+ times");
  });

  it("never implies we know anything about this user's own accounts", () => {
    const msg = breachedPasswordMessage(5);
    expect(msg).toContain("known data breaches");
    expect(msg).not.toMatch(/your account|you were|hacked/i);
  });
});
