"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getAuthorizedBooking } from "@/lib/actions/messages";

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
  const exp = Math.floor(session.scheduledAt.getTime() / 1000) + 4 * 3600;
  const res = await fetch("https://api.daily.co/v1/rooms", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ privacy: "private", properties: { exp, enable_prejoin_ui: true } }),
  });
  if (!res.ok) return null;

  const room = (await res.json()) as { url?: string };
  if (!room.url) return null;

  await prisma.session.update({ where: { id: sessionId }, data: { videoCallUrl: room.url } });
  return room.url;
}

/**
 * Screen 8 (A7 / video). Start or join the video call for a session. Only the
 * booking's two parties may join; ops cannot. Redirects to the Daily room.
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
  redirect(url);
}
