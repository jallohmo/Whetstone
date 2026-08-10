import type { ReactNode } from "react";

/** A titled, anchor-targetable card for the right column of the account pages. */
export function AccountSection({
  id,
  title,
  description,
  children,
  tone = "default",
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <section
      id={id}
      className={
        tone === "danger"
          ? "scroll-mt-24 rounded-xl border border-red-500/40 bg-white p-card shadow-card"
          : "scroll-mt-24 rounded-xl bg-white p-card shadow-card"
      }
    >
      <h2 className={tone === "danger" ? "text-h3 text-red-700" : "text-h3 text-ink"}>{title}</h2>
      {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}
