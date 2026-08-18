"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { CalendarClock, ChevronDown, Plus, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui";
import {
  addAvailabilitySlot,
  type AvailabilityFormState,
} from "@/lib/actions/availability";

/**
 * Screen 12 — the add-a-slot form, split out of the page so it can be a client
 * component and use useFormState (same pattern as AuthForm).
 *
 * Why it exists: the action used to THROW on a past date, and a thrown error in a
 * server action is an unhandled exception, not a message. With no error boundary
 * in this segment, an advisor picking yesterday got Next's generic crash page and
 * lost the rest of the form. Now the same mistake comes back as a sentence above
 * the field, with everything they typed still there.
 *
 * The `min` attribute stops most of these before a round trip, but it is a
 * convenience, not the guard: it is trivially bypassed, and browsers vary in how
 * strictly they enforce it. The server check stays authoritative.
 */
export function AvailabilityForm() {
  const [state, formAction] = useFormState<AvailabilityFormState, FormData>(
    addAvailabilitySlot,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [min, setMin] = useState<string | undefined>(undefined);

  // Computed on the client, because "now" for the advisor is their clock, not the
  // server's. Set after mount so the server and first client render agree.
  useEffect(() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
    setMin(local.toISOString().slice(0, 16));
  }, []);

  // Clear the fields only once a slot has actually been added, so a rejected
  // submission keeps what they typed and they can adjust it.
  useEffect(() => {
    if (state.added) formRef.current?.reset();
  }, [state.added]);

  return (
    <>
      {state.error && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-3 rounded-lg border border-red-500/40 bg-red-50 p-4 text-sm text-red-700"
        >
          <TriangleAlert size={18} className="mt-0.5 shrink-0" strokeWidth={2} />
          <p>{state.error}</p>
        </div>
      )}

      <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-3">
        <div>
          <label
            htmlFor="startsAt"
            className="mb-1.5 block text-sm font-semibold text-ink"
          >
            Date &amp; start time
          </label>
          <div className="relative">
            <CalendarClock
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              id="startsAt"
              type="datetime-local"
              name="startsAt"
              required
              min={min}
              aria-invalid={state.error ? true : undefined}
              className="rounded-sm border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-body text-ink outline-none transition duration-DEFAULT ease-soft focus:border-brand-blue focus:shadow-focus"
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="durationMin"
            className="mb-1.5 block text-sm font-semibold text-ink"
          >
            Length
          </label>
          <div className="relative">
            <select
              id="durationMin"
              name="durationMin"
              defaultValue="60"
              className="w-full appearance-none rounded-sm border border-gray-200 bg-white py-2.5 pl-3 pr-10 text-body text-ink outline-none transition duration-DEFAULT ease-soft focus:border-brand-blue focus:shadow-focus"
            >
              <option value="30">30 minutes</option>
              <option value="60">60 minutes</option>
              <option value="90">90 minutes</option>
            </select>
            <ChevronDown
              size={18}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
          </div>
        </div>
        <AddButton />
      </form>
    </>
  );
}

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <Plus size={16} strokeWidth={2} />
      {pending ? "Adding…" : "Add slot"}
    </Button>
  );
}
