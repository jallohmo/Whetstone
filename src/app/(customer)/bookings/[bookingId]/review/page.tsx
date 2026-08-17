import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { PageHeader, Card } from "@/components/ui";
import { PostSessionSurvey } from "@/components/customer/PostSessionSurvey";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Screen 9 — Post-session review/survey (B3, C2). Booking customer only.
export const dynamic = "force-dynamic";

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: { bookingId: string };
  searchParams: { accepted?: string; thanks?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/bookings/${params.bookingId}/review`);

  const booking = await prisma.booking.findUnique({
    where: { id: params.bookingId },
    include: { customer: { select: { userId: true } }, review: true },
  });
  if (!booking) redirect("/");
  if (booking.customer.userId !== user.id) redirect("/");

  // Feedback is for finished work only. A booking still waiting on this client's
  // acceptance goes to the confirm screen instead — that's the step that matters.
  if (booking.status === "awaiting_confirmation") {
    redirect(`/bookings/${params.bookingId}/confirm-completion`);
  }
  if (booking.status !== "completed") {
    redirect(`/bookings/${params.bookingId}/messages`);
  }

  // Already reviewed -> thank-you, no double submit.
  if (booking.review) {
    return (
      <div className="mx-auto max-w-lg">
        <PageHeader title="Thanks for the feedback" />
        <Card>
          <p className="flex items-center gap-2 text-body-lg text-ink">
            <CheckCircle2 className="text-green-500" size={20} />
            Your review is in — it helps the next person get matched well.
          </p>
          <Link href="/" className="mt-4 inline-flex text-sm font-semibold text-brand-blue hover:underline">
            Back home
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      {searchParams.accepted && (
        <div className="mb-page-gap flex items-start gap-2 rounded-lg border border-green-500/40 bg-green-100 p-4 text-sm text-green-700">
          <CheckCircle2 size={18} strokeWidth={2} className="mt-px shrink-0" />
          <span>
            Confirmed — the payment has been released to your advisor. Nothing else is needed from
            you; the feedback below is optional.
          </span>
        </div>
      )}
      <PageHeader title="How did it go?" subtitle="Takes 20 seconds. It helps the next person get matched to the right advisor." />
      <Card>
        <PostSessionSurvey bookingId={params.bookingId} />
      </Card>
    </div>
  );
}
