"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { Field, Input, Label } from "@/components/ui";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { changePassword, type AccountFormState } from "@/lib/actions/account";
import { FormFooter } from "./PersonalInformation";
import { TwoFactorSetting } from "./TwoFactorSetting";

/**
 * Shared Security card (9c/14c): change password + real two-factor (TOTP) via
 * Supabase MFA. Password change verifies the current password server-side; the
 * two-factor control enrols/verifies/disables a TOTP factor.
 */
export function SecuritySettings({
  twoFactorEnabled,
  twoFactorFactorId,
}: {
  twoFactorEnabled: boolean;
  twoFactorFactorId: string | null;
}) {
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

      <div className="mt-6">
        <TwoFactorSetting enabled={twoFactorEnabled} factorId={twoFactorFactorId} />
      </div>
    </div>
  );
}
