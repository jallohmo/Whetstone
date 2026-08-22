import { ClipboardList, FileQuestion } from "lucide-react";
import { Card } from "@/components/ui";
import { IndustryTag } from "@/components/shared/IndustryTag";
import { BoundedScopeSummary } from "@/components/shared/BoundedScopeSummary";

/**
 * The background an advisor needs before they join a session: what the client
 * said they wanted help with, and what this booking was actually sold as.
 *
 * The booking thread used to open straight onto an empty message list — no
 * challenge, no scope, no price — so an advisor arriving from their inbox had
 * to remember the brief or go hunting for it. This puts it at the top of the
 * screen they work from.
 *
 * The need is the BOOKING's need (Booking.needId), not "the client's most recent
 * need". Those are the same thing right up until the client posts a second
 * challenge, after which the second reading quietly shows every advisor the same
 * latest brief no matter what they were booked for.
 *
 * Both parties see it. For the advisor it is preparation; for the client it is
 * a reminder of what they asked for and a chance to notice it is wrong while
 * there is still time to say so.
 */
export interface ClientBrief {
  problemArea: string;
  description: string;
  industryName: string;
}

export function ClientBriefPanel({
  brief,
  viewerIsAdvisor,
  sessionCount,
  scopeDescription,
  priceCents,
  currency,
}: {
  brief: ClientBrief | null;
  viewerIsAdvisor: boolean;
  sessionCount: number;
  scopeDescription: string;
  priceCents: number;
  currency: string;
}) {
  return (
    <Card className="mb-page-gap">
      <div className="flex items-center gap-2">
        {brief ? (
          <ClipboardList size={18} strokeWidth={2} className="shrink-0 text-brand-blue" />
        ) : (
          <FileQuestion size={18} strokeWidth={2} className="shrink-0 text-gray-400" />
        )}
        <p className="text-2xs font-semibold uppercase tracking-wide text-gray-500">
          {viewerIsAdvisor ? "The challenge" : "What you asked for"}
        </p>
        {brief && <span className="ml-auto"><IndustryTag name={brief.industryName} /></span>}
      </div>

      {brief ? (
        <>
          <p className="mt-3 text-h3 text-ink">{brief.problemArea}</p>
          <p className="mt-1 whitespace-pre-line text-body text-gray-600">{brief.description}</p>
        </>
      ) : (
        /* No need attached — the client booked directly rather than posting a
           challenge. Saying so beats dressing the package's stock scope line up
           as if the client had written it, which is what the inbox used to do. */
        <p className="mt-3 text-body text-gray-600">
          {viewerIsAdvisor
            ? "This client booked directly without posting a challenge, so there's no brief to read. Worth asking what they're after in the thread below before the session."
            : "You booked directly without posting a challenge. Add any background in the thread below so your advisor can prepare."}
        </p>
      )}

      <div className="mt-5 border-t border-dashed border-gray-300 pt-5">
        <BoundedScopeSummary
          sessionCount={sessionCount}
          scopeDescription={scopeDescription}
          priceCents={priceCents}
          currency={currency}
        />
      </div>
    </Card>
  );
}
