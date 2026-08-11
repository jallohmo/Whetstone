"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui";
import { deleteAccount } from "@/lib/actions/account";

/**
 * Customer "Delete account" control (9c). Irreversible, so it requires typing
 * DELETE to confirm. On success the server action signs out and redirects; on a
 * blocked case (active/historical bookings) it returns a reason.
 */
export function CustomerDangerZone() {
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const armed = confirm.trim().toUpperCase() === "DELETE";

  function onDelete() {
    if (!armed) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteAccount();
      if (res?.error) setError(res.error);
      // success path redirects server-side.
    });
  }

  return (
    <div>
      <p className="text-body text-gray-600">
        Permanently delete your account and personal data. This can&apos;t be undone.
      </p>
      <div className="mt-4 max-w-sm">
        <label className="mb-1.5 block text-sm font-semibold text-ink">
          Type <span className="ws-mono">DELETE</span> to confirm
        </label>
        <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="DELETE" />
      </div>
      <button
        type="button"
        onClick={onDelete}
        disabled={!armed || pending}
        className="mt-4 inline-flex items-center rounded-md border border-red-500/50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100/50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Delete account"}
      </button>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
