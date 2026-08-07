import { signOut } from "@/lib/actions/auth";

/** Posts to the signOut server action. Usable in any server layout. */
export function SignOutButton({ className }: { className?: string }) {
  return (
    <form action={signOut}>
      <button type="submit" className={className}>
        Sign out
      </button>
    </form>
  );
}
