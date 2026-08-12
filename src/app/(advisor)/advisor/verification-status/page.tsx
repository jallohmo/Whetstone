import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, Check, Clock, Search } from "lucide-react";
import { PageHeader, Card } from "@/components/ui";
import { VerificationBadge } from "@/components/shared/VerificationBadge";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/cn";

// Screen 11 — Verification status view. Reads the signed-in advisor's real status.
// Plain-language copy, never the raw enum. Application-level state, not an auth gate.
export const dynamic = "force-dynamic";

const COPY: Record<string, string> = {
  PENDING:
    "We're reviewing your application. This usually takes a few days — we'll email you the moment there's news. You don't need to do anything right now.",
  VERIFIED:
    "You're verified. Your profile is live and you can start taking bookings. Set your availability so clients can book you.",
  NEEDS_MORE_INFO:
    "We need a little more from you before we can verify you. Add the missing details and resubmit.",
  REJECTED:
    "We weren't able to verify your application this time. Your email has the details.",
};

type NodeState = "done" | "current" | "upcoming";

export default async function VerificationStatusPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/advisor/verification-status");

  const profile = await prisma.advisorProfile.findUnique({
    where: { userId: user.id },
    select: { verificationStatus: true, specialtyTags: { select: { name: true } } },
  });

  // Advisor account with no profile yet -> send them to the application.
  if (!profile) redirect("/advisor/apply");

  const status = profile.verificationStatus;
  const reviewState: NodeState = status === "VERIFIED" ? "done" : "current";
  const liveState: NodeState = status === "VERIFIED" ? "done" : "upcoming";

  return (
    <div>
      <PageHeader title="Your verification" />
      <Card>
        <div className="flex items-start gap-4">
          <span className="inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            {status === "VERIFIED" ? <BadgeCheck size={26} /> : <Clock size={26} />}
          </span>
          <div>
            <VerificationBadge status={status} />
            <p className="mt-3 text-body-lg text-gray-700">{COPY[status]}</p>
          </div>
        </div>

        <div className="my-6 border-t border-dashed border-gray-300" />

        {/* Vertical timeline */}
        <ol className="flex flex-col">
          <TimelineNode
            state="done"
            icon={<Check size={16} strokeWidth={3} />}
            title="Application submitted"
            sub="We've got your profile and documents."
            connector
          />
          <TimelineNode
            state={reviewState}
            icon={<Search size={16} strokeWidth={2.5} />}
            title="Under review"
            sub="Our team is checking your credentials and references."
            connector
          />
          <TimelineNode
            state={liveState}
            icon={<BadgeCheck size={16} strokeWidth={2.5} />}
            title="Verified & live"
            sub="Your profile goes live and you can take bookings."
          />
        </ol>

        {status === "NEEDS_MORE_INFO" && (
          <Link
            href="/advisor/apply"
            className="mt-6 inline-flex rounded-md bg-ink px-5 py-2.5 text-sm font-semibold text-white shadow-ink-glow transition duration-DEFAULT ease-soft hover:-translate-y-px"
          >
            Add missing details
          </Link>
        )}
        {status === "VERIFIED" && (
          <Link
            href="/advisor/availability"
            className="mt-6 inline-flex rounded-md bg-ink px-5 py-2.5 text-sm font-semibold text-white shadow-ink-glow transition duration-DEFAULT ease-soft hover:-translate-y-px"
          >
            Set your availability
          </Link>
        )}
      </Card>
    </div>
  );
}

function TimelineNode({
  state,
  icon,
  title,
  sub,
  connector,
}: {
  state: NodeState;
  icon: React.ReactNode;
  title: string;
  sub: string;
  connector?: boolean;
}) {
  return (
    <li className="flex gap-4">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-pill",
            state === "done" && "bg-green-500 text-white",
            state === "current" && "bg-amber-500 text-white ring-4 ring-amber-100",
            state === "upcoming" && "bg-gray-100 text-gray-400",
          )}
        >
          {icon}
        </span>
        {connector && <span className="my-1 w-px flex-1 bg-gray-200" />}
      </div>
      <div className={cn("pb-6", !connector && "pb-0")}>
        <p className={cn("text-body font-semibold", state === "upcoming" ? "text-gray-400" : "text-ink")}>
          {title}
        </p>
        <p className="mt-0.5 text-sm text-gray-500">{sub}</p>
      </div>
    </li>
  );
}
