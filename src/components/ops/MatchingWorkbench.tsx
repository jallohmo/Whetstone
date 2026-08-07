"use client";

import { useState } from "react";

/**
 * Screen 16 / MatchingWorkbench (A3, C1). Filterable advisor list against an open
 * need. The MatchDecisionLog is built INTO the matching action — advisors
 * considered + advisor chosen + reason are captured inline, never an optional
 * field added afterward. This logging is a Phase 2/3 data-moat dependency, so it
 * is deliberately not skippable: you can't confirm a match without a reason.
 */
interface Candidate {
  id: string;
  name: string;
  headline: string;
  specialties: string[];
}

export function MatchingWorkbench({
  needId,
  candidates,
}: {
  needId: string;
  candidates: Candidate[];
}) {
  const [considered, setConsidered] = useState<string[]>([]);
  const [chosen, setChosen] = useState<string>("");
  const [reason, setReason] = useState("");

  const toggleConsidered = (id: string) =>
    setConsidered((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const canConfirm = chosen && reason.trim().length > 0 && considered.includes(chosen);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
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
            {candidates.map((c) => (
              <tr key={c.id} className="border-b border-gray-150 hover:bg-gray-50">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={considered.includes(c.id)}
                    onChange={() => toggleConsidered(c.id)}
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
                    name="chosen"
                    checked={chosen === c.id}
                    onChange={() => {
                      setChosen(c.id);
                      if (!considered.includes(c.id)) toggleConsidered(c.id);
                    }}
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
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          placeholder="Reason for the match — required."
          className="mt-1 w-full rounded-sm border border-gray-300 px-2 py-1.5 text-[13px] outline-none focus:border-ink"
        />
        <button
          type="button"
          disabled={!canConfirm}
          onClick={() => {
            // TODO(build-time): Server Action writes MatchDecision (advisorsConsidered,
            // advisorChosenId, reason, decidedBy) + sets Need.status = "matched".
          }}
          className="mt-3 w-full rounded-sm bg-ink px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-40"
        >
          Confirm match for {needId}
        </button>
      </aside>
    </div>
  );
}
