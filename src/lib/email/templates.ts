/**
 * Transactional email templates. Plain inline-styled, table-based HTML (email
 * clients ignore external CSS/most <style> blocks and web fonts), sharing one
 * branded shell so every message reads as Whetstone. Kept framework-free on
 * purpose — these can migrate to React Email later without touching the send
 * path.
 *
 * The shell mirrors the Whetstone marketing email design: 600px card with a 6px
 * blue top bar, blue uppercase eyebrow, gray-50 detail panels with dashed
 * dividers, an ink button, and the two-dot wordmark. Role-of-colour holds: ink
 * is primary, blue is the accent/link, green means money.
 */

const INK = "#111114";
const BLUE = "#2e45ff";
const BODY = "#5a5a62";
const MUTED = "#7c7c85";
const FOOTER = "#a6a6ae";
const PANEL = "#f7f7f8";
const DASH = "#cfcfd5";
const CANVAS = "#f0f0f2";
const GREEN = "#15803d";
const FONT = "Arial,Helvetica,sans-serif";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Email logo. Uses a hosted PNG (email clients don't render inline SVG) served
// from /public at the production origin. Resolves once the domain is live.
const LOGO_URL = `${(process.env.NEXT_PUBLIC_SITE_URL || "https://app.whetstone.au").replace(/\/+$/, "")}/whetstone-icon.png`;
const LOGO = `<tr><td style="padding:4px 8px 20px 8px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="padding-right:10px;vertical-align:middle;font-size:0;line-height:0;">
      <img src="${LOGO_URL}" width="30" height="30" alt="Whetstone" style="display:block;border:0;outline:none;text-decoration:none;">
    </td>
    <td style="font-family:${FONT};font-size:18px;font-weight:bold;color:${INK};letter-spacing:-0.5px;vertical-align:middle;">Whetstone</td>
  </tr></table>
</td></tr>`;

interface LayoutOpts {
  preview: string;
  eyebrow: string;
  heading: string;
  /** Intro paragraph(s) + any panel, as pre-built HTML. */
  body: string;
  cta?: { label: string; url: string };
  /** Closing line under the button. */
  note?: string;
  /** First footer line — why they're receiving this. */
  footerReason: string;
}

/** Wrap content in the shared Whetstone shell. */
function layout({ preview, eyebrow, heading, body, cta, note, footerReason }: LayoutOpts): string {
  const button = cta
    ? `<tr><td style="padding:28px 40px 0 40px;">
         <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
           <td bgcolor="${INK}" style="background:${INK};border-radius:14px;">
             <a href="${esc(cta.url)}" style="display:inline-block;padding:15px 30px;font-family:${FONT};font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:14px;">${esc(cta.label)}</a>
           </td>
         </tr></table>
       </td></tr>`
    : "";

  const closing = `<tr><td style="padding:${cta ? "20px" : "24px"} 40px 40px 40px;">
      <p style="margin:0;font-family:${FONT};font-size:14px;line-height:1.5;color:${MUTED};">${note ?? "Questions? Just reply to this email."}</p>
    </td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
</head>
<body style="margin:0;padding:0;background:${CANVAS};-webkit-text-size-adjust:100%;">
<span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;mso-hide:all;">${esc(preview)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${CANVAS}" style="background:${CANVAS};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
${LOGO}
<tr><td bgcolor="#ffffff" style="background:#ffffff;border-radius:24px;box-shadow:0 1px 2px rgba(17,17,20,0.04),0 12px 32px rgba(17,17,20,0.06);">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td height="6" bgcolor="${BLUE}" style="background:${BLUE};border-radius:24px 24px 0 0;font-size:0;line-height:0;">&nbsp;</td></tr>
    <tr><td style="padding:40px 40px 0 40px;">
      <div style="font-family:${FONT};font-size:13px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:${BLUE};">${esc(eyebrow)}</div>
    </td></tr>
    <tr><td style="padding:8px 40px 0 40px;">
      <h1 style="margin:0;font-family:${FONT};font-size:30px;line-height:1.15;font-weight:bold;letter-spacing:-0.5px;color:${INK};">${esc(heading)}</h1>
    </td></tr>
    <tr><td style="padding:16px 40px 0 40px;">${body}</td></tr>
    ${button}
    ${closing}
  </table>
</td></tr>
<tr><td style="padding:26px 24px 8px 24px;">
  <p style="margin:0 0 6px 0;font-family:${FONT};font-size:12px;line-height:1.5;color:${FOOTER};">${esc(footerReason)}</p>
  <p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.5;color:${FOOTER};">Verified, insured, bounded advisory sessions. Manage which emails you receive in your account settings.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/** Intro paragraph in the standard body colour. */
function para(html: string): string {
  return `<p style="margin:0;font-family:${FONT};font-size:15px;line-height:1.55;color:${BODY};">${html}</p>`;
}

/** A gray-50 detail panel of label/value rows with dashed dividers. */
function infoPanel(rows: { label: string; value: string }[]): string {
  const inner = rows
    .map((r, i) => {
      const divider =
        i > 0
          ? `<tr><td colspan="2" height="1" style="font-size:0;line-height:0;padding:12px 0;"><div style="border-top:1px dashed ${DASH};font-size:0;line-height:0;">&nbsp;</div></td></tr>`
          : "";
      return `${divider}<tr>
        <td width="86" valign="top" style="font-family:${FONT};font-size:14px;line-height:1.4;color:${MUTED};">${esc(r.label)}</td>
        <td style="font-family:${FONT};font-size:15px;line-height:1.4;font-weight:bold;color:${INK};">${esc(r.value)}</td>
      </tr>`;
    })
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${PANEL}" style="background:${PANEL};border-radius:18px;margin-top:24px;">
    <tr><td style="padding:18px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${inner}</table></td></tr>
  </table>`;
}

/** A gray-50 panel wrapping arbitrary emphasis content (quote, amount, code). */
function panel(inner: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${PANEL}" style="background:${PANEL};border-radius:18px;margin-top:24px;">
    <tr><td style="padding:20px 22px;">${inner}</td></tr>
  </table>`;
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
  const rows = [{ label: "Advisor", value: p.advisorName }];
  if (p.when) rows.push({ label: "When", value: p.when });
  rows.push({ label: "Focus", value: p.scope });
  return {
    subject: "Your Whetstone session is confirmed",
    html: layout({
      preview: `Your session with ${p.advisorName} is booked.`,
      eyebrow: "Booking confirmed",
      heading: `You're booked in, ${p.customerName}`,
      body:
        para(
          `Your session with <strong style="color:${INK}">${esc(p.advisorName)}</strong> is confirmed, and payment is held securely until you've met.`,
        ) + infoPanel(rows),
      cta: { label: "View booking", url: p.url },
      footerReason: "You're receiving this because you booked a session on Whetstone.",
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
  const rows = [{ label: "Client", value: p.customerName }];
  if (p.when) rows.push({ label: "When", value: p.when });
  rows.push({ label: "Focus", value: p.scope });
  return {
    subject: "New Whetstone booking",
    html: layout({
      preview: `${p.customerName} booked a session with you.`,
      eyebrow: "New booking",
      heading: `New booking, ${p.advisorName}`,
      body:
        para(`<strong style="color:${INK}">${esc(p.customerName)}</strong> has booked a session with you.`) +
        infoPanel(rows),
      cta: { label: "Open booking", url: p.url },
      footerReason: "You're receiving this because you're an advisor on Whetstone.",
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
  const trimmed = p.snippet.length > 200 ? `${p.snippet.slice(0, 200)}…` : p.snippet;
  return {
    subject: `New message from ${p.senderName}`,
    html: layout({
      preview: `${p.senderName}: ${trimmed}`,
      eyebrow: "New message",
      heading: `Message from ${p.senderName}`,
      body:
        para("You have a new message in your session thread:") +
        panel(
          `<div style="font-family:${FONT};font-size:15px;line-height:1.5;color:${INK};border-left:3px solid ${BLUE};padding-left:14px;">${esc(trimmed)}</div>`,
        ),
      cta: { label: "Reply", url: p.url },
      footerReason: "You're receiving this because you have an active session on Whetstone.",
    }),
  };
}

/** To either party: an upcoming session (session-reminder cron, 24h + 1h). */
export function sessionReminderEmail(p: {
  recipientName: string;
  counterpartLabel: "Advisor" | "Client";
  counterpartName: string;
  relativePhrase: string;
  when: string | null;
  scope: string;
  url: string;
}): EmailContent {
  const rows: { label: string; value: string }[] = [
    { label: p.counterpartLabel, value: p.counterpartName },
  ];
  if (p.when) rows.push({ label: "When", value: p.when });
  rows.push({ label: "Focus", value: p.scope });
  return {
    subject: `Reminder: your Whetstone session is ${p.relativePhrase}`,
    html: layout({
      preview: `Your session with ${p.counterpartName} is ${p.relativePhrase}.`,
      eyebrow: "Session reminder",
      heading: "Your session is coming up",
      body:
        para(
          `A reminder that your session with <strong style="color:${INK}">${esc(p.counterpartName)}</strong> is <strong style="color:${INK}">${esc(p.relativePhrase)}</strong>.`,
        ) + infoPanel(rows),
      cta: { label: "Join session", url: p.url },
      footerReason: "You're receiving this because you have an upcoming session on Whetstone.",
    }),
  };
}

/**
 * To the client: ops has released the shortlist for a need they posted (a
 * transactional reply to something they asked for — always sent, like the booking
 * receipt). This is the ONLY prompt to come back, so the CTA goes straight to the
 * shortlist rather than the dashboard.
 */
export function matchesReadyEmail(p: {
  customerName: string;
  problemArea: string;
  industry: string;
  advisorCount: number;
  url: string;
}): EmailContent {
  const people = p.advisorCount === 1 ? "one person" : `${p.advisorCount} people`;
  const noun = p.advisorCount === 1 ? "match" : "matches";
  return {
    subject: `Your Whetstone ${noun} ${p.advisorCount === 1 ? "is" : "are"} ready`,
    html: layout({
      preview: `We found ${people} who've dealt with ${p.problemArea}.`,
      eyebrow: "Matches ready",
      heading: `We found ${people}, ${p.customerName}`,
      body:
        para(
          `Our team went through your business challenge by hand and picked ${people} who've actually dealt with it. Every one is identity-checked, reference-verified and insured.`,
        ) +
        infoPanel([
          { label: "Challenge", value: p.problemArea },
          { label: "Industry", value: p.industry },
          { label: "Shortlist", value: `${p.advisorCount} verified ${p.advisorCount === 1 ? "advisor" : "advisors"}` },
        ]),
      cta: { label: `View your ${noun}`, url: p.url },
      note: "Sessions have a fixed scope and price, and payment is held until you've met.",
      footerReason: "You're receiving this because you posted a business challenge on Whetstone.",
    }),
  };
}

/**
 * To the client: the advisor has marked the work done and we need them to accept
 * before the advisor is paid. This is the one email in the completion flow that
 * asks for an action, so it states the auto-accept deadline plainly rather than
 * springing it on them later.
 */
export function completionAwaitingConfirmationEmail(p: {
  customerName: string;
  advisorName: string;
  scope: string;
  sessionsLabel: string;
  deadline: string;
  url: string;
}): EmailContent {
  return {
    subject: `${p.advisorName} has marked your session complete`,
    html: layout({
      preview: `Confirm your session with ${p.advisorName} so they can be paid.`,
      eyebrow: "Confirm completion",
      heading: `One last step, ${p.customerName}`,
      body:
        para(
          `<strong style="color:${INK}">${esc(p.advisorName)}</strong> has marked your work together as complete. Have a quick look, and if you're happy, confirm it — that's what releases their payment from the hold.`,
        ) +
        infoPanel([
          { label: "Advisor", value: p.advisorName },
          { label: "Sessions", value: p.sessionsLabel },
          { label: "Focus", value: p.scope },
        ]),
      cta: { label: "Review and confirm", url: p.url },
      note: `If we don't hear from you by ${p.deadline}, we'll confirm it automatically. Not right? Open the link above and tell us what went wrong instead — our team will step in before any money moves.`,
      footerReason: "You're receiving this because you have a session on Whetstone awaiting your confirmation.",
    }),
  };
}

/** To the client: the day-3 nudge before the day-7 auto-accept. */
export function completionReminderEmail(p: {
  customerName: string;
  advisorName: string;
  deadline: string;
  url: string;
}): EmailContent {
  return {
    subject: `Reminder: confirm your session with ${p.advisorName}`,
    html: layout({
      preview: `Your confirmation is still outstanding.`,
      eyebrow: "Still waiting",
      heading: "Just a nudge",
      body: para(
        `${esc(p.customerName)}, <strong style="color:${INK}">${esc(p.advisorName)}</strong> is still waiting on your confirmation for your recent session. It takes one click, and it's what releases their payment.`,
      ),
      cta: { label: "Confirm completion", url: p.url },
      note: `We'll confirm this automatically on ${p.deadline} if we haven't heard from you. If something wasn't right, open the link and tell us instead.`,
      footerReason: "You're receiving this because you have a session on Whetstone awaiting your confirmation.",
    }),
  };
}

/**
 * To the client: the booking is done and we'd like feedback. Deliberately
 * separate from the confirmation step — accepting shouldn't be held hostage to
 * filling in a survey, so this is an invitation with nothing riding on it.
 */
export function reviewInviteEmail(p: {
  customerName: string;
  advisorName: string;
  autoAccepted: boolean;
  url: string;
}): EmailContent {
  const opening = p.autoAccepted
    ? `Your session with <strong style="color:${INK}">${esc(p.advisorName)}</strong> was confirmed automatically after the review window closed, and their payment has been released.`
    : `Thanks for confirming — <strong style="color:${INK}">${esc(p.advisorName)}</strong> has been paid.`;
  return {
    subject: `How was your session with ${p.advisorName}?`,
    html: layout({
      preview: `Tell us how ${p.advisorName} did.`,
      eyebrow: "Your feedback",
      heading: `How did it go, ${p.customerName}?`,
      body: para(
        `${opening} If you have 20 seconds, tell us how it went — it's the main thing that decides who we put in front of the next person with your problem.`,
      ),
      cta: { label: "Leave feedback", url: p.url },
      note: "Entirely optional, and it stays anonymous to other clients.",
      footerReason: "You're receiving this because you completed a session on Whetstone.",
    }),
  };
}

/**
 * To ops: a party has flagged a problem. Goes to the ops queue regardless (the
 * Dispute row is what drives Screen 15) — this is the push so nobody has to be
 * watching the dashboard for a booking where money is sitting in the balance.
 */
export function opsDisputeAlertEmail(p: {
  bookingId: string;
  raisedByLabel: string;
  advisorName: string;
  customerName: string;
  amount: string;
  notes: string;
  url: string;
}): EmailContent {
  const trimmed = p.notes.length > 400 ? `${p.notes.slice(0, 400)}…` : p.notes;
  return {
    subject: `[Ops] Problem reported on booking ${p.bookingId}`,
    html: layout({
      preview: `${p.raisedByLabel} reported a problem — payment is on hold.`,
      eyebrow: "Needs investigation",
      heading: "A booking has been flagged",
      body:
        para(
          `<strong style="color:${INK}">${esc(p.raisedByLabel)}</strong> reported a problem. The booking is marked disputed and its payment stays held until this is resolved.`,
        ) +
        infoPanel([
          { label: "Booking", value: p.bookingId },
          { label: "Client", value: p.customerName },
          { label: "Advisor", value: p.advisorName },
          { label: "Held", value: p.amount },
        ]) +
        panel(
          `<div style="font-family:${FONT};font-size:15px;line-height:1.5;color:${INK};border-left:3px solid ${BLUE};padding-left:14px;">${esc(trimmed)}</div>`,
        ),
      cta: { label: "Open in ops", url: p.url },
      note: "Resolving the dispute releases the payment to the advisor; refunding it cancels the booking.",
      footerReason: "You're receiving this because you're an ops admin on Whetstone.",
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
      eyebrow: "Payout released",
      heading: "Payout released",
      body:
        para(`Nice work, ${esc(p.advisorName)}. Your earnings for a completed session have been released.`) +
        panel(
          `<div style="font-family:${FONT};font-size:28px;font-weight:bold;color:${GREEN};letter-spacing:-0.5px;">${esc(p.amount)}</div>` +
            `<div style="font-family:${FONT};font-size:13px;color:${MUTED};margin-top:4px;">released to your connected account</div>`,
        ),
      cta: { label: "View earnings", url: p.url },
      footerReason: "You're receiving this because you're an advisor on Whetstone.",
    }),
  };
}
