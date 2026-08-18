import { prisma } from "@/lib/prisma";
import { displayName, type CurrentUser } from "@/lib/auth";
import { getAuthorizedBooking } from "@/lib/actions/messages";
import { reportError } from "@/lib/observability";

/**
 * Daily.co plumbing for session video calls.
 *
 * Deliberately NOT a "use server" module: nothing here should be reachable as a
 * server action. The call screen (a server component) is the only caller, and it
 * authorizes first — see prepareSessionCall below.
 *
 * Everything is guarded by DAILY_API_KEY. Without it video is simply
 * unavailable rather than erroring, so the rest of the app works.
 */

/** When a session's room — and every token minted for it — stops working. */
export function roomExpiry(scheduledAt: Date): number {
  return Math.floor(scheduledAt.getTime() / 1000) + 4 * 3600;
}

/** The Daily room name from a stored room URL (https://x.daily.co/<name>). */
export function roomNameFromUrl(url: string): string | null {
  try {
    return new URL(url).pathname.replace(/^\//, "") || null;
  } catch {
    return null;
  }
}

/**
 * Provision (or reuse) a Daily room for a session and store its URL on the
 * Session. Rooms are private: the URL alone admits nobody.
 */
async function ensureVideoRoom(sessionId: string): Promise<string | null> {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) return null;
  if (session.videoCallUrl) return session.videoCallUrl;

  const apiKey = process.env.DAILY_API_KEY;
  if (!apiKey) return null;

  const exp = roomExpiry(session.scheduledAt);
  const res = await fetch("https://api.daily.co/v1/rooms", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ privacy: "private", properties: { exp, enable_prejoin_ui: true } }),
  });
  if (!res.ok) {
    reportError("daily: room creation failed", new Error(`${res.status} ${await res.text()}`));
    return null;
  }

  const room = (await res.json()) as { url?: string };
  if (!room.url) return null;

  await prisma.session.update({ where: { id: sessionId }, data: { videoCallUrl: room.url } });
  return room.url;
}

/**
 * Mint a short-lived Daily meeting token for one person joining one room.
 *
 * Rooms are private, so the room URL is not joinable on its own — Daily answers
 * "You are not allowed to join this meeting". The token is what carries our
 * authorization decision (we've already checked the user is a party on the
 * booking) through to Daily, so it is minted per user per join and never stored.
 */
async function createMeetingToken(
  roomUrl: string,
  user: CurrentUser,
  scheduledAt: Date,
  isOwner: boolean,
): Promise<string | null> {
  const apiKey = process.env.DAILY_API_KEY;
  const roomName = roomNameFromUrl(roomUrl);
  if (!apiKey || !roomName) return null;

  const res = await fetch("https://api.daily.co/v1/meeting-tokens", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        user_id: user.id,
        user_name: displayName(user),
        // The advisor hosts the call; the client joins as a participant.
        is_owner: isOwner,
        exp: roomExpiry(scheduledAt),
        eject_at_token_exp: true,
      },
    }),
  });
  if (!res.ok) {
    reportError("daily: meeting token failed", new Error(`${res.status} ${await res.text()}`));
    return null;
  }

  const body = (await res.json()) as { token?: string };
  return body.token ?? null;
}

/** Why a join couldn't happen, for the call screen to explain. */
export type CallDenial = "not-found" | "forbidden" | "unavailable";

export interface SessionCall {
  roomUrl: string;
  /** Scoped to this room and this user, expires with the session. Never stored. */
  token: string;
  bookingId: string;
  scheduledAt: Date;
  viewerIsAdvisor: boolean;
}

/**
 * Authorize a user for a session's call and return everything the client needs
 * to join it in-app: the room and a meeting token minted for them.
 *
 * Only the booking's two parties may join — ops can read a thread but must not
 * sit in on the call, which is why this passes isOps: false.
 */
export async function prepareSessionCall(
  sessionId: string,
  user: CurrentUser,
): Promise<{ call: SessionCall } | { denied: CallDenial }> {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) return { denied: "not-found" };

  const booking = await getAuthorizedBooking(session.bookingId, user.id, false);
  if (!booking) return { denied: "forbidden" };

  const roomUrl = await ensureVideoRoom(sessionId);
  if (!roomUrl) return { denied: "unavailable" };

  const viewerIsAdvisor = booking.advisor.userId === user.id;
  const token = await createMeetingToken(roomUrl, user, session.scheduledAt, viewerIsAdvisor);
  // No token means no join — never hand back a room the user can't actually enter.
  if (!token) return { denied: "unavailable" };

  return {
    call: {
      roomUrl,
      token,
      bookingId: session.bookingId,
      scheduledAt: session.scheduledAt,
      viewerIsAdvisor,
    },
  };
}
