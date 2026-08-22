-- 0018_thread_reads.sql
-- Read state for booking message threads, so "unread" has an answer.
--
-- messages carries no read state and never has, so nothing in the database
-- could say whether a client's message had been seen. An advisor had no way to
-- know one had arrived short of opening every booking in turn — there was not
-- even an advisor inbox to open. This is what the header bell and
-- /advisor/messages count against.
--
-- One row per person per thread, holding the instant they last had it open.
-- Anything newer from the other party is unread. NO ROW MEANS NEVER OPENED, so
-- the whole thread is unread — reading an absent row as "all read" would hide
-- the first message a client ever sends, which is the one that matters most.
--
-- Prisma is the table source of truth (schema.prisma); this mirrors it for the
-- supabase/migrations apply path. Idempotent.

create table if not exists public.thread_reads (
  id           text primary key,
  booking_id   text not null references public.bookings (id),
  user_id      text not null references public.users (id),
  last_read_at timestamptz not null
);

-- One marker per person per thread; the upsert on thread open depends on it.
create unique index if not exists thread_reads_booking_user_key
  on public.thread_reads (booking_id, user_id);

-- The bell totals every thread for one user on each dashboard render.
create index if not exists thread_reads_user_id_idx on public.thread_reads (user_id);

alter table public.thread_reads enable row level security;

-- Your own markers, and only for threads you are a party to. Both halves matter:
-- user_id alone would let a party write a marker naming someone else's booking,
-- and is_booking_party alone would let one party clear the other's badge.
-- Reusing the existing security-definer helper keeps this consistent with the
-- messages policies rather than re-deriving "who is on this booking". It lives
-- in `private`, not `public` — 0014 moved the RLS helpers out of the
-- PostgREST-exposed schema so they cannot be called over /rest/v1/rpc, while
-- staying callable from inside a policy. New policies must use that schema or
-- they fail with "function does not exist".
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'thread_reads'
      and policyname = 'thread_reads_own_read'
  ) then
    create policy thread_reads_own_read on public.thread_reads
      for select using (user_id = auth.uid()::text and private.is_booking_party(booking_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'thread_reads'
      and policyname = 'thread_reads_own_write'
  ) then
    create policy thread_reads_own_write on public.thread_reads
      for insert with check (user_id = auth.uid()::text and private.is_booking_party(booking_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'thread_reads'
      and policyname = 'thread_reads_own_update'
  ) then
    create policy thread_reads_own_update on public.thread_reads
      for update using (user_id = auth.uid()::text and private.is_booking_party(booking_id))
      with check (user_id = auth.uid()::text and private.is_booking_party(booking_id));
  end if;
end $$;

-- No backfill. An absent row correctly means "never opened", so every existing
-- thread starts fully unread — which is true, since nobody has ever been able to
-- mark one read.
