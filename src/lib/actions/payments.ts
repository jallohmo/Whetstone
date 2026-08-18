"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getStripe, stripeEnabled } from "@/lib/stripe";
import { splitCommission } from "@/lib/currency";
import { platformConfig } from "@/lib/platform-config";
import { getCurrentUser } from "@/lib/auth";
import { notifyBookingConfirmed, notifyPayoutReleased } from "@/lib/email/notify";

function origin(): string {
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

/**
 * A6 — Checkout. With Stripe configured, opens a hosted Checkout Session and the
 * webhook fulfils the booking on success (funds held on the platform balance;
 * released to the advisor after the session). Without Stripe (dev), it falls back
 * to recording a held Payment directly so the flow still completes end to end.
 * The insurance-coverage gate is enforced before either path confirms.
 */
export async function createCheckout(formData: FormData) {
  const bookingId = String(formData.get("bookingId") ?? "");
  if (!bookingId) throw new Error("Missing booking id.");

  // The booking id arrives in the form, so it is caller-controlled: without the
  // ownership check below, any signed-in user could post someone else's booking
  // id and have this action act on it — opening a Stripe session against their
  // booking, or (on the no-Stripe path) writing a held Payment and flipping it
  // to confirmed. Middleware gating /bookings/* only proves there IS a session.
  const current = await getCurrentUser();
  if (!current) redirect("/login");

  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: { customer: { select: { userId: true } } },
  });
  // Paying is the client's alone. Ops refund and resolve elsewhere; the advisor
  // is the payee, never the payer.
  if (booking.customer.userId !== current.id) {
    throw new Error("You don't have access to this booking.");
  }

  if (!platformConfig.insurance.active) {
    throw new Error("Insurance coverage is not active — cannot take payment.");
  }
  if (booking.status !== "pending_payment") {
    redirect(`/bookings/${bookingId}/confirmed`); // already paid
  }

  if (!stripeEnabled) {
    // Dev fallback: record the held payment and confirm, mirroring production end state.
    const { platformFeeMinor } = splitCommission(booking.priceCents);
    await prisma.$transaction([
      prisma.payment.upsert({
        where: { bookingId },
        update: {},
        create: {
          bookingId,
          amountCents: booking.priceCents,
          currency: booking.currency,
          status: "held",
          platformFeeCents: platformFeeMinor,
          stripePaymentIntentId: `pi_dev_${bookingId}`,
        },
      }),
      prisma.booking.update({
        where: { id: bookingId },
        data: { insuranceCoverageConfirmed: true, status: "confirmed" },
      }),
    ]);
    await notifyBookingConfirmed(bookingId);
    redirect(`/bookings/${bookingId}/confirmed`);
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: booking.currency.toLowerCase(),
          unit_amount: booking.priceCents,
          product_data: {
            name: `Whetstone booking (${booking.sessionCount} session${booking.sessionCount > 1 ? "s" : ""})`,
            description: booking.scopeDescription,
          },
        },
      },
    ],
    payment_intent_data: { metadata: { bookingId } },
    metadata: { bookingId },
    success_url: `${origin()}/bookings/${bookingId}/confirmed`,
    cancel_url: `${origin()}/bookings/${bookingId}/checkout`,
  });

  if (!session.url) throw new Error("Could not start checkout.");
  redirect(session.url);
}

/**
 * Webhook fulfilment (idempotent): funds captured → held Payment + booking
 * confirmed + coverage flag set. Called from the Stripe webhook route.
 */
export async function fulfillCheckout(bookingId: string, paymentIntentId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return;
  const { platformFeeMinor } = splitCommission(booking.priceCents);

  await prisma.$transaction([
    prisma.payment.upsert({
      where: { bookingId },
      update: { status: "held", stripePaymentIntentId: paymentIntentId, platformFeeCents: platformFeeMinor },
      create: {
        bookingId,
        amountCents: booking.priceCents,
        currency: booking.currency,
        status: "held",
        platformFeeCents: platformFeeMinor,
        stripePaymentIntentId: paymentIntentId,
      },
    }),
    prisma.booking.update({
      where: { id: bookingId },
      data: { insuranceCoverageConfirmed: true, status: "confirmed" },
    }),
  ]);

  await notifyBookingConfirmed(bookingId);
}

/**
 * Release the held funds to the advisor (minus commission) after the session.
 * Called automatically when the customer submits their review (session done).
 * With Stripe + a connected advisor account it creates a Transfer; otherwise it
 * just marks the payment released (dev). Idempotent: only acts on a held payment.
 */
export async function releasePaymentForBooking(bookingId: string) {
  const payment = await prisma.payment.findUnique({ where: { bookingId } });
  if (!payment || payment.status !== "held") return;

  const advisor = await prisma.booking
    .findUnique({ where: { id: bookingId } })
    .then((b) => (b ? prisma.advisorProfile.findUnique({ where: { id: b.advisorId } }) : null));

  const { advisorPayoutMinor } = splitCommission(payment.amountCents);

  let transferId: string | null = null;
  if (stripeEnabled && advisor?.stripeAccountId) {
    const stripe = getStripe();
    const transfer = await stripe.transfers.create({
      amount: advisorPayoutMinor,
      currency: payment.currency.toLowerCase(),
      destination: advisor.stripeAccountId,
      transfer_group: bookingId,
      metadata: { bookingId },
    });
    transferId = transfer.id;
  }

  await prisma.payment.update({
    where: { bookingId },
    data: { status: "released", stripeTransferId: transferId },
  });

  await notifyPayoutReleased(bookingId);
}

/**
 * A6 — Ops refund on a disputed booking. Refunds the charge (if Stripe) and marks
 * the payment refunded. OPS only.
 */
export async function refundBooking(formData: FormData) {
  const ops = await getCurrentUser();
  if (!ops || ops.role !== "OPS_ADMIN") throw new Error("Only ops can refund.");

  const bookingId = String(formData.get("bookingId") ?? "");
  const payment = await prisma.payment.findUnique({ where: { bookingId } });
  if (!payment) throw new Error("No payment to refund.");
  if (payment.status === "refunded") redirect(`/ops`);

  if (stripeEnabled && payment.stripePaymentIntentId && !payment.stripePaymentIntentId.startsWith("pi_dev_")) {
    const stripe = getStripe();
    await stripe.refunds.create({ payment_intent: payment.stripePaymentIntentId });
  }

  await prisma.$transaction([
    prisma.payment.update({ where: { bookingId }, data: { status: "refunded" } }),
    prisma.booking.update({ where: { id: bookingId }, data: { status: "cancelled" } }),
  ]);

  revalidatePath("/ops");
  redirect("/ops");
}
