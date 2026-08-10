-- 0007_account_profile_columns.sql
-- Columns backing the Account & profile screens (9c / 14c). Prisma is the table
-- source of truth (schema.prisma); this migration mirrors those additions so the
-- hosted DB can be brought forward via the supabase/migrations path too, and it
-- carries the grant tightening Prisma can't express. All ADDs are idempotent.

-- users: per-key notification preferences (owner-only readable under 0002 RLS).
alter table public.users
  add column if not exists notification_prefs jsonb;

-- customer_profiles: profile PII + Stripe customer id. The table is owner+OPS-only
-- (0004), so these need no extra column grants — they are never publicly exposed.
alter table public.customer_profiles
  add column if not exists full_name          text,
  add column if not exists phone              text,
  add column if not exists avatar_url         text,
  add column if not exists stripe_customer_id text;

-- advisor_profiles: payout-schedule preference + soft-deactivation timestamp.
alter table public.advisor_profiles
  add column if not exists weekly_payouts boolean not null default true,
  add column if not exists deactivated_at timestamptz;

-- advisor_profiles is PUBLICLY readable for VERIFIED advisors (0002), so — as with
-- stripe_account_id in 0005 — keep the payout preference off the public PostgREST
-- surface. The app reads it via Prisma (postgres role), which is unaffected.
revoke select (weekly_payouts) on public.advisor_profiles from anon, authenticated;
