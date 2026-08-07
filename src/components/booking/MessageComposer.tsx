"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { Button, Input } from "@/components/ui";
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
      className="flex gap-2 border-t border-gray-200 p-3"
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
    <Button type="submit" disabled={pending}>
      {pending ? "…" : "Send"}
    </Button>
  );
}
