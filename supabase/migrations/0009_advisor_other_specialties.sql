-- 0009_advisor_other_specialties.sql
-- Free-text "other" industry/capability an advisor can add when the taxonomy's
-- "Other" pill doesn't fit. Prisma is the table source of truth (schema.prisma);
-- this mirrors the addition for the supabase/migrations apply path. Idempotent.
-- advisor_profiles is publicly readable for verified advisors (0002), but this is
-- an internal review field, so keep it off the public PostgREST surface — same
-- guard as stripe_account_id (0005) and weekly_payouts (0007).

alter table public.advisor_profiles
  add column if not exists other_specialties text;

revoke select (other_specialties) on public.advisor_profiles from anon, authenticated;
