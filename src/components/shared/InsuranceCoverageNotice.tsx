import { ShieldCheck } from "lucide-react";
import { platformConfig } from "@/lib/platform-config";

/**
 * Used at checkout, booking confirmation, and advisor profile.
 * Pulls live status from config (B4) rather than a hardcoded string, so it can't
 * silently go stale if coverage lapses. At MVP the "integration" is a negotiated
 * blanket policy surfaced through platform-config, not a live API — deliberately.
 */
export function InsuranceCoverageNotice() {
  const { active, statement } = platformConfig.insurance;

  if (!active) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-100 p-4 text-sm text-amber-700">
        <ShieldCheck size={18} className="mt-0.5 shrink-0" />
        <p>Coverage is being confirmed for this session. You won&apos;t be charged until it&apos;s in place.</p>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border border-green-500/30 bg-green-100 p-4 text-sm text-green-700">
      <ShieldCheck size={18} className="mt-0.5 shrink-0" />
      <p>{statement}</p>
    </div>
  );
}
