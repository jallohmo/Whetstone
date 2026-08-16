import { matchesReadyEmail, bookingConfirmedEmail } from "@/lib/email/templates";

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
