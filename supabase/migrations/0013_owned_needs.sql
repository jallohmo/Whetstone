-- 0013_owned_needs.sql
-- Signup-first needs: a need belongs to a customer_profile from the moment it is
-- created, so customer_id becomes NOT NULL and the guest_email escape hatch is
-- dropped. Prisma is the table source of truth (schema.prisma); this mirrors the
-- change for the supabase/migrations apply path. Idempotent.
--
-- Why this is safe for RLS: needs_customer_rw (0002) already scopes rows by
-- customer_id -> auth.uid(), so an ownerless row was invisible to every policy
-- and only reachable by connections that bypass RLS. Nothing loses access here.
--
-- BACKFILL: a pre-existing guest need (customer_id is null) cannot be attributed
-- to an account — guest_email was optional, and where it was set there is no
-- matching auth.users row to adopt it. Those rows (and any match_decisions
-- hanging off them, which carry the decision log) are copied into archive tables
-- and then removed, so the NOT NULL can hold without the migration destroying
-- anything. Check the notice this raises before applying in production.

-- Archives mirror the live tables as they are BEFORE this migration, so the
-- archived needs keep their guest_email and original status.
create table if not exists public.needs_orphaned_archive
  (like public.needs including defaults);

create table if not exists public.match_decisions_orphaned_archive
  (like public.match_decisions including defaults);

-- The backfill only makes sense against the pre-migration shape, and re-running it
-- afterwards would fail on the column count ("select *" from a needs table that no
-- longer has guest_email, into an archive that does). Guard on guest_email so a
-- second apply is a clean no-op. The inserts are EXECUTEd so they are never even
-- planned on that second pass.
do $$
declare
  orphaned integer;
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'needs'
      and column_name = 'guest_email'
  ) then
    return;
  end if;

  select count(*) into orphaned from public.needs where customer_id is null;
  if orphaned > 0 then
    raise notice 'Archiving % ownerless need(s) left over from the guest flow.', orphaned;
  end if;

  -- Children first: match_decisions has a FK to needs, so the decisions must be
  -- copied and cleared before their parent need can be removed.
  execute $q$
    insert into public.match_decisions_orphaned_archive
      select md.* from public.match_decisions md
      join public.needs n on n.id = md.need_id
      where n.customer_id is null
  $q$;

  delete from public.match_decisions md
    using public.needs n
    where n.id = md.need_id and n.customer_id is null;

  execute $q$
    insert into public.needs_orphaned_archive
      select * from public.needs where customer_id is null
  $q$;

  delete from public.needs where customer_id is null;
end $$;

alter table public.needs
  alter column customer_id set not null;

alter table public.needs
  drop column if exists guest_email;

-- The archives hold pre-migration rows only and are never read by the app. RLS on
-- with no policies means no anon/authenticated access at all; service-role tooling
-- can still read them for analysis.
revoke all on public.needs_orphaned_archive from anon, authenticated;
revoke all on public.match_decisions_orphaned_archive from anon, authenticated;
alter table public.needs_orphaned_archive enable row level security;
alter table public.match_decisions_orphaned_archive enable row level security;
