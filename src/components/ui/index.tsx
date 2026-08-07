import { cn } from "@/lib/cn";
import type { ComponentProps, ReactNode } from "react";

/**
 * Minimal UI kit built on the Whetstone design tokens.
 * Role-of-colour rule is baked into defaults here: primary = ink (#111114), NOT blue.
 */

export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: "primary" | "secondary" | "ghost" }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-body font-semibold transition duration-DEFAULT ease-soft disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    primary: "bg-ink text-white shadow-ink-glow hover:-translate-y-px",
    secondary: "bg-white text-ink border border-gray-200 hover:border-gray-300",
    ghost: "text-ink hover:bg-gray-100",
  } as const;
  return <button className={cn(base, variants[variant], className)} {...props} />;
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

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "w-full rounded-sm border border-gray-200 bg-white px-3 py-2.5 text-body text-ink placeholder:text-gray-400 outline-none focus:border-ink",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "w-full rounded-sm border border-gray-200 bg-white px-3 py-2.5 text-body text-ink placeholder:text-gray-400 outline-none focus:border-ink",
        className,
      )}
      {...props}
    />
  );
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

/** A soft "not built yet" marker so scaffolded screens are honest about their state. */
export function ScaffoldNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500">
      {children}
    </div>
  );
}
