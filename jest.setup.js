// Extra matchers (toBeInTheDocument, etc.) for any DOM-level test.
require("@testing-library/jest-dom");

// The email templates read NEXT_PUBLIC_SITE_URL at module load to build absolute
// asset/CTA URLs. Pin it so template snapshots are stable regardless of the
// developer's local .env.
process.env.NEXT_PUBLIC_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://app.whetstone.au";
