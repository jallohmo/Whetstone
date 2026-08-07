-- 0004_rls_gaps.sql
-- Closes RLS gaps flagged by the Supabase security advisor after the initial
-- policy set (0002 covered the "minimum" tables; this covers the rest).
--
-- Context: the Next app talks to Postgres via Prisma (the postgres role, which
-- BYPASSES RLS) with authorization enforced in Server Actions. These policies are
-- defense-in-depth for the auto-exposed PostgREST API surface, so tightening them
-- never affects the app's own queries.

-- Reference data: public READ, no public writes (service role seeds/edits).
alter table public.industry_taxonomy enable row level security;
create policy taxonomy_public_read on public.industry_taxonomy for select using (true);

alter table public.packages enable row level security;
create policy packages_public_read on public.packages for select using (true);

-- Advisor<->specialty join: public read (specialties shown on public profiles).
alter table public."_AdvisorSpecialties" enable row level security;
create policy advisor_specialties_public_read on public."_AdvisorSpecialties" for select using (true);

-- Availability: public read (shown to prospective customers); owner/OPS writes.
alter table public.availability_slots enable row level security;
create policy availability_public_read on public.availability_slots for select using (true);
create policy availability_owner_write on public.availability_slots
  for all using (
    public.is_ops()
    or advisor_id in (select id from public.advisor_profiles where user_id = auth.uid()::text)
  )
  with check (
    public.is_ops()
    or advisor_id in (select id from public.advisor_profiles where user_id = auth.uid()::text)
  );

-- Reviews: public read (shown on profiles); the booking's customer can write.
alter table public.reviews enable row level security;
create policy reviews_public_read on public.reviews for select using (true);
create policy reviews_party_insert on public.reviews
  for insert with check (public.is_booking_party(booking_id));

-- Customer profiles: SENSITIVE — owner + OPS only.
alter table public.customer_profiles enable row level security;
create policy customer_profiles_self on public.customer_profiles
  for select using (user_id = auth.uid()::text or public.is_ops());
create policy customer_profiles_self_insert on public.customer_profiles
  for insert with check (user_id = auth.uid()::text);
create policy customer_profiles_self_update on public.customer_profiles
  for update using (user_id = auth.uid()::text or public.is_ops());

-- Outcome surveys: SENSITIVE — booking parties + OPS.
alter table public.outcome_surveys enable row level security;
create policy outcome_surveys_read on public.outcome_surveys
  for select using (public.is_ops() or public.is_booking_party(booking_id));
create policy outcome_surveys_party_insert on public.outcome_surveys
  for insert with check (public.is_booking_party(booking_id));

-- Trigger-only function should not be RPC-callable; the trigger still fires
-- (it runs in the table-owner context, independent of these grants).
revoke execute on function public.handle_new_user() from anon, authenticated, public;

-- Note: is_ops() / is_booking_party() / current_user_role() remain EXECUTE-able
-- by anon/authenticated on purpose — the RLS policies above call them, so the
-- roles that trigger those policies must be able to execute them. They return
-- null/false for anonymous callers and only ever reveal a user's own membership.
