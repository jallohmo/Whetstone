-- 0014_private_rls_helpers.sql
-- Move the RLS helper functions out of the PostgREST-exposed `public` schema.
--
-- The database linter flags current_user_role(), is_ops() and is_booking_party()
-- as SECURITY DEFINER functions callable by anon and authenticated over
-- /rest/v1/rpc/. They exist only to be called from inside RLS policies; nothing
-- in the application invokes them over REST (the app talks to Postgres directly
-- through Prisma).
--
-- DO NOT "fix" this by revoking EXECUTE, which is the linter's first suggestion.
-- An RLS policy expression is evaluated with the privileges of the role running
-- the query, so revoking EXECUTE from authenticated makes every policy that
-- calls one of these fail with "permission denied for function" — locking every
-- user out of their own bookings, messages and payments. Verified against
-- PostgreSQL 16 before writing this.
--
-- The fix is to make them unreachable over REST while leaving them callable
-- inside policies: PostgREST only exposes schemas it is configured with (public),
-- so a function in `private` is invisible to it but still usable by the planner.
--
-- Why this needs no policy rewrites: a policy binds to a function's OID, not its
-- name. ALTER FUNCTION ... SET SCHEMA preserves the OID, so all 19 policies
-- across 13 tables follow the functions automatically and their stored
-- expressions re-render as private.is_ops() etc. CREATE OR REPLACE likewise
-- keeps the OID, which is what lets is_ops() be repointed in place below.
--
-- Idempotent: re-running is a no-op once the functions live in `private`.

create schema if not exists private;

-- Required for policy evaluation, NOT for REST access: the roles must be able to
-- resolve the schema to call the function during a query. PostgREST still cannot
-- reach it, because `private` is not in its exposed schema list.
grant usage on schema private to anon, authenticated, service_role;

do $$
begin
  -- current_user_role(): plain move. EXECUTE grants travel with the function.
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'current_user_role'
  ) then
    alter function public.current_user_role() set schema private;
  end if;

  -- is_ops(): its body names public.current_user_role() explicitly, which no
  -- longer resolves after the move above. CREATE OR REPLACE repoints the body
  -- while keeping the OID, so dependent policies are undisturbed; then move it.
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'is_ops'
  ) then
    create or replace function public.is_ops()
    returns boolean
    language sql
    stable
    security definer
    set search_path = public
    as $fn$
      select coalesce(private.current_user_role() = 'OPS_ADMIN', false);
    $fn$;

    alter function public.is_ops() set schema private;
  end if;

  -- is_booking_party(text): body only references tables, so a plain move.
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'is_booking_party'
  ) then
    alter function public.is_booking_party(text) set schema private;
  end if;
end $$;

-- Belt and braces: keep the functions off the PUBLIC pseudo-role even inside
-- `private`, so only the named roles that policies run as can call them.
revoke all on function private.current_user_role() from public;
revoke all on function private.is_ops() from public;
revoke all on function private.is_booking_party(text) from public;

grant execute on function private.current_user_role() to anon, authenticated, service_role;
grant execute on function private.is_ops() to anon, authenticated, service_role;
grant execute on function private.is_booking_party(text) to anon, authenticated, service_role;
