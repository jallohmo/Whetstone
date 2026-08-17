# Whetstone — Launch Checklist

Pre-launch config that lives in the **Vercel** and **Supabase** dashboards, not in
the code. The app is production-safe as written (URL builders use
`x-forwarded-host`/`x-forwarded-proto`; integrations are guarded on their env
vars) — these items are about the dashboards being in sync with what the code
expects. Deploying to Vercel + Supabase only (no local runtime).

## 1. Vercel environment variables

Complete list of what the code actually reads (`process.env.*` + Prisma `env()`).

**Required — app won't build/boot without these:**

| Var | Notes |
|---|---|
| `DATABASE_URL` | Prisma, pooled connection, port **6543**, `?pgbouncer=true` |
| `DIRECT_URL` | Prisma migrate/introspection, port **5432** |
| `NEXT_PUBLIC_SUPABASE_URL` | ⚠️ build-time inlined (see §4) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ⚠️ build-time inlined |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only; ops invite + admin ops |

**Optional — guarded, app runs without them (feature just off):**

| Var | Turns on |
|---|---|
| `STRIPE_SECRET_KEY` | Payments (without it: held-payment fallback, no card) |
| `STRIPE_WEBHOOK_SECRET` | Booking fulfilment via webhook (the `whsec_…` from the endpoint) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ⚠️ build-time inlined. Saved cards (Stripe.js Elements on the account page) |
| `DAILY_API_KEY` | Video calls (Daily.co) |
| `NEXT_PUBLIC_DEFAULT_CURRENCY` | Fallback currency (code default: AUD) |
| `PLATFORM_COMMISSION_BPS` | Commission (code default: 1500 = 15%) |
| `INSURANCE_COVERAGE_ACTIVE`, `INSURANCE_COVERAGE_STATEMENT` | Insurance statement config |

> `KYC_PROVIDER` appears in `.env.example` but is **not read anywhere in the code**
> yet — reserved for later, safe to skip. (`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is
> now read by the saved-cards flow — see the optional table above.)

> **Supabase↔Vercel integration:** the DB URL and Supabase keys are currently
> provided by the official integration under *different names*
> (`POSTGRES_PRISMA_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
> `SUPABASE_SECRET_KEY`, `SUPABASE_URL`). The code reads both those and the names
> above, preferring the app's own names. **Do not** re-add a manual `DATABASE_URL`
> unless it's correct — a stale manual one overrides the integration's working URL.

## 2. Stripe webhook — domain must match production

The **sandbox** webhook endpoint now points at the production domain:

```
https://app.whetstone.au/api/stripe/webhook   (event: checkout.session.completed)
```

- ⚠️ It only delivers once **`app.whetstone.au` is actually serving the app** (Vercel
  domain assigned + DNS live). Until then, `checkout.session.completed` reaches a
  domain that isn't up and bookings aren't fulfilled.
- Put the endpoint's signing secret into Vercel as `STRIPE_WEBHOOK_SECRET`
  (current sandbox secret: `whsec_8aczUaz5TDuO9TN4TEvyGQaGUpnmiHpK`). Editing the
  endpoint URL in place does **not** rotate the secret.
- **Going live:** see §6 (Stripe go-live) — a *separate* live-mode webhook with
  its own secret. The sandbox endpoint only fires for test-mode payments.

## 3. Supabase Auth redirect allow-list  ⛔ needs the production domain (§6)

Sign-up uses `emailRedirectTo: ${origin}/auth/callback`. In Supabase →
**Authentication → URL Configuration**:

- Set **Site URL** to the production domain (`https://app.whetstone.au`).
- Add `https://app.whetstone.au/auth/callback` to **Redirect URLs** (plus
  `https://*-<your-team>.vercel.app/auth/callback` for preview deploys).

Miss this and email-confirmation links bounce to an error in production (works
locally, breaks live).

## 4. `NEXT_PUBLIC_*` are build-time, not runtime

Vercel inlines every `NEXT_PUBLIC_*` var into the bundle **at build time**. If you
add or change one *after* deploying, it has no effect until you **redeploy**. Set
these before the first real build.

## 5. Daily.co video (if enabling)

