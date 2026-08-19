"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { DailyCall } from "@daily-co/daily-js";

/**
 * The in-app session call (Daily Prebuilt, embedded).
 *
 * Daily's own UI runs in an iframe we mount inside our page, so the call keeps
 * the Whetstone shell around it instead of handing the user off to daily.co.
 * That handover used to be the end of the road for the session: once someone
 * landed on daily.co the app had no idea the call had happened. Here we listen
 * for "left-meeting" and route them onward — the advisor back to the thread
 * where the outcome controls live, the client back to the conversation.
 *
 * The token is a prop, not a query parameter: it stays out of the URL bar,
 * browser history and referrer headers. It's already scoped to this room and
 * this user and expires with the session, but there's no reason to broadcast it.
 */
export function SessionCall({
  roomUrl,
  token,
  bookingId,
  viewerIsAdvisor,
}: {
  roomUrl: string;
  token: string;
  bookingId: string;
  viewerIsAdvisor: boolean;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let frame: DailyCall | null = null;
    let cancelled = false;

    async function start() {
      const DailyIframe = (await import("@daily-co/daily-js")).default;

      // React strict mode mounts effects twice in development, and Daily refuses
      // a second frame while the first is alive. Tear any survivor down first.
      const existing = DailyIframe.getCallInstance();
      if (existing) await existing.destroy();
      if (cancelled || !containerRef.current) return;

      frame = DailyIframe.createFrame(containerRef.current, {
        showLeaveButton: true,
        showFullscreenButton: true,
        iframeStyle: { width: "100%", height: "100%", border: "0" },
      });

      frame.on("left-meeting", () => {
        // Straight back into the flow — the thread carries the completion panel.
        router.push(`/bookings/${bookingId}/messages?callEnded=1`);
        router.refresh();
      });
      frame.on("error", (ev) => {
        setError(ev?.errorMsg ?? "The call ended unexpectedly.");
      });

      try {
        await frame.join({ url: roomUrl, token });
      } catch {
        if (!cancelled) setError("Couldn't connect to the call. Please try again.");
      }
    }

    void start();

    return () => {
      cancelled = true;
      void frame?.destroy();
    };
  }, [roomUrl, token, bookingId, router]);

  return (
    <div className="relative h-[70vh] min-h-[420px] w-full overflow-hidden rounded-lg bg-ink">
      <div ref={containerRef} className="h-full w-full" />
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink/90 p-6 text-center">
          <p className="text-body text-white">{error}</p>
          <button
            type="button"
            onClick={() => router.push(`/bookings/${bookingId}/messages`)}
            className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-ink"
          >
            Back to {viewerIsAdvisor ? "the booking" : "your conversation"}
          </button>
        </div>
      )}
    </div>
  );
}
