import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Whetstone — advice from people who've actually done it",
  description:
    "A verified, insured marketplace connecting business owners with semi-retired and retired professionals for bounded advisory sessions — in any industry, anywhere in the world.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
