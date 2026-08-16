"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { createNeed } from "@/lib/actions/needs";

export interface TaxonomyOption {
  id: string;
  name: string;
  children: { id: string; name: string }[];
}

const selectClass =
  "w-full appearance-none rounded-sm border border-gray-200 bg-white px-3 py-2.5 pr-10 text-body text-ink outline-none transition duration-DEFAULT ease-soft focus:border-brand-blue focus:shadow-focus";

function SelectShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <ChevronDown
        size={18}
        strokeWidth={2}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
      />
    </div>
  );
}

/**
 * Screen 2 / NeedIntakeForm (A2). Structured taxonomy selector (industry ->
 * sub-specialty), problem area, description. Feels like "ask a question", not
 * "fill out an application". Reached only by a signed-in client (middleware gates
 * /needs/*), so the need is owned from creation. Options come from
 * IndustryTaxonomy (never hardcoded); submits to the createNeed server action,
 * which creates the Need and routes to the matches view.
 *
 * `defaultBusinessName` is the client's existing profile name when they have one,
 * so returning clients see it prefilled rather than being asked again.
 */
export function NeedIntakeForm({
  industries,
  defaultBusinessName,
}: {
  industries: TaxonomyOption[];
  defaultBusinessName?: string | null;
}) {
  const [industryId, setIndustryId] = useState("");
  const subSpecialties =
    industries.find((i) => i.id === industryId)?.children ?? [];

  return (
    <form action={createNeed}>
      <Field label="What's your business called?" hint="So your advisor knows who they're helping.">
        <Input
          name="businessName"
          placeholder="Your business name"
          defaultValue={defaultBusinessName ?? ""}
        />
      </Field>

      <Field label="What kind of business do you run?" hint="Pick the closest industry — you can refine below.">
        <SelectShell>
          <select
            name="industryId"
            value={industryId}
            onChange={(e) => setIndustryId(e.target.value)}
            required
            className={selectClass}
          >
            <option value="">Select an industry…</option>
            {industries.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </SelectShell>
      </Field>

      {subSpecialties.length > 0 && (
        <Field label="Anything more specific?" hint="Optional — helps us match the right person.">
          <SelectShell>
            <select name="subSpecialtyId" className={selectClass}>
              <option value="">No preference</option>
              {subSpecialties.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </SelectShell>
        </Field>
      )}

      <Field label="What's the problem area?" hint="e.g. pricing, cash flow, compliance, a bottleneck, a transition.">
        <Input name="problemArea" placeholder="In a few words…" required />
      </Field>

      <Field label="Tell us what's actually going on" hint="Plain language is fine. The more real, the better the match.">
        <Textarea name="description" rows={5} placeholder="Describe the situation…" required />
      </Field>

      <div className="mt-2 flex flex-wrap items-center gap-4">
        <SubmitButton />
        <p className="text-sm text-gray-500">
          Our team reads every one of these by hand — we&apos;ll email you the moment
          your shortlist is ready.
        </p>
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Finding advisors…" : "See who can help"}
      {!pending && <ArrowRight size={16} strokeWidth={2} />}
    </Button>
  );
}
