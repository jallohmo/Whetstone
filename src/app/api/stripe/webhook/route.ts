import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe, stripeEnabled } from "@/lib/stripe";
import { fulfillCheckout } from "@/lib/actions/payments";

// Stripe webhook — the stable public endpoint for reconciling payments. Must read
// the raw body for signature verification, so this is a Route Handler (not a
// Server Action) and runs on the Node runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!stripeEnabled) return NextResponse.json({ ok: false, reason: "stripe disabled" }, { status: 503 });

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  if (!secret || !sig) return NextResponse.json({ ok: false }, { status: 400 });

  const raw = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    return NextResponse.json({ ok: false, error: `signature: ${(err as Error).message}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const bookingId = session.metadata?.bookingId;
      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id;
      if (bookingId && paymentIntentId && session.payment_status === "paid") {
        await fulfillCheckout(bookingId, paymentIntentId);
      }
      break;
    }
    default:
      // Ignore unhandled event types.
      break;
  }

  return NextResponse.json({ received: true });
}
