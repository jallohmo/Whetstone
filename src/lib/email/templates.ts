/**
 * Transactional email templates. Plain inline-styled HTML (email clients ignore
 * external CSS and most <style> blocks), sharing one branded layout so every
 * message reads as Whetstone. Kept framework-free on purpose — these can migrate
 * to React Email later without touching the send path.
 *
 * The Whetstone role-of-colour rule holds here too: ink is primary, blue is the
 * accent/link, green means money/verified.
 */

const INK = "#111114";
const BLUE = "#2e45ff";
const GRAY = "#6b7280";
const BORDER = "#e5e5e8";
const CANVAS = "#f0f0f2";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface LayoutOpts {
  /** Hidden inbox preview line. */
  preview: string;
  heading: string;
  /** Pre-built inner HTML (already escaped where needed). */
  body: string;
  cta?: { label: string; url: string };
}

/** Wrap content in the shared Whetstone shell. */
function layout({ preview, heading, body, cta }: LayoutOpts): string {
  const button = cta
    ? `<tr><td style="padding-top:8px">
         <a href="${esc(cta.url)}" style="display:inline-block;background:${INK};color:#ffffff;
            text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:8px">
           ${esc(cta.label)}
         </a>
       </td></tr>`
    : "";

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:${CANVAS};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${INK}">
  <span style="display:none;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden">${esc(preview)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CANVAS};padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid ${BORDER};border-radius:16px;overflow:hidden">
        <tr><td style="padding:22px 28px;border-bottom:1px solid ${BORDER}">
          <span style="font-size:18px;font-weight:700;letter-spacing:-0.02em;color:${INK}">Whetstone</span>
        </td></tr>
        <tr><td style="padding:28px">
          <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;font-weight:700;color:${INK}">${esc(heading)}</h1>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px;line-height:1.6;color:${GRAY}">
            <tr><td style="padding-bottom:16px">${body}</td></tr>
            ${button}
          </table>
        </td></tr>
        <tr><td style="padding:20px 28px;border-top:1px solid ${BORDER};font-size:12px;color:${GRAY}">
          Verified, insured, bounded advisory sessions.<br>
          You can manage which emails you receive in your account settings.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** A neutral label:value line for the detail blocks. */
function detail(label: string, value: string): string {
  return `<div style="margin:2px 0"><span style="color:${GRAY}">${esc(label)}:</span> <span style="color:${INK};font-weight:600">${esc(value)}</span></div>`;
}

export interface EmailContent {
  subject: string;
  html: string;
}

/** To the client: their booking is confirmed and paid (a receipt — always sent). */
export function bookingConfirmedEmail(p: {
  customerName: string;
  advisorName: string;
  when: string | null;
  scope: string;
  url: string;
}): EmailContent {
  return {
    subject: "Your Whetstone session is confirmed",
    html: layout({
      preview: `Your session with ${p.advisorName} is booked.`,
      heading: `You're booked in, ${p.customerName}`,
      body:
        `<p style="margin:0 0 14px">Your session with <strong style="color:${INK}">${esc(p.advisorName)}</strong> is confirmed and payment is held securely until you've met.</p>` +
        `<div style="background:${CANVAS};border-radius:10px;padding:14px 16px;margin:0 0 6px">` +
        detail("Advisor", p.advisorName) +
        (p.when ? detail("When", p.when) : "") +
        detail("Focus", p.scope) +
        `</div>`,
      cta: { label: "View booking", url: p.url },
    }),
  };
}

/** To the advisor: a new booking landed (gated on the "newBookings" pref). */
export function newBookingEmail(p: {
  advisorName: string;
  customerName: string;
  when: string | null;
  scope: string;
  url: string;
}): EmailContent {
  return {
    subject: "New Whetstone booking",
    html: layout({
      preview: `${p.customerName} booked a session with you.`,
      heading: `New booking, ${p.advisorName}`,
      body:
        `<p style="margin:0 0 14px"><strong style="color:${INK}">${esc(p.customerName)}</strong> has booked a session with you.</p>` +
        `<div style="background:${CANVAS};border-radius:10px;padding:14px 16px;margin:0 0 6px">` +
        detail("Client", p.customerName) +
        (p.when ? detail("When", p.when) : "") +
        detail("Focus", p.scope) +
        `</div>`,
      cta: { label: "Open booking", url: p.url },
    }),
  };
}

/** To the other party in a thread (gated on the "newMessages" pref). */
export function newMessageEmail(p: {
  recipientName: string;
  senderName: string;
  snippet: string;
  url: string;
}): EmailContent {
  const trimmed = p.snippet.length > 160 ? `${p.snippet.slice(0, 160)}…` : p.snippet;
  return {
    subject: `New message from ${p.senderName}`,
    html: layout({
      preview: `${p.senderName}: ${trimmed}`,
      heading: `New message from ${p.senderName}`,
      body:
        `<p style="margin:0 0 14px">You have a new message in your session thread:</p>` +
        `<div style="background:${CANVAS};border-left:3px solid ${BLUE};border-radius:6px;padding:12px 16px;margin:0 0 6px;color:${INK}">${esc(trimmed)}</div>`,
      cta: { label: "Reply", url: p.url },
    }),
  };
}

/** To the advisor: held earnings were released (gated on "payoutConfirmations"). */
export function payoutReleasedEmail(p: {
  advisorName: string;
  amount: string;
  url: string;
}): EmailContent {
  return {
    subject: "Your Whetstone payout has been released",
    html: layout({
      preview: `${p.amount} is on its way to you.`,
      heading: "Payout released",
      body:
        `<p style="margin:0 0 14px">Nice work, ${esc(p.advisorName)}. Your earnings for a completed session have been released.</p>` +
        `<div style="background:${CANVAS};border-radius:10px;padding:16px;margin:0 0 6px">` +
        `<div style="font-size:26px;font-weight:700;color:#15803d">${esc(p.amount)}</div>` +
        `<div style="color:${GRAY};font-size:13px;margin-top:2px">released to your connected account</div>` +
        `</div>`,
      cta: { label: "View earnings", url: p.url },
    }),
  };
}
