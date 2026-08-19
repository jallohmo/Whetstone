-- 0016_pending_payment_expiry.sql
-- Unpaid-booking lifecycle. A booking is created at "pending_payment" and holds
-- the advisor's availability slot from that moment, so an abandoned checkout is
-- not a harmless dead row — it is a slot nobody else can book. The hourly sweep
-- (api/cron/booking-lifecycle) now nudges the client once at +3h
-- (payment_reminded_at, set once by the same atomic-claim pattern as the
-- completion reminders) and cancels at +24h, stamping payment_expired_at and
-- setting the slot's is_booked back to false.
--
-- sessions.slot_id records which availability slot a session reserved, so that
-- release is exact. Without it, freeing a slot means matching on advisor_id +
-- starts_at, which unbooks the wrong row the first time an advisor has two slots
-- at the same instant. Nullable: a multi-session package schedules its later
-- sessions by coordination, not from a slot.
--
-- Prisma is the table source of truth (schema.prisma); this mirrors the addition
-- for the supabase/migrations apply path. Idempotent. RLS is unchanged — these
-- are internal columns on tables whose policies already scope by booking party.

alter table public.bookings
  add column if not exists payment_reminded_at timestamptz,
  add column if not exists payment_expired_at  timestamptz;

alter table public.sessions
  add column if not exists slot_id text;

-- One session per slot: the constraint is what makes "release this booking's
-- slots" unambiguous, and it stops two bookings ever claiming the same time.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'sessions_slot_id_key'
  ) then
    alter table public.sessions add constraint sessions_slot_id_key unique (slot_id);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'sessions_slot_id_fkey'
  ) then
    alter table public.sessions
      add constraint sessions_slot_id_fkey
      foreign key (slot_id) references public.availability_slots (id);
  end if;
end $$;

-- Backfill the link for bookings made before this migration, so their slots are
-- releasable too. Unambiguous rows only: where an advisor happens to have more
-- than one slot at the same instant we leave slot_id null rather than guess.
update public.sessions s
set slot_id = m.slot_id
from (
  select s2.id as session_id, min(a.id) as slot_id
  from public.sessions s2
  join public.bookings b on b.id = s2.booking_id
  join public.availability_slots a
    on a.advisor_id = b.advisor_id and a.starts_at = s2.scheduled_at
  where s2.slot_id is null
  group by s2.id
  having count(*) = 1
) m
where s.id = m.session_id
  and not exists (select 1 from public.sessions x where x.slot_id = m.slot_id);

-- The unpaid sweep scans by status + created_at every hour.
create index if not exists bookings_pending_payment_idx
  on public.bookings (created_at)
  where status = 'pending_payment';
