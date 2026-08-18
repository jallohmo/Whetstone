/**
 * Joining a session's video call.
 *
 * Daily rooms are created private, so the room URL alone is not joinable —
 * Daily answers "You are not allowed to join this meeting". The join path must
 * therefore mint a meeting token for the person joining and hand it to Daily on
 * the redirect. These tests pin that, plus the authorization decisions the token
 * encodes (who may join at all, and who joins as the owner).
 */

const mockRedirect = jest.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
jest.mock("next/navigation", () => ({ redirect: (url: string) => mockRedirect(url) }));

const mockSession = { findUnique: jest.fn(), update: jest.fn() };
jest.mock("@/lib/prisma", () => ({
  prisma: {
    session: {
      findUnique: (...args: unknown[]) => mockSession.findUnique(...args),
      update: (...args: unknown[]) => mockSession.update(...args),
    },
  },
}));

// getCurrentUser is wrapped in React's cache(), which isn't available in the
// jsdom React build; the rest of the module (displayName) is used for real.
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  cache: (fn: unknown) => fn,
}));

const mockGetCurrentUser = jest.fn();
jest.mock("@/lib/auth", () => ({
  ...jest.requireActual("@/lib/auth"),
  getCurrentUser: () => mockGetCurrentUser(),
}));

const mockGetAuthorizedBooking = jest.fn();
jest.mock("@/lib/actions/messages", () => ({
  getAuthorizedBooking: (...args: unknown[]) => mockGetAuthorizedBooking(...args),
}));

jest.mock("@/lib/observability", () => ({ reportError: jest.fn() }));

import { startVideoCall } from "@/lib/actions/video";

const ROOM_URL = "https://whetstone.daily.co/abc123";
const SCHEDULED_AT = new Date("2026-09-01T03:00:00.000Z");

const CUSTOMER = {
  id: "user_customer",
  email: "client@example.com",
  role: "CUSTOMER",
  fullName: null,
  firstName: "Casey",
  lastName: "Client",
  avatarUrl: null,
};
const ADVISOR = { ...CUSTOMER, id: "user_advisor", role: "ADVISOR", firstName: "Avery", lastName: "Advisor" };

const BOOKING = {
  id: "booking_1",
  customer: { userId: CUSTOMER.id },
  advisor: { userId: ADVISOR.id },
};

/** A form post from the "Join call" button. */
function form(sessionId = "session_1"): FormData {
  const fd = new FormData();
  fd.set("sessionId", sessionId);
  return fd;
}

/** Runs the action and returns the URL it redirected to. */
async function joinAndCaptureRedirect(fd = form()): Promise<string> {
  await expect(startVideoCall(fd)).rejects.toThrow(/NEXT_REDIRECT/);
  return mockRedirect.mock.calls.at(-1)![0];
}

let fetchMock: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  process.env.DAILY_API_KEY = "test-key";
  mockGetCurrentUser.mockResolvedValue(CUSTOMER);
  mockGetAuthorizedBooking.mockResolvedValue(BOOKING);
  mockSession.findUnique.mockResolvedValue({
    id: "session_1",
    bookingId: BOOKING.id,
    scheduledAt: SCHEDULED_AT,
    videoCallUrl: ROOM_URL,
  });

  fetchMock = jest.fn(async (url: string) => {
    if (String(url).endsWith("/meeting-tokens")) {
      return { ok: true, json: async () => ({ token: "tok_abc" }) };
    }
    return { ok: true, json: async () => ({ url: ROOM_URL }) };
  });
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe("startVideoCall", () => {
  it("redirects with a meeting token, not the bare private room URL", async () => {
    const target = await joinAndCaptureRedirect();
    expect(target).toBe(`${ROOM_URL}?t=tok_abc`);
  });

  it("mints the token for the room being joined, scoped to the joining user", async () => {
    await joinAndCaptureRedirect();

    const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/meeting-tokens"));
    expect(call).toBeDefined();
    const [, init] = call!;
    expect(init.headers.Authorization).toBe("Bearer test-key");
    const { properties } = JSON.parse(init.body);
    expect(properties.room_name).toBe("abc123");
    expect(properties.user_id).toBe(CUSTOMER.id);
    expect(properties.user_name).toBe("Casey Client");
    // Token dies with the room, and Daily removes anyone still in the call.
    expect(properties.exp).toBe(Math.floor(SCHEDULED_AT.getTime() / 1000) + 4 * 3600);
    expect(properties.eject_at_token_exp).toBe(true);
  });

  it("gives owner rights to the advisor and not the client", async () => {
    await joinAndCaptureRedirect();
    const asClient = JSON.parse(
      fetchMock.mock.calls.find(([u]) => String(u).endsWith("/meeting-tokens"))![1].body,
    );
    expect(asClient.properties.is_owner).toBe(false);

    jest.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(ADVISOR);
    await joinAndCaptureRedirect();
    const asAdvisor = JSON.parse(
      fetchMock.mock.calls.find(([u]) => String(u).endsWith("/meeting-tokens"))![1].body,
    );
    expect(asAdvisor.properties.is_owner).toBe(true);
  });

  it("creates the room on first join and stores its URL", async () => {
    mockSession.findUnique.mockResolvedValue({
      id: "session_1",
      bookingId: BOOKING.id,
      scheduledAt: SCHEDULED_AT,
      videoCallUrl: null,
    });

    const target = await joinAndCaptureRedirect();

    const roomCall = fetchMock.mock.calls.find(([u]) => String(u).endsWith("/v1/rooms"));
    expect(JSON.parse(roomCall![1].body).privacy).toBe("private");
    expect(mockSession.update).toHaveBeenCalledWith({
      where: { id: "session_1" },
      data: { videoCallUrl: ROOM_URL },
    });
    expect(target).toBe(`${ROOM_URL}?t=tok_abc`);
  });

  it("refuses someone who isn't a party on the booking", async () => {
    mockGetAuthorizedBooking.mockResolvedValue(null);
    await expect(startVideoCall(form())).rejects.toThrow(/don't have access/);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("fails loudly rather than redirecting to an unjoinable room when tokens fail", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      String(url).endsWith("/meeting-tokens")
        ? { ok: false, status: 400, text: async () => "bad request" }
        : { ok: true, json: async () => ({ url: ROOM_URL }) },
    );

    await expect(startVideoCall(form())).rejects.toThrow(/try again shortly/);
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
