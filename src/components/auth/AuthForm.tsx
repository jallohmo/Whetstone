"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button, Field, Input } from "@/components/ui";
import { signIn, signUp, type AuthFormState } from "@/lib/actions/auth";

/**
 * Email + password auth form, shared by login and signup. Uses useFormState so
 * the server action can return an inline error without a full redirect.
 * For signup, `role` is fixed by the page (CUSTOMER or ADVISOR) — OPS is never
 * offered here.
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

  return (
    <form action={formAction}>
      {next && <input type="hidden" name="next" value={next} />}
      {mode === "signup" && <input type="hidden" name="role" value={role ?? "CUSTOMER"} />}

      <Field label="Email">
        <Input type="email" name="email" placeholder="you@business.com" required autoComplete="email" />
      </Field>
      <Field
        label="Password"
        hint={mode === "signup" ? "At least 8 characters." : undefined}
      >
        <Input
          type="password"
          name="password"
          required
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
        />
      </Field>

      {state.error && (
        <p className="mb-page-gap rounded-sm bg-red-100 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <SubmitButton mode={mode} />
    </form>
  );
}

function SubmitButton({ mode }: { mode: "signin" | "signup" }) {
  const { pending } = useFormStatus();
  const label = mode === "signin" ? "Sign in" : "Create account";
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "…" : label}
    </Button>
  );
}
