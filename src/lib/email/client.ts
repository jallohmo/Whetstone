import "server-only";
import { Resend } from "resend";
import { reportError } from "@/lib/observability";

/**
 * Transactional email — SERVER ONLY. Guarded by RESEND_API_KEY so the app runs
 * fully without email configured: every send becomes a logged no-op rather than
 * an error (mirrors the Stripe/Daily "enabled" pattern). Never import into a
 * client component.
 *
 * Sending domain and from-address are configured via EMAIL_FROM — verify a
 * dedicated subdomain (e.g. mail.whetstone.au) in Resend with SPF/DKIM/DMARC so
 * these land in the inbox. See docs/LAUNCH_CHECKLIST.md §Email.
 */
const apiKey = process.env.RESEND_API_KEY;

export const emailEnabled = Boolean(apiKey);

const FROM = process.env.EMAIL_FROM || "Whetstone <no-reply@mail.whetstone.au>";
const REPLY_TO = process.env.EMAIL_REPLY_TO || undefined;

let cached: Resend | null = null;
function client(): Resend {
  cached ??= new Resend(apiKey!);
  return cached;
}

/**
 * Send one transactional email. Returns whether it was actually dispatched.
 * Fails SOFT — a transport error is reported and swallowed, never thrown into
 * the calling action: a booking must still confirm even if its receipt email
 * can't be sent.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<boolean> {
  if (!emailEnabled) return false;
  try {
    const { error } = await client().emails.send({
      from: FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      replyTo: opts.replyTo ?? REPLY_TO,
    });
    if (error) {
      reportError("sendEmail: Resend returned an error", error, { subject: opts.subject });
      return false;
    }
    return true;
  } catch (err) {
    reportError("sendEmail: failed to dispatch", err, { subject: opts.subject });
    return false;
  }
}
