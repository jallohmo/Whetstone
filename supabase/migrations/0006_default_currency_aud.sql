-- 0006_default_currency_aud.sql
-- Whetstone's default currency is now AUD (was USD). Align the DB-level column
-- defaults with the app: these are the safety-net defaults applied when a row is
-- inserted without an explicit currency. The app always passes currency
-- explicitly (Package -> Booking -> Payment copy it forward), so this only changes
-- the fallback and does not rewrite existing rows.
alter table public.packages  alter column currency set default 'AUD';
alter table public.bookings  alter column currency set default 'AUD';
alter table public.payments  alter column currency set default 'AUD';
