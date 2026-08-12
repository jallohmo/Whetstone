import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { displayName } from "@/lib/auth";
import { resolvePrefs } from "@/lib/notifications";
import { splitCommission, formatMoney } from "@/lib/currency";
import { reportError } from "@/lib/observability";
import { emailEnabled, sendEmail } from "./client";
import {
  bookingConfirmedEmail,
  newBookingEmail,
  newMessageEmail,
  payoutReleasedEmail,
} from "./templates";

/**
 * Notification dispatch. Each function loads what it needs, respects the
 * recipient's stored notification preferences (lib/notifications), and sends via
 * Resend. All are fail-soft and no-op when email isn't configured, so they are
 * safe to `await` from a server action without ever breaking the mutation.
 */

const when = new Intl.DateTimeFormat("en-AU", {
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
