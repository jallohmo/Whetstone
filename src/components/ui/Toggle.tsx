import { cn } from "@/lib/cn";

/**
 * 38×22 pill switch (design system): ink track when on, gray-300 off, 18px white
 * knob. Built on a native checkbox so it works inside server-action forms and is
 * keyboard-accessible; descendants react via `group-has-[:checked]`. Use the
 * `disabled` state for not-yet-wired ("coming soon") settings.
 */
export function Toggle({
  name,
  value = "on",
  defaultChecked,
  disabled,
  "aria-label": ariaLabel,
  className,
}: {
  name?: string;
  value?: string;
  defaultChecked?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "group inline-flex shrink-0 cursor-pointer items-center",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        disabled={disabled}
        aria-label={ariaLabel}
        className="sr-only"
      />
      <span className="flex h-[22px] w-[38px] items-center rounded-pill bg-gray-300 p-0.5 transition-colors duration-DEFAULT ease-soft group-has-[:checked]:bg-ink group-has-[:focus-visible]:shadow-focus">
        <span className="h-[18px] w-[18px] rounded-pill bg-white shadow-sm transition-transform duration-DEFAULT ease-soft group-has-[:checked]:translate-x-4" />
      </span>
    </label>
  );
}
