import { Lightbulb } from "lucide-react";

/**
 * The component most directly created by the scope broadening to all industries.
 * A short, plain-language line connecting an advisor's specific background to the
 * customer's specific industry/problem — relevance is no longer implicit from a
 * single-vertical context, so it gets real design/copy attention here.
 *
 * e.g. "12 years running a regional manufacturing business, now advises on cash
 * flow and compliance."
 */
export function RelevanceExplainer({ text }: { text: string }) {
  return (
    <p className="flex items-start gap-2 rounded-md bg-amber-100 px-3 py-2 text-sm text-amber-700">
      <Lightbulb size={16} className="mt-0.5 shrink-0" strokeWidth={2} />
      <span className="text-ink/80">{text}</span>
    </p>
  );
}
