"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button, Field, Input, Label } from "@/components/ui";
import { signIn, signUp, type AuthFormState } from "@/lib/actions/auth";
import { GoogleButton } from "./GoogleButton";
import { LinkedInButton } from "./LinkedInButton";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";

/**
 * Email + password auth form, shared by login and signup. Uses useFormState so
 * the server action can return an inline error without a full redirect.
 * For signup, `role` is fixed by the page (CUSTOMER or ADVISOR) — OPS is never
 * offered here. Signup adds a live strength meter and a terms gate; the 8-char
 * minimum is still enforced server-side.
 */
export function AuthForm({
  mode,
  role,
  next,
}: {
  mode: "signin" | "signup";
  role?: "CUSTOMER" | "ADVISOR";
  next?: string;
}) {
  const action = mode === "signin" ? signIn : signUp;
  const [state, formAction] = useFormState<AuthFormState, FormData>(action, {});
  const [password, setPassword] = useState("");
  const isSignup = mode === "signup";

  return (
    <div>
      <form action={formAction}>
        {next && <input type="hidden" name="next" value={next} />}
        {isSignup && <input type="hidden" name="role" value={role ?? "CUSTOMER"} />}

        <Field label={isSignup ? "Work email" : "Email"}>
          <Input
            type="email"
            name="email"
            placeholder="you@business.com"
            required
            autoComplete="email"
            autoFocus
          />
        </Field>

        <div className="mb-page-gap">
          <div className="flex items-center justify-between">
            <Label>Password</Label>
            {!isSignup && (
              <a
                href="/forgot-password"
                className="mb-1.5 text-sm font-semibold text-brand-blue hover:underline"
              >
                Forgot?
              </a>
            )}
          </div>
          <Input
            type="password"
            name="password"
            required
            minLength={isSignup ? 8 : undefined}
            autoComplete={isSignup ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {isSignup && <PasswordStrengthMeter password={password} />}
        </div>

        {isSignup && (
          <label className="mb-page-gap flex cursor-pointer items-start gap-2.5 text-sm text-gray-600">
            <input
              type="checkbox"
              name="terms"
              required
              className="mt-0.5 h-[18px] w-[18px] shrink-0 rounded-xs accent-ink"
            />
            <span>
              I agree to the{" "}
              <a href="/terms" target="_blank" className="font-semibold text-brand-blue hover:underline">
                Terms
              </a>{" "}
              and{" "}
              <a href="/privacy" target="_blank" className="font-semibold text-brand-blue hover:underline">
                Privacy Policy
              </a>
              .
            </span>
          </label>
        )}

        {state.error && (
          <p className="mb-page-gap rounded-sm bg-red-100 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}

        <SubmitButton mode={mode} />
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-gray-400">
        <span className="h-px flex-1 bg-gray-200" />
        or
        <span className="h-px flex-1 bg-gray-200" />
      </div>

      <div className="flex flex-col gap-2">
        <GoogleButton next={next} />
        <LinkedInButton next={next} />
      </div>
    </div>
  );
}

function SubmitButton({ mode }: { mode: "signin" | "signup" }) {
  const { pending } = useFormStatus();
  const label = mode === "signin" ? "Sign in" : "Create account";
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "…" : label}
    </Button>
  );
}
