-- 0011_user_first_last_name.sql
-- Split-out first/last name on users so advisors (and clients) can set a real
-- display name instead of falling back to the email handle. Prisma is the table
-- source of truth (schema.prisma); this mirrors the addition for the
-- supabase/migrations apply path. Idempotent.
-- users is owner+OPS-only under RLS (0002), so these are never publicly exposed;
-- no extra grants needed.

alter table public.users
  add column if not exists first_name text,
  add column if not exists last_name text;
