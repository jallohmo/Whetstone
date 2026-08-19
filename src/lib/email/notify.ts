import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { displayName } from "@/lib/auth";
import { resolvePrefs } from "@/lib/notifications";
import {
  autoAcceptDeadline,
  paymentExpiryDeadline,
  IN_DELIVERY_BOOKING_STATUSES,
} from "@/lib/booking-status";
import { splitCommission, formatMoney } from "@/lib/currency";
import { reportError } from "@/lib/observability";
import { emailEnabled, sendEmail } from "./client";
import {
  bookingConfirmedEmail,
  bookingExpiredEmail,
  completionAwaitingConfirmationEmail,
  completionReminderEmail,
  matchesReadyEmail,
  needPostedEmail,
  newBookingEmail,
  newMessageEmail,
  opsDisputeAlertEmail,
  paymentReminderEmail,
  payoutReleasedEmail,
  reviewInviteEmail,
  sessionReminderEmail,
} from "./templates";
import { platformFormat } from "@/lib/time";

/**
 * Notification dispatch. Each function loads what it needs, respects the
 * recipient's stored notification preferences (lib/notifications), and sends via
 * Resend. All are fail-soft and no-op when email isn't configured, so they are
 * safe to `await` from a server action without ever breaking the mutation.
 */

const when = platformFormat({
  weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
});

function appOrigin(): string {
  try {
    const h = headers();
    const proto = h.get("x-forwarded-proto") ?? "https";
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) return `${proto}://${host}`;
  } catch {
    /* called outside a request scope — fall through to the configured default */
  }
  return process.env.NEXT_PUBLIC_SITE_URL || "https://app.whetstone.au";
}

/**
 * Client receipt (always) + advisor "new booking" (pref-gated). Fired the moment
 * a booking becomes confirmed (dev checkout fallback and the Stripe webhook).
 */
export async function notifyBookingConfirmed(bookingId: string): Promise<void> {
  if (!emailEnabled) return;
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        scopeDescription: true,
        sessions: { orderBy: { scheduledAt: "asc" }, take: 1, select: { scheduledAt: true } },
        customer: {
          select: {
            businessName: true,
            user: { select: { email: true, firstName: true, lastName: true, fullName: true } },
          },
        },
        advisor: {
          select: {
            user: {
              select: {
                email: true, firstName: true, lastName: true, fullName: true, notificationPrefs: true,
              },
            },
          },
        },
      },
    });
    if (!booking) return;

    const origin = appOrigin();
    const whenLabel = booking.sessions[0] ? when.format(booking.sessions[0].scheduledAt) : null;
    const advisorName = displayName(booking.advisor.user);
    const clientName = displayName(booking.customer.user);

    // Confirmation receipt — always sent.
    await sendEmail({
      to: booking.customer.user.email,
      ...bookingConfirmedEmail({
        customerName: clientName,
        advisorName,
        when: whenLabel,
        scope: booking.scopeDescription,
        url: `${origin}/bookings/${bookingId}/messages`,
      }),
    });

    // Advisor heads-up — gated on their "new bookings" preference.
    if (resolvePrefs("ADVISOR", booking.advisor.user.notificationPrefs).newBookings) {
      await sendEmail({
        to: booking.advisor.user.email,
        ...newBookingEmail({
          advisorName,
          customerName: booking.customer.businessName,
          when: whenLabel,
          scope: booking.scopeDescription,
          url: `${origin}/advisor/bookings`,
        }),
      });
    }
  } catch (err) {
    reportError("notifyBookingConfirmed", err, { bookingId });
  }
}

/** What both unpaid-booking emails need to address the client and name the booking. */
function pendingPaymentSelect() {
  return {
    scopeDescription: true,
    priceCents: true,
    currency: true,
    createdAt: true,
    sessions: { orderBy: { scheduledAt: "asc" }, take: 1, select: { scheduledAt: true } },
    customer: {
      select: { user: { select: { email: true, firstName: true, lastName: true, fullName: true } } },
    },
    advisor: {
      select: { user: { select: { email: true, firstName: true, lastName: true, fullName: true } } },
    },
  } as const;
}

