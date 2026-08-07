-- 0002_rls_policies.sql
-- Row Level Security. Supabase's security model depends on these, not just
-- application-layer checks. Written to match the minimum policies in 05b §2.
--
-- Table/column names are the snake_case ones Prisma emits (see schema.prisma @@map).
-- Advisor-profile ownership etc. resolve through the owning user_id -> auth.uid()::text.

-- Enable RLS everywhere that holds anything sensitive.
alter table public.users                enable row level security;
alter table public.advisor_profiles     enable row level security;
alter table public.verification_records enable row level security;
alter table public.needs                enable row level security;
alter table public.match_decisions      enable row level security;
alter table public.bookings             enable row level security;
alter table public.sessions             enable row level security;
alter table public.payments             enable row level security;
alter table public.messages             enable row level security;
alter table public.disputes             enable row level security;

-- ---------------------------------------------------------------------------
-- users: read/update own row; OPS reads all; role column never client-writable.
-- ---------------------------------------------------------------------------
create policy users_select_self on public.users
  for select using (id = auth.uid()::text or public.is_ops());

-- Update own row but NOT the role column (privilege-escalation guard). The role
-- is only ever written by the security-definer trigger / service role, both of
-- which bypass RLS, so no UPDATE policy exposes role to clients.
create policy users_update_self on public.users
  for update using (id = auth.uid()::text)
  with check (id = auth.uid()::text and role = (select role from public.users where id = auth.uid()::text));

-- ---------------------------------------------------------------------------
-- advisor_profiles: public reads ONLY where verified; owner reads/updates own
-- regardless of status; OPS reads/updates all.
-- ---------------------------------------------------------------------------
create policy advisor_public_read on public.advisor_profiles
  for select using (
    verification_status = 'VERIFIED'
    or user_id = auth.uid()::text
    or public.is_ops()
  );

create policy advisor_owner_update on public.advisor_profiles
  for update using (user_id = auth.uid()::text or public.is_ops());

create policy advisor_owner_insert on public.advisor_profiles
  for insert with check (user_id = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- verification_records: OPS only, both read and write. Internal evidence —
-- never exposed to advisor or customer.
-- ---------------------------------------------------------------------------
create policy verification_records_ops_all on public.verification_records
  for all using (public.is_ops()) with check (public.is_ops());

-- ---------------------------------------------------------------------------
-- needs: owning customer read/update own; matched advisors read matched needs;
-- OPS read/write all.
-- ---------------------------------------------------------------------------
create policy needs_customer_rw on public.needs
  for all using (
    public.is_ops()
    or customer_id in (
      select id from public.customer_profiles where user_id = auth.uid()::text
    )
  )
  with check (
    public.is_ops()
    or customer_id in (
      select id from public.customer_profiles where user_id = auth.uid()::text
    )
  );

create policy needs_matched_advisor_read on public.needs
  for select using (
    exists (
      select 1
      from public.match_decisions md
      join public.advisor_profiles ap on ap.id = md.advisor_chosen_id
      where md.need_id = needs.id and ap.user_id = auth.uid()::text
    )
  );

-- ---------------------------------------------------------------------------
-- match_decisions: OPS only, read + write. Never exposed client-side.
-- ---------------------------------------------------------------------------
create policy match_decisions_ops_all on public.match_decisions
  for all using (public.is_ops()) with check (public.is_ops());

-- ---------------------------------------------------------------------------
-- bookings / sessions / payments / messages: the two parties on the booking +
-- OPS; nobody else.
-- ---------------------------------------------------------------------------
create or replace function public.is_booking_party(_booking_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.bookings b
    left join public.customer_profiles cp on cp.id = b.customer_id
    left join public.advisor_profiles  ap on ap.id = b.advisor_id
    where b.id = _booking_id
      and (cp.user_id = auth.uid()::text or ap.user_id = auth.uid()::text)
  );
$$;

create policy bookings_parties on public.bookings
  for select using (public.is_ops() or public.is_booking_party(id));

create policy sessions_parties on public.sessions
  for select using (public.is_ops() or public.is_booking_party(booking_id));

create policy payments_parties on public.payments
  for select using (public.is_ops() or public.is_booking_party(booking_id));

create policy messages_parties_read on public.messages
  for select using (public.is_ops() or public.is_booking_party(booking_id));

create policy messages_parties_write on public.messages
  for insert with check (sender_id = auth.uid()::text and public.is_booking_party(booking_id));

-- ---------------------------------------------------------------------------
-- disputes: OPS read/write; the two parties on the booking get read-only.
-- ---------------------------------------------------------------------------
create policy disputes_ops_all on public.disputes
  for all using (public.is_ops()) with check (public.is_ops());

create policy disputes_parties_read on public.disputes
  for select using (public.is_booking_party(booking_id));
