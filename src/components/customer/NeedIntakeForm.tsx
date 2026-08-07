"use client";

import { useState } from "react";
import { Button, Field, Input, Textarea } from "@/components/ui";

export interface TaxonomyOption {
  id: string;
  name: string;
  children: { id: string; name: string }[];
}

/**
 * Screen 2 / NeedIntakeForm (A2). Structured taxonomy selector (industry ->
 * sub-specialty), problem area, description, timing. Should feel like "ask a
 * question", not "fill out an application". No account required to post — the
 * need is a guest need until booking (A2 friction-reduction decision).
 *
 * Options come from the IndustryTaxonomy table, passed in by the server page —
 * never hardcoded, so the taxonomy can extend without a redeploy.
 */
export function NeedIntakeForm({ industries }: { industries: TaxonomyOption[] }) {
  const [industryId, setIndustryId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const subSpecialties =
    industries.find((i) => i.id === industryId)?.children ?? [];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    // TODO(build-time): POST to a Server Action that creates a guest Need and
    // routes to /needs/:needId/matches. Endpoint contract is deferred per handover.
    setTimeout(() => setSubmitting(false), 600);
  }

  return (
    <form onSubmit={onSubmit}>
      <Field label="What kind of business do you run?" hint="Pick the closest industry — you can refine below.">
        <select
          value={industryId}
          onChange={(e) => setIndustryId(e.target.value)}
          required
          className="w-full rounded-sm border border-gray-200 bg-white px-3 py-2.5 text-body text-ink outline-none focus:border-ink"
        >
          <option value="">Select an industry…</option>
          {industries.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
      </Field>

      {subSpecialties.length > 0 && (
        <Field label="Anything more specific?" hint="Optional — helps us match the right person.">
          <select
            name="subSpecialtyId"
            className="w-full rounded-sm border border-gray-200 bg-white px-3 py-2.5 text-body text-ink outline-none focus:border-ink"
          >
            <option value="">No preference</option>
            {subSpecialties.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field label="What's the problem area?" hint="e.g. pricing, cash flow, compliance, a bottleneck, a transition.">
        <Input name="problemArea" placeholder="In a few words…" required />
      </Field>

      <Field label="Tell us what's actually going on" hint="Plain language is fine. The more real, the better the match.">
        <Textarea name="description" rows={5} placeholder="Describe the situation…" required />
      </Field>

      <Button type="submit" disabled={submitting}>
        {submitting ? "Finding advisors…" : "See who can help"}
      </Button>
      <p className="mt-3 text-sm text-gray-500">
        No account needed yet — you only sign up when you decide to book.
      </p>
    </form>
  );
}