/**
 * To the client: they never finished checkout, so the booking isn't confirmed.
 * Deliberately NOT preference-gated — "bookingUpdates" covers news about a
 * booking that exists, and this is the only thing standing between the client
 * and a session they think they've booked. The expiry sweep runs regardless, so
 * suppressing this would cancel their booking with no warning at all.
 */
export async function notifyPaymentReminder(bookingId: string): Promise<void> {
  if (!emailEnabled) return;
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: pendingPaymentSelect(),
    });
    if (!booking) return;

    await sendEmail({
      to: booking.customer.user.email,
      ...paymentReminderEmail({
        customerName: displayName(booking.customer.user),
        advisorName: displayName(booking.advisor.user),
        when: booking.sessions[0] ? when.format(booking.sessions[0].scheduledAt) : null,
        scope: booking.scopeDescription,
        price: formatMoney(booking.priceCents, booking.currency),
        deadline: when.format(paymentExpiryDeadline(booking.createdAt)),
        url: `${appOrigin()}/bookings/${bookingId}/checkout`,
      }),
    });
  } catch (err) {
    reportError("notifyPaymentReminder", err, { bookingId });
  }
}

/**
 * To the client: their unpaid booking ran out of time and has been cancelled.
 * Also ungated — we changed the state of something they created, and they'd
 * otherwise find out by turning up to a session that no longer exists.
 */
export async function notifyBookingExpired(bookingId: string): Promise<void> {
  if (!emailEnabled) return;
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: pendingPaymentSelect(),
    });
    if (!booking) return;

    await sendEmail({
      to: booking.customer.user.email,
      ...bookingExpiredEmail({
        customerName: displayName(booking.customer.user),
        advisorName: displayName(booking.advisor.user),
        scope: booking.scopeDescription,
        url: `${appOrigin()}/advisors`,
      }),
    });
  } catch (err) {
    reportError("notifyBookingExpired", err, { bookingId });
  }
}

/**
 * Who receives an internal ops alert: OPS_ALERT_EMAIL if set (comma-separated,
 * so a shared alias and an individual on the rota can both be on it), otherwise
 * every OPS_ADMIN account — so alerts work out of the box on a fresh environment
 * with nothing extra to configure.
 *
 * Shared by every ops-facing dispatcher; introduced with the dispute alert and
 * reused here rather than adding a second, parallel address to keep in sync.
 */
async function opsRecipients(): Promise<string[]> {
  const configured = process.env.OPS_ALERT_EMAIL?.trim();
  if (configured) {
    return configured.split(",").map((e) => e.trim()).filter(Boolean);
  }
  const admins = await prisma.user.findMany({
    where: { role: "OPS_ADMIN" },
    select: { email: true },
  });
  return admins.map((u) => u.email);
}

/**
 * Ops "a need needs matching" — fired by createNeed the moment a client posts.
 * The counterpart to notifyMatchesReady: this opens the matching loop, that one
 * closes it.
 *
 * Never preference-gated. Ops has no notification preferences of its own
 * (resolvePrefs maps OPS_ADMIN onto the customer keys), and more to the point
 * this is the only push signal that a need is waiting — without it a need sits
 * at status "open" until someone happens to open the ops queue.
 */
export async function notifyNeedPosted(needId: string): Promise<void> {
  if (!emailEnabled) return;
  try {
    const recipients = await opsRecipients();
    if (recipients.length === 0) return;

    const need = await prisma.need.findUnique({
      where: { id: needId },
      select: {
        problemArea: true,
        description: true,
        industry: { select: { name: true } },
        customer: { select: { businessName: true } },
      },
    });
    if (!need) return;

    const content = needPostedEmail({
      businessName: need.customer.businessName,
      problemArea: need.problemArea,
      industry: need.industry.name,
      description: need.description,
      url: `${appOrigin()}/ops/needs/${needId}/match`,
    });

    // One send per address rather than a single multi-recipient email, so ops
    // don't see each other's addresses and one bad address can't drop the rest.
    for (const to of recipients) {
      await sendEmail({ to, ...content });
    }
  } catch (err) {
    reportError("notifyNeedPosted", err, { needId });
  }
}

