"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { createNeed } from "@/lib/actions/needs";

export interface TaxonomyOption {
  id: string;
  name: string;
  children: { id: string; name: string }[];
}

/**
 * Screen 2 / NeedIntakeForm (A2). Structured taxonomy selector (industry ->
 * sub-specialty), problem area, description. Feels like "ask a question", not
 * "fill out an application". No account required — the need is a guest need until
 * booking. Options come from IndustryTaxonomy (never hardcoded); submits to the
 * createNeed server action, which creates the Need and routes to the matches view.
 */
export function NeedIntakeForm({ industries }: { industries: TaxonomyOption[] }) {
  const [industryId, setIndustryId] = useState("");
  const subSpecialties =
    industries.find((i) => i.id === industryId)?.children ?? [];

  return (
    <form action={createNeed}>
      <Field label="What kind of business do you run?" hint="Pick the closest industry — you can refine below.">
        <select
          name="industryId"
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

      <SubmitButton />
      <p className="mt-3 text-sm text-gray-500">
        No account needed yet — you only sign up when you decide to book.
      </p>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Finding advisors…" : "See who can help"}
    </Button>
  );
}
