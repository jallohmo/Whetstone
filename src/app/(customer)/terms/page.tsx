import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service — Whetstone",
  description: "The terms that govern your use of Whetstone.",
};

// Static content — no data dependency.
export const dynamic = "force-static";

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of Service"
      updated="10 August 2026"
      intro="These terms govern your use of Whetstone, a marketplace that connects business owners with verified, semi-retired and retired professionals for bounded, insured advisory sessions. By creating an account or booking a session you agree to them."
      sections={[
        {
          heading: "Who we are, and what Whetstone is",
          body: [
            "Whetstone is a platform that introduces business owners (“clients”) to independent experts (“advisors”) and facilitates bounded advisory sessions between them. We verify advisors, hold payments, and provide the tools to meet and message.",
            "Whetstone is not a party to the advice given. Advisors are independent — they are not our employees or agents, and we do not supervise or direct the substance of their advice.",
          ],
        },
        {
          heading: "Accounts",
          body: [
            "You must provide accurate information and keep your login credentials secure. You are responsible for activity under your account.",
            "Advisor accounts require verification before a profile is listed or can take bookings. Ops accounts are invite-only.",
          ],
        },
        {
          heading: "Bookings, scope and payment",
          body: [
            "Every session has a fixed, bounded scope and a fixed price shown before you book. There are no open-ended hours.",
            "Payment is authorised at booking and held by our payment processor. Funds are released to the advisor, minus platform commission, after the session takes place. Currency is shown per booking.",
            "Cancellations and refunds are handled case by case through the dispute process below until a standalone refund policy is published.",
          ],
        },
        {
          heading: "Advisor verification and insurance",
          body: [
            "We identity-check and reference-verify advisors before listing them, and surface a verification badge on their profile. Verification is a good-faith check, not a guarantee of outcomes.",
            "Sessions are covered by Whetstone’s professional indemnity arrangement as described in-product at the time of booking. Coverage terms are surfaced at checkout and confirmation.",
          ],
        },
        {
          heading: "Acceptable use",
          body: [
            "Keep session-related communication on the platform. Do not use Whetstone to harass, defraud, or circumvent the platform’s payment and booking flow.",
            "Do not misrepresent your experience or credentials. We may suspend accounts that breach these terms.",
          ],
        },
        {
          heading: "Disputes",
          body: [
            "If something goes wrong with a session, raise it from the booking’s messages thread. Our team reviews reports and may hold or refund a payment while a dispute is open.",
          ],
        },
        {
          heading: "Liability",
          body: [
            "Whetstone provides the marketplace “as is”. To the extent permitted by law, we are not liable for the outcome of advice given by an independent advisor. Nothing in these terms limits liability that cannot be limited by law.",
          ],
        },
        {
          heading: "Changes and contact",
          body: [
            "We may update these terms; material changes will be notified in-product. Continued use after an update means you accept the revised terms.",
            "Questions about these terms can be sent to the contact address published on our site.",
          ],
        },
      ]}
    />
  );
}
