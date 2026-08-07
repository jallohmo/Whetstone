-- 0001_auth_users_trigger.sql
-- Mirrors Supabase auth.users into public.users on signup.
--
-- role is read from raw_user_meta_data at signup, but the AUTHORITATIVE copy is
-- public.users.role, written here server-side. Authorization checks must read
-- public.users.role, never raw_user_meta_data alone (that is client-settable).
--
-- Apply AFTER Prisma has created the public.users table (prisma migrate dev).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, role, created_at)
  values (
    -- public.users.id is TEXT (Prisma cuid mirror); auth.users.id is UUID.
    new.id::text,
    new.email,
    -- Default any signup without an explicit valid role to CUSTOMER.
    -- OPS_ADMIN can NEVER be self-assigned here — it is only ever set via the
    -- invite flow (service role), so we coerce it away defensively.
    case
      when coalesce(new.raw_user_meta_data ->> 'role', '') = 'ADVISOR' then 'ADVISOR'::"UserRole"
      else 'CUSTOMER'::"UserRole"
    end,
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: authoritative role of the current request's user.
create or replace function public.current_user_role()
returns "UserRole"
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid()::text;
$$;

create or replace function public.is_ops()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'OPS_ADMIN', false);
$$;