/**
 * Client "your matches are ready" — fired by sendShortlistToClient when ops
 * RELEASES a shortlist (Need.status open -> matched), not when each individual
 * MatchDecision is written. Ops shortlists several advisors one at a time, so
 * firing per decision would send the same email two or three times.
 *
 * Always sent, like the booking receipt: it is the reply to something the client
 * explicitly asked for, and it is their only prompt to come back. There is
 * deliberately no preference key to switch it off.
 */
export async function notifyMatchesReady(needId: string): Promise<void> {
  if (!emailEnabled) return;
  try {
    const need = await prisma.need.findUnique({
      where: { id: needId },
      select: {
        problemArea: true,
        industry: { select: { name: true } },
        matchDecisions: { select: { advisorChosenId: true } },
        customer: {
          select: {
            user: {
              select: { email: true, firstName: true, lastName: true, fullName: true },
            },
          },
        },
      },
    });
    if (!need?.customer) return;

    // Deduplicated the same way the shortlist screen counts them: one row per
    // advisor, however many decisions mention them.
    const advisorCount = new Set(need.matchDecisions.map((m) => m.advisorChosenId)).size;
    if (advisorCount === 0) return;

    await sendEmail({
      to: need.customer.user.email,
      ...matchesReadyEmail({
        customerName: displayName(need.customer.user),
        problemArea: need.problemArea,
        industry: need.industry.name,
        advisorCount,
        url: `${appOrigin()}/needs/${needId}/matches`,
      }),
    });
  } catch (err) {
    reportError("notifyMatchesReady", err, { needId });
  }
}

/** A human "how soon" phrase for the reminder heading/subject. */
function relativePhrase(scheduledAt: Date, now: Date): string {
  const gapMin = Math.round((scheduledAt.getTime() - now.getTime()) / 60_000);
  if (gapMin <= 90) return "in about an hour";
  const hours = Math.round(gapMin / 60);
  if (hours < 24) return `in about ${hours} hours`;
  return "tomorrow";
}

/**
 * Upcoming-session reminder to BOTH parties (session-reminder cron). The client
 * is gated on their "session reminders" preference; advisors always receive it.
 * The caller (cron route) has already claimed the send window atomically, so
 * this just dispatches.
 */
export async function notifySessionReminder(sessionId: string): Promise<void> {
  if (!emailEnabled) return;
  try {
    const s = await prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        scheduledAt: true,
        booking: {
          select: {
            id: true,
            status: true,
            scopeDescription: true,
            customer: {
              select: {
                businessName: true,
                user: { select: { email: true, firstName: true, lastName: true, fullName: true, notificationPrefs: true } },
              },
            },
            advisor: {
              select: { user: { select: { email: true, firstName: true, lastName: true, fullName: true } } },
            },
          },
        },
      },
    });
    if (!s) return;
    // Not awaiting_confirmation: once the advisor says the work is done, an
    // "upcoming session" reminder would be wrong.
    if (!IN_DELIVERY_BOOKING_STATUSES.includes(s.booking.status as "confirmed" | "in_progress")) return;

    const whenLabel = when.format(s.scheduledAt);
    const rel = relativePhrase(s.scheduledAt, new Date());
    const advisorName = displayName(s.booking.advisor.user);
    const clientName = displayName(s.booking.customer.user);
    const url = `${appOrigin()}/bookings/${s.booking.id}/messages`;

    // Client — gated on their "session reminders" preference.
    if (resolvePrefs("CUSTOMER", s.booking.customer.user.notificationPrefs).sessionReminders) {
      await sendEmail({
        to: s.booking.customer.user.email,
        ...sessionReminderEmail({
          recipientName: clientName,
          counterpartLabel: "Advisor",
          counterpartName: advisorName,
          relativePhrase: rel,
          when: whenLabel,
          scope: s.booking.scopeDescription,
          url,
        }),
      });
    }

    // Advisor — always sent.
    await sendEmail({
      to: s.booking.advisor.user.email,
      ...sessionReminderEmail({
        recipientName: advisorName,
        counterpartLabel: "Client",
        counterpartName: s.booking.customer.businessName,
        relativePhrase: rel,
        when: whenLabel,
        scope: s.booking.scopeDescription,
        url,
      }),
    });
  } catch (err) {
    reportError("notifySessionReminder", err, { sessionId });
  }
}

const dayMonth = platformFormat({ weekday: "long", day: "numeric", month: "long" });

