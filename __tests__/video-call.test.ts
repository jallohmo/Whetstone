/**
 * Preparing a session's video call.
 *
 * Daily rooms are created private, so the room URL alone is not joinable —
 * Daily answers "You are not allowed to join this meeting". Whoever joins needs
 * a meeting token, whether they're redirected to daily.co or (as now) joining
 * through the embedded call screen. These tests pin the token minting and the
 * authorization decisions it encodes: who may join at all, and who joins as the
 * owner.
 */

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

const mockGetAuthorizedBooking = jest.fn();
jest.mock("@/lib/actions/messages", () => ({
  getAuthorizedBooking: (...args: unknown[]) => mockGetAuthorizedBooking(...args),
}));

jest.mock("@/lib/observability", () => ({ reportError: jest.fn() }));

import { prepareSessionCall } from "@/lib/video";
import type { CurrentUser } from "@/lib/auth";

const ROOM_URL = "https://whetstone.daily.co/abc123";
const SCHEDULED_AT = new Date("2026-09-01T03:00:00.000Z");
const EXPECTED_EXP = Math.floor(SCHEDULED_AT.getTime() / 1000) + 4 * 3600;

const CUSTOMER: CurrentUser = {
  id: "user_customer",
  email: "client@example.com",
  role: "CUSTOMER",
  fullName: null,
  firstName: "Casey",
  lastName: "Client",
  avatarUrl: null,
};
const ADVISOR: CurrentUser = {
  ...CUSTOMER,
  id: "user_advisor",
  role: "ADVISOR",
  firstName: "Avery",
  lastName: "Advisor",
};

const BOOKING = {
  id: "booking_1",
  customer: { userId: CUSTOMER.id },
  advisor: { userId: ADVISOR.id },
};

let fetchMock: jest.Mock;

/** The token request body Daily was sent, parsed. */
function tokenRequest() {
  const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/meeting-tokens"));
  expect(call).toBeDefined();
  return { init: call![1], properties: JSON.parse(call![1].body).properties };
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.DAILY_API_KEY = "test-key";
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

describe("prepareSessionCall", () => {
  it("returns the room together with a meeting token for the joining user", async () => {
    const result = await prepareSessionCall("session_1", CUSTOMER);

    expect(result).toEqual({
      call: {
        roomUrl: ROOM_URL,
        token: "tok_abc",
        bookingId: BOOKING.id,
        scheduledAt: SCHEDULED_AT,
        viewerIsAdvisor: false,
      },
    });
  });

  it("mints the token for the room being joined, scoped to that user", async () => {
    await prepareSessionCall("session_1", CUSTOMER);

    const { init, properties } = tokenRequest();
    expect(init.headers.Authorization).toBe("Bearer test-key");
    expect(properties.room_name).toBe("abc123");
    expect(properties.user_id).toBe(CUSTOMER.id);
    expect(properties.user_name).toBe("Casey Client");
    // Token dies with the room, and Daily removes anyone still in the call.
    expect(properties.exp).toBe(EXPECTED_EXP);
    expect(properties.eject_at_token_exp).toBe(true);
  });

  it("gives owner rights to the advisor and not the client", async () => {
    await prepareSessionCall("session_1", CUSTOMER);
    expect(tokenRequest().properties.is_owner).toBe(false);

    jest.clearAllMocks();
    const result = await prepareSessionCall("session_1", ADVISOR);
    expect(tokenRequest().properties.is_owner).toBe(true);
    expect("call" in result && result.call.viewerIsAdvisor).toBe(true);
  });

  it("creates the room on first join and stores its URL", async () => {
    mockSession.findUnique.mockResolvedValue({
      id: "session_1",
      bookingId: BOOKING.id,
      scheduledAt: SCHEDULED_AT,
      videoCallUrl: null,
    });

    const result = await prepareSessionCall("session_1", CUSTOMER);

    const roomCall = fetchMock.mock.calls.find(([u]) => String(u).endsWith("/v1/rooms"));
    const roomBody = JSON.parse(roomCall![1].body);
    expect(roomBody.privacy).toBe("private");
    expect(roomBody.properties.exp).toBe(EXPECTED_EXP);
    expect(mockSession.update).toHaveBeenCalledWith({
      where: { id: "session_1" },
      data: { videoCallUrl: ROOM_URL },
    });
    expect("call" in result && result.call.token).toBe("tok_abc");
  });

  it("refuses someone who isn't a party on the booking", async () => {
    mockGetAuthorizedBooking.mockResolvedValue(null);

    expect(await prepareSessionCall("session_1", CUSTOMER)).toEqual({ denied: "forbidden" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps ops out of the call even though they can read the thread", async () => {
    await prepareSessionCall("session_1", CUSTOMER);
    // isOps is hard-coded false: reading a thread is not sitting in on a session.
    expect(mockGetAuthorizedBooking).toHaveBeenCalledWith(BOOKING.id, CUSTOMER.id, false);
  });

  it("reports a missing session rather than provisioning a room", async () => {
    mockSession.findUnique.mockResolvedValue(null);

    expect(await prepareSessionCall("nope", CUSTOMER)).toEqual({ denied: "not-found" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("hands back no room at all when the token can't be minted", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      String(url).endsWith("/meeting-tokens")
        ? { ok: false, status: 400, text: async () => "bad request" }
        : { ok: true, json: async () => ({ url: ROOM_URL }) },
    );

    // A room the user can't enter is worse than none — the screen explains instead.
    expect(await prepareSessionCall("session_1", CUSTOMER)).toEqual({ denied: "unavailable" });
  });

  it("treats a missing API key as video being unavailable", async () => {
    delete process.env.DAILY_API_KEY;
    mockSession.findUnique.mockResolvedValue({
      id: "session_1",
      bookingId: BOOKING.id,
      scheduledAt: SCHEDULED_AT,
      videoCallUrl: null,
    });

    expect(await prepareSessionCall("session_1", CUSTOMER)).toEqual({ denied: "unavailable" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
