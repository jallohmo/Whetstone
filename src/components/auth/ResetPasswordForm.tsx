"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button, Label, Input } from "@/components/ui";
import { updatePassword, type AuthFormState } from "@/lib/actions/auth";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";

/** Step 2 of reset: choose a new password (recovery session already established). */
export function ResetPasswordForm() {
  const [state, formAction] = useFormState<AuthFormState, FormData>(updatePassword, {});
  const [password, setPassword] = useState("");

  return (
    <form action={formAction}>
      <div className="mb-page-gap">
        <Label>New password</Label>
        <Input
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <PasswordStrengthMeter password={password} />
      </div>
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
      {pending ? "Saving…" : "Set new password"}
    </Button>
  );
}
