import {
  matchesReadyEmail,
  bookingConfirmedEmail,
  completionAwaitingConfirmationEmail,
  reviewInviteEmail,
  opsDisputeAlertEmail,
} from "@/lib/email/templates";

/**
 * Email templates are pure string builders, so they are the one part of the
 * notification path that can be asserted without a transport. The value here is
 * escaping (client-supplied text lands in HTML) and the singular/plural forms,
 * which are easy to get wrong and visible to every recipient.
 */
describe("email templates", () => {
  const base = {
    customerName: "Mo",
    problemArea: "cash flow",
    industry: "Hospitality",
    url: "https://app.whetstone.au/needs/abc123/matches",
  };

  describe("matchesReadyEmail", () => {
    it("uses singular wording for one advisor", () => {
      const { subject, html } = matchesReadyEmail({ ...base, advisorCount: 1 });
      expect(subject).toBe("Your Whetstone match is ready");
      expect(html).toContain("We found one person");
      expect(html).toContain("1 verified advisor");
      expect(html).not.toContain("advisors");
    });

    it("uses plural wording for several advisors", () => {
      const { subject, html } = matchesReadyEmail({ ...base, advisorCount: 3 });
      expect(subject).toBe("Your Whetstone matches are ready");
      expect(html).toContain("We found 3 people");
      expect(html).toContain("3 verified advisors");
    });

    it("links the CTA straight to the shortlist, not the dashboard", () => {
      const { html } = matchesReadyEmail({ ...base, advisorCount: 2 });
      expect(html).toContain(base.url);
    });

    it("carries the challenge and industry so the email stands alone", () => {
      const { html } = matchesReadyEmail({ ...base, advisorCount: 2 });
      expect(html).toContain("cash flow");
      expect(html).toContain("Hospitality");
    });

    it("escapes client-supplied text rather than injecting it as markup", () => {
      const { html } = matchesReadyEmail({
        ...base,
        problemArea: '<script>alert("xss")</script>',
        advisorCount: 1,
      });
      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
    });

    it("escapes a name containing HTML characters", () => {
      const { html } = matchesReadyEmail({
        ...base,
        customerName: "Tom & Jerry <Ltd>",
        advisorCount: 1,
      });
      expect(html).toContain("&amp;");
      expect(html).not.toContain("<Ltd>");
    });

    it("says why the recipient got it", () => {
      const { html } = matchesReadyEmail({ ...base, advisorCount: 1 });
      expect(html).toContain("you posted a business challenge");
    });
  });

  describe("bookingConfirmedEmail", () => {
    it("includes the advisor, scope and a link", () => {
      const { subject, html } = bookingConfirmedEmail({
        customerName: "Mo",
        advisorName: "Dana",
        when: "Mon 3 Mar, 10:00",
        scope: "Two sessions on pricing",
        url: "https://app.whetstone.au/bookings/b1/messages",
      });
      expect(subject).toContain("confirmed");
      expect(html).toContain("Dana");
      expect(html).toContain("Two sessions on pricing");
      expect(html).toContain("https://app.whetstone.au/bookings/b1/messages");
    });

    it("omits the time row when no session is scheduled yet", () => {
      const { html } = bookingConfirmedEmail({
        customerName: "Mo",
        advisorName: "Dana",
        when: null,
        scope: "Two sessions on pricing",
        url: "https://app.whetstone.au/bookings/b1/messages",
      });
      expect(html).not.toContain(">When<");
    });
  });
});

/**
 * The completion flow's emails. These carry the one thing the client must act on
 * (confirming, which releases the advisor's payment) and the deadline after which
 * we act for them, so the deadline and the CTA are worth pinning.
 */
describe("completion emails", () => {
  const base = {
    customerName: "Mo",
    advisorName: "Dana Whitfield",
    url: "https://app.whetstone.au/bookings/b1/confirm-completion",
  };

  describe("completionAwaitingConfirmationEmail", () => {
    const email = () =>
      completionAwaitingConfirmationEmail({
        ...base,
        scope: "cash flow forecasting",
        sessionsLabel: "2 sessions",
        deadline: "Sunday, 8 March",
      });

    it("names the advisor in the subject so it's actionable from the inbox", () => {
      expect(email().subject).toContain("Dana Whitfield");
    });

    it("states the auto-confirm deadline rather than springing it later", () => {
      expect(email().html).toContain("Sunday, 8 March");
    });

    it("says plainly that confirming is what releases the payment", () => {
      expect(email().html).toMatch(/releases their payment/i);
    });

    it("points at the confirm screen, not the message thread", () => {
      expect(email().html).toContain(base.url);
    });

    it("offers the something-went-wrong route too", () => {
      expect(email().html).toMatch(/went wrong/i);
    });
  });

  describe("reviewInviteEmail", () => {
    it("thanks a client who confirmed themselves", () => {
      const { html } = reviewInviteEmail({ ...base, autoAccepted: false });
      expect(html).toMatch(/Thanks for confirming/i);
      expect(html).not.toMatch(/automatically/i);
    });

    it("explains the auto-confirm instead of thanking a client who never acted", () => {
      const { html } = reviewInviteEmail({ ...base, autoAccepted: true });
      expect(html).toMatch(/confirmed automatically/i);
      expect(html).not.toMatch(/Thanks for confirming/i);
    });

    it("keeps feedback optional — nothing is riding on it by this point", () => {
      const { html } = reviewInviteEmail({ ...base, autoAccepted: false });
      expect(html).toMatch(/optional/i);
    });
  });

  describe("opsDisputeAlertEmail", () => {
    const email = () =>
      opsDisputeAlertEmail({
        bookingId: "bk_123",
        raisedByLabel: "The client (Acme Pty Ltd)",
        advisorName: "Dana Whitfield",
        customerName: "Acme Pty Ltd",
        amount: "A$1,200.00",
        notes: "The advisor never joined the call.",
        url: "https://app.whetstone.au/ops/disputes/d1",
      });

    it("is identifiable as an ops alert in a busy inbox", () => {
      expect(email().subject).toContain("[Ops]");
      expect(email().subject).toContain("bk_123");
    });

    it("carries the held amount, which is what makes it urgent", () => {
      expect(email().html).toContain("A$1,200.00");
    });

    it("includes what was actually reported", () => {
      expect(email().html).toContain("The advisor never joined the call.");
    });

    it("escapes the reporter's free text — it lands straight in HTML", () => {
      const { html } = opsDisputeAlertEmail({
        bookingId: "bk_1",
        raisedByLabel: "The client (Acme)",
        advisorName: "Dana",
        customerName: "Acme",
        amount: "A$10.00",
        notes: '<script>alert("xss")</script>',
        url: "https://app.whetstone.au/ops/disputes/d1",
      });
      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
    });

    it("truncates a very long report rather than mailing an essay", () => {
      const { html } = opsDisputeAlertEmail({
        bookingId: "bk_1",
        raisedByLabel: "The client (Acme)",
        advisorName: "Dana",
        customerName: "Acme",
        amount: "A$10.00",
        notes: "x".repeat(600),
        url: "https://app.whetstone.au/ops/disputes/d1",
      });
      expect(html).toContain("…");
      expect(html).not.toContain("x".repeat(500));
    });
  });
});
