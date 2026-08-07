-- 0005_hide_stripe_account_id.sql
-- advisor_profiles is publicly readable for VERIFIED advisors (0002), so the
-- Stripe Connect account id added in the Slice 3 schema change would otherwise be
-- exposed through the PostgREST API. Revoke column-level SELECT for the public
-- API roles. The app reads it via Prisma (postgres role), which is unaffected.
revoke select (stripe_account_id) on public.advisor_profiles from anon, authenticated;