- Set `DAILY_API_KEY` in Vercel (dashboard.daily.co → Developers → API keys).
- Rooms are created `privacy: "private"` but the code redirects to the room URL
  **without minting a meeting token**. Private Daily rooms normally require a
  token to admit users. If testing shows "not allowed to join" errors, either
  relax the domain's default room privacy or extend `ensureVideoRoom()` in
  `src/lib/actions/video.ts` to call `POST /v1/meeting-tokens`.

## 5b. Email — Resend (transactional) + Supabase Auth SMTP

The app sends transactional email through **Resend**. Without `RESEND_API_KEY`
every send is a logged no-op, so nothing breaks — but no one gets a receipt,
booking, message, or payout email. To enable:

1. **Verify a sending domain** in Resend — use a dedicated subdomain
   (`mail.whetstone.au`), *not* the root, so sending reputation is isolated. Add
   the **SPF, DKIM and DMARC** DNS records Resend gives you.
2. Set in Vercel: `RESEND_API_KEY`, `EMAIL_FROM`
   (`Whetstone <no-reply@mail.whetstone.au>`), optionally `EMAIL_REPLY_TO`, and
   `NEXT_PUBLIC_SITE_URL` (used to build links in emails sent from the Stripe
   webhook, outside a normal request).
3. **Point Supabase Auth at Resend too.** Supabase's built-in email is
   rate-limited and not for production. In Supabase → **Authentication → Emails →
   SMTP Settings**, enter Resend's SMTP credentials so confirmation / reset /
   magic-link mail leaves from the same verified domain.

What's wired today (all gated by each recipient's notification preferences from
the account page, except the client receipt and the internal ops alert, which
always send):

- **Need posted** → ops, so a new need doesn't sit unmatched until someone opens
  the queue. Same recipients as the flagged-booking alert below.
- **Booking confirmed** → client receipt + advisor "new booking".
- **New message** → the other party in the thread.
- **Payout released** → advisor.
- **Session reminders** → both parties, 24h and 1h before (see §5c).
- **Confirm completion** → client, when the advisor marks the work done; the
  day-3 nudge if they haven't acted (see §5d).
- **Leave feedback** → client, once the booking completes. Optional — the payout
  has already moved by then.
- **Booking flagged** → ops, whenever either party reports a problem.

Both ops alerts go to `OPS_ALERT_EMAIL` (comma-separated for several), or to
every OPS_ADMIN account's email if that's unset — so they work on a fresh
environment with nothing extra to configure.

### 5c. Session reminders (Vercel Cron)

Time-based, so they run from a scheduled endpoint rather than inline:

- `vercel.json` registers a cron hitting `/api/cron/session-reminders`. It is
  currently set to **once daily** (`0 9 * * *`) because **Hobby only allows
  daily crons** — and a sub-daily schedule makes Vercel *reject the whole
  deployment*, which is what caused the early preview build failures.
  - At daily cadence only the **24h** reminder is meaningful; the **1h**
    reminder can't work (the cron runs once a day, not hourly).
  - **To get both windows**, upgrade to a plan that allows sub-daily crons
    (Pro+) and change the schedule back to `*/15 * * * *` — or run the schedule
    from Supabase `pg_cron` + `pg_net` calling the same endpoint with the Bearer
    header.
- Set **`CRON_SECRET`** in Vercel. The endpoint returns 401 unless the request
  carries `Authorization: Bearer <CRON_SECRET>` — Vercel Cron sends this
  automatically once the env var is set. Without it, reminders never run.
- Reminders fire at **24h** and **1h** before each session; the client is gated
  on the `sessionReminders` preference, advisors always receive them. Each
  window is stamped on the `sessions` row so it sends exactly once (migration
  `0012`). Requires `RESEND_API_KEY` (§5b) — no key, no email.

### 5d. Booking lifecycle (Vercel Cron)

A second daily cron at `/api/cron/booking-lifecycle` (`30 9 * * *`), guarded by
the same `CRON_SECRET`. Three sweeps per run:

- `confirmed` → `in_progress` once a booking's first session has started.
- Day-3 nudge to clients sitting on an unconfirmed completion (stamped on the
  booking, so it sends exactly once).
