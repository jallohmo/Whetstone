"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, displayName, type CurrentUser } from "@/lib/auth";
import { getAuthorizedBooking } from "@/lib/actions/messages";
import { reportError } from "@/lib/observability";

/** When a session's room (and the tokens for it) stop working. */
function roomExpiry(scheduledAt: Date): number {
  return Math.floor(scheduledAt.getTime() / 1000) + 4 * 3600;
}

/** The Daily room name from a stored room URL (https://x.daily.co/<name>). */
function roomNameFromUrl(url: string): string | null {
  try {
    return new URL(url).pathname.replace(/^\//, "") || null;
  } catch {
    return null;
  }
}

/**
 * Provision (or reuse) a Daily.co room for a session and store its URL on the
 * Session. Guarded by DAILY_API_KEY — if it's not configured, video is simply
 * unavailable (returns null) rather than erroring, so the rest of the app works.
 */
async function ensureVideoRoom(sessionId: string): Promise<string | null> {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) return null;
  if (session.videoCallUrl) return session.videoCallUrl;

  const apiKey = process.env.DAILY_API_KEY;
  if (!apiKey) return null;

  // Room expires a few hours after the scheduled time.
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
 * Rooms are created with privacy "private", so the bare room URL is not
 * joinable on its own — Daily answers "You are not allowed to join this
 * meeting". The token is what carries our authorization decision (we've already
 * checked the user is a party on the booking) through to Daily, so it is minted
 * per user per join and never stored.
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

/**
 * Screen 8 (A7 / video). Start or join the video call for a session. Only the
 * booking's two parties may join; ops cannot. Redirects to the Daily room with a
 * meeting token for this user.
 */
export async function startVideoCall(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Sign in to join the call.");

  const sessionId = String(formData.get("sessionId") ?? "");
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error("Session not found.");

  const booking = await getAuthorizedBooking(session.bookingId, user.id, false);
  if (!booking) throw new Error("You don't have access to this call.");

  const url = await ensureVideoRoom(sessionId);
  if (!url) throw new Error("Video isn't available yet. Please try again shortly.");

  const token = await createMeetingToken(
    url,
    user,
    session.scheduledAt,
    booking.advisor.userId === user.id,
  );
  if (!token) throw new Error("Couldn't open the call. Please try again shortly.");

  redirect(`${url}?t=${encodeURIComponent(token)}`);
}
