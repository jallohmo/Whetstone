import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

/**
 * Selection primitives for the refresh, built on native inputs + Tailwind's
 * `group-has-[:checked]` so they work inside the existing server-action forms
 * with no client JS and no controlled state. The label is the `group`; the input
 * is a visually-hidden child; descendants react to selection via
 * `group-has-[:checked]:*`. (Uses CSS `:has()` — supported in all target browsers.)
 *
 *  - RadioCard        package / time-slot cards (screen 5) — ink border + pip when selected
 *  - SegmentedControl Yes / Partially / No groups (screen 9) — ink fill when selected
 *  - PillToggle       specialty pills (screen 10) — blue-tint + check box when selected
 */

/** A large selectable card backed by a radio input. Wire `name`/`value` to the form. */
export function RadioCard({
  name,
  value,
  defaultChecked,
  disabled,
  children,
  className,
}: {
  name: string;
  value: string;
  defaultChecked?: boolean;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "group relative block cursor-pointer rounded-lg border border-gray-200 bg-white p-4 shadow-card transition duration-DEFAULT ease-soft",
        "hover:border-gray-300 has-[:checked]:border-[1.5px] has-[:checked]:border-ink has-[:checked]:shadow-md",
        "has-[:focus-visible]:shadow-focus",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        disabled={disabled}
        className="sr-only"
      />
      <span
        className="pointer-events-none absolute right-4 top-4 inline-flex h-[18px] w-[18px] items-center justify-center rounded-pill border border-gray-300 bg-white group-has-[:checked]:border-ink group-has-[:checked]:bg-ink"
        aria-hidden
      >
        <span className="h-1.5 w-1.5 rounded-pill bg-white opacity-0 group-has-[:checked]:opacity-100" />
      </span>
      {children}
    </label>
  );
}

/** A radio group rendered as an ink-fill segmented control. */
export function SegmentedControl({
  name,
  options,
  defaultValue,
  className,
}: {
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      className={cn("inline-flex rounded-md border border-gray-200 bg-gray-50 p-1", className)}
    >
      {options.map((opt) => (
        <label key={opt.value} className="group cursor-pointer">
          <input
            type="radio"
            name={name}
            value={opt.value}
            defaultChecked={defaultValue === opt.value}
            className="sr-only"
          />
          <span className="inline-flex select-none items-center justify-center rounded-[10px] px-4 py-2 text-sm font-semibold text-gray-600 transition duration-DEFAULT ease-soft group-has-[:checked]:bg-ink group-has-[:checked]:text-white group-has-[:checked]:shadow-ink-glow group-has-[:focus-visible]:shadow-focus">
            {opt.label}
          </span>
        </label>
      ))}
    </div>
  );
}

/** A toggle pill backed by a checkbox (multi-select) or radio. Blue-tint when on. */
export function PillToggle({
  name,
  value,
  type = "checkbox",
  defaultChecked,
  children,
  className,
}: {
  name: string;
  value: string;
  type?: "checkbox" | "radio";
  defaultChecked?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("group cursor-pointer", className)}>
      <input
        type={type}
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="sr-only"
      />
      <span className="inline-flex select-none items-center gap-2 rounded-pill border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition duration-DEFAULT ease-soft hover:border-gray-300 group-has-[:checked]:border-brand-blue/60 group-has-[:checked]:bg-brand-blue-100 group-has-[:checked]:text-brand-blue-600 group-has-[:focus-visible]:shadow-focus">
        <span
          className="inline-flex h-4 w-4 items-center justify-center rounded-xs border border-gray-300 bg-white text-white group-has-[:checked]:border-brand-blue group-has-[:checked]:bg-brand-blue"
          aria-hidden
        >
          <Check size={11} strokeWidth={3} className="opacity-0 group-has-[:checked]:opacity-100" />
        </span>
        {children}
      </span>
    </label>
  );
}
