/**
 * Danger zone (9c/14c) — scaffolded. Account deletion / advisor deactivation need
 * a service-role admin flow and a hard confirmation, which is out of this pass.
 * Rendered as a clearly-disabled "coming soon" control so it can't be triggered
 * before it's real.
 */
export function DangerZone({ role }: { role: "customer" | "advisor" }) {
  const isAdvisor = role === "advisor";
  return (
    <div>
      <p className="text-body text-gray-600">
        {isAdvisor
          ? "Deactivate your advisor profile. Existing bookings must be completed first."
          : "Permanently delete your account and personal data. This can't be undone."}
      </p>
      <button
        type="button"
        disabled
        className="mt-4 inline-flex cursor-not-allowed items-center rounded-md border border-red-500/50 px-4 py-2.5 text-sm font-semibold text-red-700 opacity-60"
      >
        {isAdvisor ? "Deactivate account" : "Delete account"}
      </button>
      <p className="mt-2 text-xs text-gray-400">
        Coming soon — for now, contact support to {isAdvisor ? "deactivate" : "delete"} your account.
      </p>
    </div>
  );
}
