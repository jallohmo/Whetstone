-- 0008_mfa_recovery_codes.sql
-- Hashed single-use 2FA recovery codes on the user row. Prisma is the table
-- source of truth (schema.prisma); this mirrors the addition for the
-- supabase/migrations apply path. Idempotent. users is owner+OPS-only under RLS
-- (0002), and only hashes are ever stored — never the plaintext codes.

alter table public.users
  add column if not exists mfa_recovery_codes text[] not null default '{}';
