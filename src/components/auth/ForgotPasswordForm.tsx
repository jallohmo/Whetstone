"use client";

import { useFormState, useFormStatus } from "react-dom";
import { MailCheck } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";
import { requestPasswordReset, type ResetRequestState } from "@/lib/actions/auth";

/** Step 1 of reset: request a recovery email. */
export function ForgotPasswordForm() {
  const [state, formAction] = useFormState<ResetRequestState, FormData>(
    requestPasswordReset,
    {},
  );

  if (state.sent) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-green-500/30 bg-green-100 p-4 text-sm text-green-700">
        <MailCheck size={18} className="mt-0.5 shrink-0" strokeWidth={2} />
        <p>
          If an account exists for that email, we&apos;ve sent a link to reset your
          password. Check your inbox — the link opens a page to choose a new one.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction}>
      <Field label="Email">
        <Input
          type="email"
          name="email"
          placeholder="you@business.com"
          required
          autoComplete="email"
          autoFocus
        />
      </Field>
      {state.error && (
        <p className="mb-page-gap rounded-sm bg-red-100 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Sending…" : "Send reset link"}
    </Button>
  );
}
