import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Eyebrow } from "@/components/ui";

/**
 * Shared shell for the static legal pages (Terms, Privacy). Renders inside the
 * customer pill-nav shell. Sections are passed as {heading, body[]} so both pages
 * read consistently.
 */
export interface LegalSection {
  heading: string;
  body: string[];
}

export function LegalPage({
  eyebrow,
  title,
  updated,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <div className="mx-auto max-w-[760px]">
      <Link
        href="/"
        className="mb-5 inline-flex items-center gap-1 text-sm font-medium text-gray-500 transition hover:text-ink"
      >
        <ChevronLeft size={16} strokeWidth={2} />
        Back home
      </Link>

      <div className="rounded-xl bg-white p-8 shadow-card sm:p-11">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="mt-3 text-h1 text-ink">{title}</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated {updated}</p>
        <p className="mt-6 text-body-lg leading-relaxed text-gray-700">{intro}</p>

        <div className="mt-8 flex flex-col gap-8">
          {sections.map((s, i) => (
            <section key={s.heading}>
              <h2 className="text-h3 text-ink">
                <span className="ws-mono mr-2 text-gray-400">{String(i + 1).padStart(2, "0")}</span>
                {s.heading}
              </h2>
              <div className="mt-2 flex flex-col gap-3">
                {s.body.map((p, j) => (
                  <p key={j} className="text-body leading-relaxed text-gray-600">
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-10 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
          This is a plain-language template for the Whetstone MVP. It is not legal
          advice; have it reviewed by qualified counsel before you rely on it in
          production.
        </p>
      </div>
    </div>
  );
}