/** Booking + parties, the shape every completion email needs. */
function completionSelect() {
  return {
    id: true,
    scopeDescription: true,
    sessionCount: true,
    advisorCompletedAt: true,
    customer: {
      select: {
        businessName: true,
        user: {
          select: { email: true, firstName: true, lastName: true, fullName: true, notificationPrefs: true },
        },
      },
    },
    advisor: {
      select: { user: { select: { email: true, firstName: true, lastName: true, fullName: true } } },
    },
  } as const;
}

/**
 * To the client: the advisor marked the work complete and we need them to accept
 * before the payout moves. Gated on the client's "booking updates" preference —
 * but note the day-3 reminder and the day-7 auto-accept run regardless, so
 * opting out slows the flow down rather than stalling anyone's money.
 */
export async function notifyCompletionAwaitingConfirmation(bookingId: string): Promise<void> {
  if (!emailEnabled) return;
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: completionSelect(),
    });
    if (!booking) return;
    if (!resolvePrefs("CUSTOMER", booking.customer.user.notificationPrefs).bookingUpdates) return;

    await sendEmail({
      to: booking.customer.user.email,
      ...completionAwaitingConfirmationEmail({
        customerName: displayName(booking.customer.user),
        advisorName: displayName(booking.advisor.user),
        scope: booking.scopeDescription,
        sessionsLabel: `${booking.sessionCount} ${booking.sessionCount === 1 ? "session" : "sessions"}`,
        deadline: dayMonth.format(autoAcceptDeadline(booking.advisorCompletedAt ?? new Date())),
        url: `${appOrigin()}/bookings/${bookingId}/confirm-completion`,
      }),
    });
  } catch (err) {
    reportError("notifyCompletionAwaitingConfirmation", err, { bookingId });
  }
}

/** The day-3 nudge (booking-lifecycle cron). Same gate as the first ask. */
export async function notifyCompletionReminder(bookingId: string): Promise<void> {
  if (!emailEnabled) return;
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: completionSelect(),
    });
    if (!booking) return;
    if (!resolvePrefs("CUSTOMER", booking.customer.user.notificationPrefs).bookingUpdates) return;

    await sendEmail({
      to: booking.customer.user.email,
      ...completionReminderEmail({
        customerName: displayName(booking.customer.user),
        advisorName: displayName(booking.advisor.user),
        deadline: dayMonth.format(autoAcceptDeadline(booking.advisorCompletedAt ?? new Date())),
        url: `${appOrigin()}/bookings/${bookingId}/confirm-completion`,
      }),
    });
  } catch (err) {
    reportError("notifyCompletionReminder", err, { bookingId });
  }
}

/**
 * To the client once the booking is completed: an invitation to leave feedback.
 * Nothing hangs on it — the payout has already gone — so this is pref-gated and
 * genuinely optional, unlike the confirmation ask above.
 */
export async function notifyReviewInvite(
  bookingId: string,
  opts: { auto?: boolean } = {},
): Promise<void> {
  if (!emailEnabled) return;
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: completionSelect(),
    });
    if (!booking) return;
    if (!resolvePrefs("CUSTOMER", booking.customer.user.notificationPrefs).bookingUpdates) return;

    await sendEmail({
      to: booking.customer.user.email,
      ...reviewInviteEmail({
        customerName: displayName(booking.customer.user),
        advisorName: displayName(booking.advisor.user),
        autoAccepted: opts.auto ?? false,
        url: `${appOrigin()}/bookings/${bookingId}/review`,
      }),
    });
  } catch (err) {
    reportError("notifyReviewInvite", err, { bookingId });
  }
}

/**
 * To ops: someone flagged a booking. Recipients are OPS_ALERT_EMAIL if set,
 * otherwise every OPS_ADMIN account — so this works out of the box on a fresh
 * environment without another secret to configure. Never pref-gated: ops
 * notifications aren't a user preference, and money is held pending the outcome.
 */
