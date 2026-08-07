import { PageHeader, Card, Field, Input, Button, ScaffoldNote } from "@/components/ui";

// Auth entry. Supabase Auth (magic link or password). role is written to
// public.users server-side via the auth trigger — never trusted from the client.
export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm">
      <PageHeader title="Sign in" />
      <Card>
        <form>
          <Field label="Email">
            <Input type="email" name="email" placeholder="you@business.com" required />
          </Field>
          <Button type="submit" className="w-full">Send magic link</Button>
        </form>
      </Card>
      <div className="mt-6">
        <ScaffoldNote>
          Wire to <code className="font-mono">supabase.auth.signInWithOtp</code> (or password). Ops
          accounts are invite-only via <code className="font-mono">inviteUserByEmail</code> — no public
          signup path for OPS_ADMIN, ever.
        </ScaffoldNote>
      </div>
    </div>
  );
}
