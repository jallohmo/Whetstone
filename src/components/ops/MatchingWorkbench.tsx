"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { createMatchDecision, sendShortlistToClient } from "@/lib/actions/matches";

/**
 * Screen 16 / MatchingWorkbench (A3, C1). Filterable advisor list against an open
 * need. The MatchDecisionLog is built INTO the matching action — advisorsConsidered
 * + advisorChosenId + reason are captured inline and submitted together via the
 * createMatchDecision server action. This logging is a Phase 2/3 data-moat
 * dependency, so it is deliberately NOT skippable: the confirm button stays
 * disabled until a chosen advisor (auto-added to "considered") and a reason exist.
 *
 * Two-step by design: "Add to shortlist" records one decision and comes straight
 * back here so ops can add the next advisor; "Send to client" is the separate,
 * explicit release that flips the need to matched and emails the client once.
 * Both buttons submit this one form — the second overrides the action via
 * formAction, and only needId is read from it.
 */
interface Candidate {
  id: string;
  name: string;
  headline: string;
  specialties: string[];
}

export interface ShortlistEntry {
  advisorId: string;
  name: string;
}

export function MatchingWorkbench({
  needId,
  candidates,
  shortlist,
  released,
}: {
  needId: string;
  candidates: Candidate[];
  shortlist: ShortlistEntry[];
  released: boolean;
}) {
  const [considered, setConsidered] = useState<string[]>([]);
  const [chosen, setChosen] = useState<string>("");
  const [reason, setReason] = useState("");

  const toggleConsidered = (id: string) =>
    setConsidered((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const canConfirm = Boolean(chosen) && reason.trim().length > 0;

  return (
    <form action={createMatchDecision} className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <input type="hidden" name="needId" value={needId} />
      <input type="hidden" name="advisorChosenId" value={chosen} />
      {/* Considered ids are submitted as repeated fields; the chosen id is force-added server-side too. */}
      {considered.map((id) => (
        <input key={id} type="hidden" name="advisorsConsidered" value={id} />
      ))}

      <div className="overflow-hidden rounded-md border border-gray-300 bg-white">
        <table className="w-full">
          <thead className="border-b border-gray-300 bg-gray-50 text-left text-2xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-3 py-2 font-semibold">Considered</th>
              <th className="px-3 py-2 font-semibold">Advisor</th>
              <th className="px-3 py-2 font-semibold">Specialties</th>
              <th className="px-3 py-2 font-semibold">Choose</th>
            </tr>
          </thead>
          <tbody>
            {candidates.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-gray-500">
                  No verified advisors available yet.
                </td>
              </tr>
            )}
            {candidates.map((c) => (
              <tr key={c.id} className="border-b border-gray-150 hover:bg-gray-50">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={considered.includes(c.id)}
                    onChange={() => toggleConsidered(c.id)}
                    aria-label={`Considered ${c.name}`}
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="font-medium text-ink">{c.name}</div>
                  <div className="text-gray-500">{c.headline}</div>
                </td>
                <td className="px-3 py-2 text-gray-500">{c.specialties.join(", ")}</td>
                <td className="px-3 py-2">
                  <input
                    type="radio"
                    name="chosen-ui"
                    checked={chosen === c.id}
                    onChange={() => {
                      setChosen(c.id);
                      if (!considered.includes(c.id)) toggleConsidered(c.id);
                    }}
                    aria-label={`Choose ${c.name}`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MatchDecisionLog — inline, mandatory */}
      <aside className="rounded-md border border-gray-300 bg-white p-3">
        <h3 className="text-sm font-bold text-ink">Match decision</h3>
        <p className="mt-1 text-2xs text-gray-500">
          Considered {considered.length} · this is logged and can&apos;t be skipped.
        </p>
        <label className="mt-3 block text-2xs font-semibold uppercase text-gray-500">
          Why this advisor?
        </label>
        <textarea
          name="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          placeholder="Reason for the match — required."
          className="mt-1 w-full rounded-sm border border-gray-300 px-2 py-1.5 text-[13px] outline-none focus:border-ink"
        />
        <AddButton disabled={!canConfirm} />

        {/* Release step — what the client actually sees. */}
        <div className="mt-4 border-t border-dashed border-gray-300 pt-3">
          <h4 className="text-2xs font-semibold uppercase text-gray-500">
            Shortlist ({shortlist.length})
          </h4>
          {shortlist.length === 0 ? (
            <p className="mt-1 text-2xs text-gray-500">
              Nobody added yet. The client sees the waiting state.
            </p>
          ) : (
            <ul className="mt-1.5 flex flex-col gap-1">
              {shortlist.map((s) => (
                <li key={s.advisorId} className="text-[13px] text-ink">
                  {s.name}
                </li>
              ))}
            </ul>
          )}

          {released ? (
            <p className="mt-3 rounded-sm bg-green-50 px-2 py-1.5 text-2xs font-semibold text-green-700">
              Sent to the client.
            </p>
          ) : (
            <>
              <SendButton disabled={shortlist.length === 0} />
              <p className="mt-1.5 text-2xs text-gray-500">
                Releases the shortlist and emails the client — once.
              </p>
            </>
          )}
        </div>
      </aside>
    </form>
  );
}

function AddButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="mt-3 w-full rounded-sm bg-ink px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-40"
    >
      {pending ? "Saving…" : "Add to shortlist"}
    </button>
  );
}

function SendButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      formAction={sendShortlistToClient}
      disabled={disabled || pending}
      className="mt-3 w-full rounded-sm border border-ink px-3 py-2 text-[13px] font-semibold text-ink disabled:opacity-40"
    >
      {pending ? "Working…" : "Send to client"}
    </button>
  );
}
