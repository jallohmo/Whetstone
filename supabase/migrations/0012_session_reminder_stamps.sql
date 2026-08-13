-- 0012_session_reminder_stamps.sql
-- Per-window "reminder sent" stamps for the session-reminder cron. Null means
-- not yet reminded for that window; the cron sets it atomically when the email
-- goes out so each reminder is sent exactly once. Prisma is the table source of
-- truth (schema.prisma); this mirrors the addition for the supabase/migrations
-- apply path. Idempotent. sessions RLS is unchanged — these are internal.

alter table public.sessions
  add column if not exists reminded_24h_at timestamptz,
  add column if not exists reminded_1h_at timestamptz;
