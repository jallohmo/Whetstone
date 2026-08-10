"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { Field, Input, Label } from "@/components/ui";
import { Toggle } from "@/components/ui/Toggle";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { changePassword, type AccountFormState } from "@/lib/actions/account";
import { FormFooter } from "./PersonalInformation";

/**
 * Shared Security card (9c/14c): change password + a two-factor row. Password
 * change is fully wired (verifies the current password server-side); 2FA is
 * scaffolded as a disabled "coming soon" toggle until TOTP enrolment is built.
 */
export function SecuritySettings() {
  const [state, action] = useFormState<AccountFormState, FormData>(changePassword, {});
  const [pw, setPw] = useState("");

  return (
    <div>
      <form action={action}>
        <Field label="Current password">
          <Input type="password" name="currentPassword" required autoComplete="current-password" />
        </Field>
        <div className="mb-page-gap">
          <Label>New password</Label>
          <Input
            type="password"
            name="newPassword"
            required
            minLength={8}
            autoComplete="new-password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          <PasswordStrengthMeter password={pw} />
        </div>
        <Field label="Confirm new password">
          <Input type="password" name="confirmPassword" required autoComplete="new-password" />
        </Field>
        <FormFooter state={state} label="Update password" />
      </form>

      <div className="mt-6 flex items-start justify-between gap-4 border-t border-dashed border-gray-300 pt-6">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-body font-semibold text-ink">Two-factor authentication</p>
            <span className="rounded-pill bg-gray-100 px-2 py-0.5 text-2xs font-semibold text-gray-500">
              Coming soon
            </span>
          </div>
          <p className="mt-0.5 text-sm text-gray-500">
            Require a code from your authenticator app at sign-in.
          </p>
        </div>
        <Toggle aria-label="Two-factor authentication" disabled />
      </div>
    </div>
  );
}
