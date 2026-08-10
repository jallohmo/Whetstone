"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button, Field, Input } from "@/components/ui";
import { updateProfile, type AccountFormState } from "@/lib/actions/account";

/** Customer "Personal information" card (9c). Email is read-only (login identity). */
export function PersonalInformation({
  fullName,
  email,
  phone,
  businessName,
}: {
  fullName: string | null;
  email: string;
  phone: string | null;
  businessName: string | null;
}) {
  const [state, action] = useFormState<AccountFormState, FormData>(updateProfile, {});

  return (
    <form action={action}>
      <Field label="Full name">
        <Input name="fullName" defaultValue={fullName ?? ""} placeholder="Your name" />
      </Field>
      <Field label="Email" hint="Managed by your login — contact support to change it.">
        <Input defaultValue={email} readOnly disabled className="bg-gray-50 text-gray-500" />
      </Field>
      <Field label="Phone">
        <Input name="phone" type="tel" defaultValue={phone ?? ""} placeholder="Optional" />
      </Field>
      <Field label="Business name">
        <Input name="businessName" defaultValue={businessName ?? ""} placeholder="Optional" />
      </Field>

      <FormFooter state={state} label="Save changes" />
    </form>
  );
}

export function FormFooter({ state, label }: { state: AccountFormState; label: string }) {
  const { pending } = useFormStatus();
  return (
    <div className="mt-1 flex items-center gap-3">
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : label}
      </Button>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      {state.ok && !pending && <p className="text-sm text-green-700">Saved.</p>}
    </div>
  );
}
