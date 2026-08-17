import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const title = "Whetstone — advice from people who've actually done it";
const description =
  "A verified, insured marketplace connecting business owners with semi-retired and retired professionals for bounded advisory sessions — in any industry, anywhere in the world.";

export const metadata: Metadata = {
  // Absolute base for Open Graph / canonical URLs. Update if the domain changes.
  metadataBase: new URL("https://app.whetstone.au"),
  title,
  description,
  openGraph: {
    type: "website",
    siteName: "Whetstone",
    url: "/",
    title,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
