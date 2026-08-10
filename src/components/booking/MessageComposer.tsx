"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { ArrowUp } from "lucide-react";
import { Input } from "@/components/ui";
import { sendMessage } from "@/lib/actions/messages";

/** Composer for the message thread — clears the input after a successful send. */
export function MessageComposer({ bookingId }: { bookingId: string }) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      action={async (fd) => {
        await sendMessage(fd);
        ref.current?.reset();
      }}
      className="flex items-center gap-2 border-t border-gray-200 p-3"
    >
      <input type="hidden" name="bookingId" value={bookingId} />
      <Input name="body" placeholder="Write a message…" autoComplete="off" required />
      <SendButton />
    </form>
  );
}

function SendButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label="Send message"
      className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-ink text-white shadow-ink-glow outline-none transition duration-DEFAULT ease-soft hover:-translate-y-px focus-visible:shadow-focus disabled:opacity-50"
    >
      <ArrowUp size={20} strokeWidth={2.5} />
    </button>
  );
}