- Day-7 auto-accept: confirms on the client's behalf and releases the advisor's
  payout. **This is load-bearing** — without it, a client who never confirms
  leaves the advisor's money held indefinitely.

Both crons are daily, which keeps the project inside Hobby's cron limits (two
jobs, daily cadence). The windows live in `src/lib/booking-status.ts`
(`COMPLETION_REMINDER_DAYS`, `COMPLETION_AUTO_ACCEPT_DAYS`) — change them there,
not in the route.

## 6. Pre-launch activities — production domain & Stripe go-live

These are the outstanding launch activities. They are grouped because **several
other items depend on having a real production domain**, so this comes first.

### 6a. Production domain (do this first — unblocks §2 and §3)

The production domain is **`app.whetstone.au`** (previously the auto-assigned
`*.vercel.app` URLs, e.g. `whetstone-nu.vercel.app`). To make it live:

1. Vercel → project → **Settings → Domains** → add `app.whetstone.au` and set it as
   the Production domain; follow the DNS steps.
2. Point `app.whetstone.au` at Vercel per those instructions; wait for it to verify.
3. **Then confirm the domain-dependent items:**
   - **§2** — the Stripe webhook already points at `https://app.whetstone.au/api/stripe/webhook`.
   - **§3** — set Supabase **Site URL** to `https://app.whetstone.au` + add
     `https://app.whetstone.au/auth/callback` to Redirect URLs.

> Until `app.whetstone.au` resolves to the app, §2 and §3 won't function. Previews
> continue to work on their `*.vercel.app` URLs.

### 6b. Stripe go-live (production payments)

Currently on the Stripe **sandbox** (test mode only — no real money moves).
To take real payments:

1. Activate the Stripe account (business details, bank for payouts).
2. Enable **Stripe Connect** (Express) for advisor payouts.
3. Set **live-mode** keys in Vercel: `STRIPE_SECRET_KEY` (live) and
   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (live) — the latter is read by the
   saved-cards flow and is build-time inlined, so redeploy after setting it.
4. **Create the live-mode Stripe webhook** — this is separate from the sandbox
   endpoint and has its **own** signing secret:
   - In the Stripe Dashboard, switch to **live mode** → **Developers → Webhooks →
     Add endpoint**.
   - URL: `https://app.whetstone.au/api/stripe/webhook`
   - Event: `checkout.session.completed`
   - Copy the endpoint's **live** signing secret into Vercel as
     `STRIPE_WEBHOOK_SECRET` (Production scope), then redeploy.
   - ⚠️ The sandbox endpoint (§2) only fires for test-mode payments; live
     payments won't be fulfilled until this live endpoint exists.
5. Confirm the Stripe account settles in **AUD** (matches the platform currency).

### 6c. Session-reminder cron (Vercel plan + secret)

The reminder cron (§5c) currently runs **once daily** (`0 9 * * *`) so it
deploys on Hobby. For both the 24h and 1h reminders to fire:

1. **[ ] Enable sub-daily reminders (Pro plan).** Upgrade Vercel to a plan that
   allows sub-daily crons (Pro+) and change `vercel.json` back to
   `*/15 * * * *`. Until then the schedule stays daily and **only the 24h
   reminder fires** — the 1h reminder needs this. A sub-daily schedule on Hobby
   breaks the deployment, so don't set `*/15` before upgrading. (Alternative:
   run the schedule from Supabase `pg_cron` + `pg_net` against the same
   endpoint — see §5c.)
2. **[ ] Set `CRON_SECRET`** in Vercel (a long random string, e.g.
   `openssl rand -hex 32`). The endpoint returns 401 without it, so reminders
   won't run until it's set. Requires `RESEND_API_KEY` (§5b) to actually send.

## 7. Verify with /api/health

After any deploy, load **`https://<domain>/api/health`** — it reports database
reachability, which env vars are present/missing (names only), and which services
(Stripe, video, error reporting) are configured. Use it as the first diagnostic
whenever something looks broken.

To activate **Sentry** error tracking (code is already wired): create a project
at sentry.io and set `SENTRY_DSN` in Vercel.

---

See also `docs/DEPLOYMENT.md` for the full Vercel/Supabase deploy walkthrough.
