-- 0017_booking_need_link.sql
-- Tie a booking to the challenge it was made to address.
--
-- createBooking already received a needId, loaded the need, and asserted the
-- client owned it — then created the booking without it. With no link, the
-- advisor's booking inbox fell back to "this client's most recent need", which
-- is right only until the client posts a second one; after that every advisor
-- sees the same latest brief regardless of what they were actually booked for.
--
-- Nullable by design: a client can book an advisor directly without posting a
-- challenge, and not every historical row can be resolved.
--
-- Prisma is the table source of truth (schema.prisma); this mirrors the addition
-- for the supabase/migrations apply path. Idempotent. RLS is unchanged — a
-- booking's parties already read it through the existing booking policies, and
-- needs keep their own customer-scoped policy.

alter table public.bookings
  add column if not exists need_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'bookings_need_id_fkey'
  ) then
    alter table public.bookings
      add constraint bookings_need_id_fkey
      foreign key (need_id) references public.needs (id);
  end if;
end $$;

-- Best-effort backfill for rows created before the link existed: the client's
-- most recent challenge posted at or before the booking. That is the one the
-- booking almost certainly came from, and it is strictly better than the
-- "latest need overall" the screen used to guess with. A client with no need
-- before the booking stays null rather than being given someone else's context.
update public.bookings b
set need_id = (
  select n.id
  from public.needs n
  where n.customer_id = b.customer_id
    and n.created_at <= b.created_at
  order by n.created_at desc
  limit 1
)
where b.need_id is null;

-- The advisor inbox and booking thread both look a booking up by its need.
create index if not exists bookings_need_id_idx on public.bookings (need_id);
