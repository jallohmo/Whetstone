import { cn } from "@/lib/cn";

/**
 * Controlled-vocabulary tag rendered from the structured IndustryTaxonomy
 * (industry -> sub-specialty), never a hardcoded option list. Used on need
 * posting, advisor profiles, the matching workbench, and ops verification.
 */
export function IndustryTag({
  name,
  variant = "industry",
}: {
  name: string;
  variant?: "industry" | "specialty";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-2.5 py-1 text-xs font-medium",
        variant === "industry"
          ? "bg-brand-blue-100 text-brand-blue-600"
          : "bg-gray-100 text-gray-700",
      )}
    >
      {name}
    </span>
  );
}

/** Convenience alias — the component brief refers to both IndustryTag and SpecialtyTag. */
export function SpecialtyTag({ name }: { name: string }) {
  return <IndustryTag name={name} variant="specialty" />;
}