export async function notifyOpsDisputeRaised(
  bookingId: string,
  raisedByUserId: string,
  notes: string,
): Promise<void> {
  if (!emailEnabled) return;
  try {
    const [booking, dispute] = await Promise.all([
      prisma.booking.findUnique({
        where: { id: bookingId },
        select: {
          customer: { select: { businessName: true, userId: true } },
          advisor: { select: { userId: true, user: { select: { email: true, firstName: true, lastName: true, fullName: true } } } },
          payment: { select: { amountCents: true, currency: true } },
          priceCents: true,
          currency: true,
        },
      }),
      prisma.dispute.findFirst({
        where: { bookingId },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      }),
    ]);
    if (!booking) return;

    const recipients = await opsRecipients();
    if (recipients.length === 0) return;

    const raisedByLabel =
      raisedByUserId === booking.advisor.userId
        ? `The advisor (${displayName(booking.advisor.user)})`
        : raisedByUserId === booking.customer.userId
          ? `The client (${booking.customer.businessName})`
          : "Someone";

    const content = opsDisputeAlertEmail({
      bookingId,
      raisedByLabel,
      advisorName: displayName(booking.advisor.user),
      customerName: booking.customer.businessName,
      amount: formatMoney(
        booking.payment?.amountCents ?? booking.priceCents,
        booking.payment?.currency ?? booking.currency,
      ),
      notes,
      url: `${appOrigin()}${dispute ? `/ops/disputes/${dispute.id}` : "/ops/disputes"}`,
    });

    for (const to of recipients) {
      await sendEmail({ to, ...content });
    }
  } catch (err) {
    reportError("notifyOpsDisputeRaised", err, { bookingId });
  }
}

/** Advisor payout confirmation (pref-gated). Fired when held funds are released. */
export async function notifyPayoutReleased(bookingId: string): Promise<void> {
  if (!emailEnabled) return;
  try {
    const payment = await prisma.payment.findUnique({
      where: { bookingId },
      select: {
        amountCents: true,
        currency: true,
        booking: {
          select: {
            advisor: {
              select: {
                user: {
                  select: {
                    email: true, firstName: true, lastName: true, fullName: true, notificationPrefs: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!payment) return;

    const advisorUser = payment.booking.advisor.user;
    if (!resolvePrefs("ADVISOR", advisorUser.notificationPrefs).payoutConfirmations) return;

    const { advisorPayoutMinor } = splitCommission(payment.amountCents);
    await sendEmail({
      to: advisorUser.email,
      ...payoutReleasedEmail({
        advisorName: displayName(advisorUser),
        amount: formatMoney(advisorPayoutMinor, payment.currency),
        url: `${appOrigin()}/advisor/earnings`,
      }),
    });
  } catch (err) {
    reportError("notifyPayoutReleased", err, { bookingId });
  }
}

/** New-message email to the OTHER party in a thread (pref-gated). */
export async function notifyNewMessage(bookingId: string, senderId: string, body: string): Promise<void> {
  if (!emailEnabled) return;
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        customer: {
          select: {
            businessName: true,
            userId: true,
            user: { select: { email: true, firstName: true, lastName: true, fullName: true, notificationPrefs: true } },
          },
        },
        advisor: {
          select: {
            userId: true,
            user: { select: { email: true, firstName: true, lastName: true, fullName: true, notificationPrefs: true } },
          },
        },
      },
    });
    if (!booking) return;

    const senderIsCustomer = booking.customer.userId === senderId;
    const senderIsAdvisor = booking.advisor.userId === senderId;
    if (!senderIsCustomer && !senderIsAdvisor) return; // ops or stranger — no email

    // Recipient is the counterpart; gate on their role's "new messages" pref.
    const recipient = senderIsCustomer
      ? { user: booking.advisor.user, role: "ADVISOR" as const, name: displayName(booking.advisor.user) }
      : { user: booking.customer.user, role: "CUSTOMER" as const, name: displayName(booking.customer.user) };
    const senderName = senderIsCustomer ? booking.customer.businessName : displayName(booking.advisor.user);

    if (!resolvePrefs(recipient.role, recipient.user.notificationPrefs).newMessages) return;

    await sendEmail({
      to: recipient.user.email,
      ...newMessageEmail({
        recipientName: recipient.name,
        senderName,
        snippet: body,
        url: `${appOrigin()}/bookings/${bookingId}/messages`,
      }),
    });
  } catch (err) {
    reportError("notifyNewMessage", err, { bookingId });
  }
}
