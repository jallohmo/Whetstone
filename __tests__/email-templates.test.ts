import {
  matchesReadyEmail,
  bookingConfirmedEmail,
  completionAwaitingConfirmationEmail,
  reviewInviteEmail,
  opsDisputeAlertEmail,
  needPostedEmail,
  paymentReminderEmail,
  bookingExpiredEmail,
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

  describe("needPostedEmail", () => {
    const opsBase = {
      businessName: "Jalloh Coffee",
      problemArea: "cash flow",
      industry: "Hospitality",
      description: "We're three months behind on supplier terms and need help renegotiating.",
      url: "https://app.whetstone.au/ops/needs/abc123/match",
    };

    it("names the challenge in the subject so the queue is triageable from the inbox", () => {
      const { subject } = needPostedEmail(opsBase);
      expect(subject).toBe("New need to match: cash flow");
    });

    it("carries the client, industry and description so ops can triage without opening it", () => {
      const { html } = needPostedEmail(opsBase);
      expect(html).toContain("Jalloh Coffee");
      expect(html).toContain("Hospitality");
      expect(html).toContain("renegotiating");
    });

    it("links the CTA to the matching workbench, not the client-facing shortlist", () => {
      const { html } = needPostedEmail(opsBase);
      expect(html).toContain(opsBase.url);
      expect(html).not.toContain("/needs/abc123/matches");
    });

    it("truncates a long description rather than mailing the whole essay", () => {
      const { html } = needPostedEmail({ ...opsBase, description: "a".repeat(600) });
      expect(html).toContain("…");
      expect(html).not.toContain("a".repeat(401));
    });

    it("escapes client-supplied text rather than injecting it as markup", () => {
      const { html } = needPostedEmail({
        ...opsBase,
        businessName: "Tom & Jerry <Ltd>",
        description: '<script>alert("xss")</script>',
      });
      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
      expect(html).toContain("&amp;");
      expect(html).not.toContain("<Ltd>");
    });

    it("reads as an internal alert, not a client email with account settings", () => {
      const { html } = needPostedEmail(opsBase);
      expect(html).toContain("ops matching rota");
      expect(html).toContain("OPS_ALERT_EMAIL");
      expect(html).not.toContain("Manage which emails you receive");
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

  /**
   * The unpaid-booking pair. Both carry client-supplied scope text, and the
   * reminder is the only warning before the sweep cancels the booking — so the
   * deadline and the checkout link have to actually be in it.
   */
  describe("paymentReminderEmail", () => {
    const unpaid = {
      customerName: "Mo",
      advisorName: "Dana",
      when: "Tue, 3 Mar, 10:00 am",
      scope: "Cash flow forecasting",
      price: "$450.00",
      deadline: "Wed, 4 Mar, 9:00 am",
      url: "https://app.whetstone.au/bookings/abc123/checkout",
    };

    it("sends the client to checkout, not the thread", () => {
      const { html } = paymentReminderEmail(unpaid);
      expect(html).toContain("https://app.whetstone.au/bookings/abc123/checkout");
      expect(html).not.toContain("/messages");
    });

    it("states the deadline and the price", () => {
      const { subject, html } = paymentReminderEmail(unpaid);
      expect(subject).toBe("Finish booking your Whetstone session");
      expect(html).toContain("Wed, 4 Mar, 9:00 am");
      expect(html).toContain("$450.00");
    });

    it("makes clear the booking is not yet confirmed", () => {
      const { html } = paymentReminderEmail(unpaid);
      expect(html).toContain("isn't confirmed yet");
    });

    it("escapes client-supplied scope text", () => {
      const { html } = paymentReminderEmail({
        ...unpaid,
        scope: '<script>alert("xss")</script>',
      });
      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
    });

    it("omits the time row when no session is scheduled yet", () => {
      const { html } = paymentReminderEmail({ ...unpaid, when: null });
      expect(html).not.toContain("Tue, 3 Mar");
    });
  });

  describe("bookingExpiredEmail", () => {
    const expired = {
      customerName: "Mo",
      advisorName: "Dana",
      scope: "Cash flow forecasting",
      url: "https://app.whetstone.au/advisors",
    };

    it("reassures the client they were not charged", () => {
      const { subject, html } = bookingExpiredEmail(expired);
      expect(subject).toBe("Your Whetstone booking has been released");
      expect(html).toContain("haven't been charged");
    });

    it("escapes client-supplied scope text", () => {
      const { html } = bookingExpiredEmail({ ...expired, scope: "<b>x</b>" });
      expect(html).not.toContain("<b>x</b>");
      expect(html).toContain("&lt;b&gt;");
    });
  });
});