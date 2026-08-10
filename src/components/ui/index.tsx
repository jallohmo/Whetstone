import { cn } from "@/lib/cn";
import type { ComponentProps, ReactNode } from "react";

/**
 * Minimal UI kit built on the Whetstone design tokens.
 * Role-of-colour rule is baked into defaults here: primary = ink (#111114), NOT blue.
 */

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "lg";
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition duration-DEFAULT ease-soft outline-none focus-visible:shadow-focus disabled:opacity-50 disabled:pointer-events-none";
  const sizes = {
    md: "px-4 py-2.5 text-body",
    lg: "px-6 py-3.5 text-body-lg",
  } as const;
  const variants = {
    primary:
      "bg-ink text-white shadow-ink-glow hover:-translate-y-px hover:shadow-ink-glow-lg",
    secondary:
      "bg-white text-ink border border-gray-200 hover:-translate-y-px hover:border-gray-300",
    ghost: "text-ink hover:bg-gray-100",
  } as const;
  return (
    <button className={cn(base, sizes[size], variants[variant], className)} {...props} />
  );
}

export function Card({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 bg-white p-card shadow-card",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Shared field chrome — blue 1.5px border + soft focus ring, per the design system.
const fieldBase =
  "w-full rounded-sm border border-gray-200 bg-white px-3 py-2.5 text-body text-ink placeholder:text-gray-400 outline-none transition duration-DEFAULT ease-soft focus:border-brand-blue focus:shadow-focus";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(fieldBase, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(fieldBase, className)} {...props} />;
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    <label
      className={cn("mb-1.5 block text-sm font-semibold text-ink", className)}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-page-gap">
      <Label>{label}</Label>
      {children}
      {hint && <p className="mt-1.5 text-sm text-gray-500">{hint}</p>}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="mb-8">
      <h1 className="text-h1 text-ink">{title}</h1>
      {subtitle && <p className="mt-2 max-w-2xl text-body-lg text-gray-500">{subtitle}</p>}
    </header>
  );
}

/**
 * Uppercase eyebrow label — 11–12px / 600 / letter-spacing .1em. Sits above
 * section titles and hero copy. `tone` maps to the role-of-colour palette.
 */
export function Eyebrow({
  children,
  tone = "muted",
  className,
}: {
  children: ReactNode;
  tone?: "muted" | "blue" | "blue-300" | "green";
  className?: string;
}) {
  const tones = {
    muted: "text-gray-500",
    blue: "text-brand-blue-600",
    "blue-300": "text-brand-blue/70",
    green: "text-green-700",
  } as const;
  return (
    <span
      className={cn(
        "text-2xs font-semibold uppercase tracking-[0.12em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** A soft "not built yet" marker so scaffolded screens are honest about their state. */
export function ScaffoldNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500">
      {children}
    </div>
  );
}
