"use client";

import { useFormState } from "react-dom";
import { Field, Input, Textarea, Label } from "@/components/ui";
import { PillToggle } from "@/components/ui/selection";
import { updateAdvisorProfile, type AccountFormState } from "@/lib/actions/account";
import { FormFooter } from "./PersonalInformation";

interface TaxonomyGroup {
  id: string;
  name: string;
  children: { id: string; name: string }[];
}

/**
 * Advisor "Public profile" card (14c). Edits the record shown on the public
 * profile (screen 4) and match cards; saving does NOT reset verification. Session
 * rate is read-only (packages are platform-level, not per-advisor at MVP).
 */
export function PublicProfileForm({
  headline,
  bio,
  yearsExperience,
  industries,
  selectedIds,
  otherSpecialties,
  sessionRateLabel,
}: {
  headline: string | null;
  bio: string;
  yearsExperience: number;
  industries: TaxonomyGroup[];
  selectedIds: string[];
  otherSpecialties: string | null;
  sessionRateLabel: string | null;
}) {
  const [state, action] = useFormState<AccountFormState, FormData>(updateAdvisorProfile, {});
  const selected = new Set(selectedIds);

  return (
    <form action={action}>
      <Field label="Headline" hint="The one line clients see first.">
        <Input name="headline" defaultValue={headline ?? ""} maxLength={160} placeholder="e.g. Retired CFO — 25 years on cash flow and lending." />
      </Field>
      <Field label="About">
        <Textarea name="bio" rows={5} defaultValue={bio} required />
      </Field>
      <Field label="Years of experience">
        <Input name="yearsExperience" type="number" min={0} max={70} defaultValue={yearsExperience} className="max-w-[140px]" />
      </Field>

      <div className="mb-page-gap">
        <Label>Specialties</Label>
        <div className="mt-1 flex flex-col gap-4">
          {industries.map((ind) => (
            <fieldset key={ind.id}>
              <legend className="mb-2 text-2xs font-semibold uppercase tracking-[0.1em] text-gray-500">
                {ind.name}
              </legend>
              <div className="flex flex-wrap gap-2">
                {ind.children.map((c) => (
                  <PillToggle key={c.id} name="specialtyIds" value={c.id} defaultChecked={selected.has(c.id)}>
                    {c.name}
                  </PillToggle>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      </div>

      <Field label="Something not listed?" hint="Any industry or capability the list above is missing — our team reviews these.">
        <Textarea name="otherSpecialties" rows={2} defaultValue={otherSpecialties ?? ""} />
      </Field>

      {sessionRateLabel && (
        <Field label="Session rate" hint="Set by Whetstone's standard package pricing.">
          <Input defaultValue={sessionRateLabel} readOnly disabled className="max-w-[260px] bg-gray-50 text-gray-500" />
        </Field>
      )}

      <FormFooter state={state} label="Save profile" />
    </form>
  );
}
