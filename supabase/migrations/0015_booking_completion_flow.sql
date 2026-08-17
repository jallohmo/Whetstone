-- 0015_booking_completion_flow.sql
-- Two-sided booking completion. The advisor marks the work done, which moves the
-- booking to "awaiting_confirmation" and stamps advisor_completed_at; the client
-- then accepts, which stamps client_confirmed_at, moves the booking to
-- "completed" and releases the held payment. A daily sweep nudges at day 3
-- (completion_reminded_at, set once) and auto-accepts at day 7
-- (completion_auto_accepted), so a quiet client can never strand an advisor's
-- payout. sessions.outcome_at records when the advisor marked that individual
-- session completed/no_show — the per-session trail the booking-level guard and
-- any later dispute both rely on.
--
-- Prisma is the table source of truth (schema.prisma); this mirrors the addition
-- for the supabase/migrations apply path. Idempotent. RLS is unchanged — these
-- are internal columns on tables whose policies already scope by booking party.

alter table public.bookings
  add column if not exists advisor_completed_at     timestamptz,
  add column if not exists completion_reminded_at   timestamptz,
  add column if not exists client_confirmed_at      timestamptz,
  add column if not exists completion_auto_accepted boolean not null default false;

alter table public.sessions
  add column if not exists outcome_at timestamptz;

-- The day-3/day-7 sweep scans by status + advisor_completed_at every night.
create index if not exists bookings_awaiting_confirmation_idx
  on public.bookings (advisor_completed_at)
  where status = 'awaiting_confirmation';
