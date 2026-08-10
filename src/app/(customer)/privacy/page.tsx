import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy — Whetstone",
  description: "How Whetstone collects, uses, and protects your data.",
};

// Static content — no data dependency.
export const dynamic = "force-static";

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      updated="10 August 2026"
      intro="This policy explains what information Whetstone collects, why, and the choices you have. We collect the minimum needed to match you well, run bookings, and keep the marketplace trustworthy."
      sections={[
        {
          heading: "Information we collect",
          body: [
            "Account details: your email and role, created when you sign up. Authentication is handled by our identity provider; we never store your password.",
            "Profile and needs: for customers, the industry and problem details you describe; for advisors, your background, specialties, years of experience, and the credential documents you upload for verification.",
            "Booking and payment records: sessions, messages exchanged on the platform, and payment status. Card details are handled by our payment processor, not stored by us.",
          ],
        },
        {
          heading: "How we use it",
          body: [
            "To match customers with relevant advisors, run the booking and session flow, process held payments and payouts, and verify advisors.",
            "To keep the marketplace safe — investigating disputes and preventing abuse — and to send you transactional email about your account and bookings.",
          ],
        },
        {
          heading: "Sharing",
          body: [
            "The two parties to a booking see what they need to work together (for example, a customer sees a matched advisor’s profile; an advisor sees the customer’s stated problem).",
            "We share data with processors that run the platform — our hosting, database, authentication, payment, and video providers — under agreements that restrict their use of it. We do not sell your personal information.",
          ],
        },
        {
          heading: "Storage and security",
          body: [
            "Credential documents are stored in a private bucket accessible only to you and our verification team. Access to personal data is governed by row-level security so users can only reach records they’re entitled to.",
            "No system is perfectly secure, but we apply industry-standard measures and least-privilege access throughout.",
          ],
        },
        {
          heading: "Retention",
          body: [
            "We keep account, booking, and payment records for as long as your account is active and as needed to meet legal, tax, and dispute-resolution obligations, then delete or anonymise them.",
          ],
        },
        {
          heading: "Your choices",
          body: [
            "You can access and update your profile in-product, and request deletion of your account. Some records (for example, payment history) may be retained where the law requires.",
            "You can opt out of non-essential email; transactional messages about your bookings will still be sent.",
          ],
        },
        {
          heading: "Contact",
          body: [
            "For privacy questions or requests, use the contact address published on our site.",
          ],
        },
      ]}
    />
  );
}
