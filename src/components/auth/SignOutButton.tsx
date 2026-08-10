import type { ReactNode } from "react";
import { signOut } from "@/lib/actions/auth";

/**
 * Posts to the signOut server action. Usable in any server layout. Pass
 * `children` to replace the default "Sign out" label (e.g. an icon in the
 * advisor sidebar footer); `aria-label` keeps it accessible when iconified.
 */
export function SignOutButton({
  className,
  children,
  "aria-label": ariaLabel,
}: {
  className?: string;
  children?: ReactNode;
  "aria-label"?: string;
}) {
  return (
    <form action={signOut}>
      <button type="submit" className={className} aria-label={ariaLabel}>
        {children ?? "Sign out"}
      </button>
    </form>
  );
}
