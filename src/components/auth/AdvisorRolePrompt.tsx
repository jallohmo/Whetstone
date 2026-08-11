"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui";
import { becomeAdvisor } from "@/lib/actions/auth";

/**
 * Post-OAuth role step (screen 10). Shown when a signed-in CUSTOMER lands on the
 * advisor application — typically after signing in with Google, which always
 * creates a customer account. One click switches them to the ADVISOR role, then
 * the page re-renders into the application form.
 */
export function AdvisorRolePrompt() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onContinue() {
    setError(null);
    startTransition(async () => {
      const res = await becomeAdvisor();
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div>
      <Button onClick={onContinue} disabled={pending}>
        {pending ? "Setting up…" : "Continue as an advisor"}
        {!pending && <ArrowRight size={16} strokeWidth={2} />}
      </Button>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
