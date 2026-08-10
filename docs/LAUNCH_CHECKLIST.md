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
| `DAILY_API_KEY` | Video calls (Daily.co) |
| `NEXT_PUBLIC_DEFAULT_CURRENCY` | Fallback currency (code default: AUD) |
| `PLATFORM_COMMISSION_BPS` | Commission (code default: 1500 = 15%) |
| `INSURANCE_COVERAGE_ACTIVE`, `INSURANCE_COVERAGE_STATEMENT` | Insurance statement config |

> `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and `KYC_PROVIDER` appear in `.env.example`
> but are **not read anywhere in the code** — reserved for later, safe to skip.

> **Supabase↔Vercel integration:** the DB URL and Supabase keys are currently
> provided by the official integration under *different names*
> (`POSTGRES_PRISMA_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
> `SUPABASE_SECRET_KEY`, `SUPABASE_URL`). The code reads both those and the names
> above, preferring the app's own names. **Do not** re-add a manual `DATABASE_URL`
> unless it's correct — a stale manual one overrides the integration's working URL.

## 2. Stripe webhook — domain must match production  ⛔ blocked on a production domain (§6)

A webhook endpoint was created in the **sandbox** account pointing at a
placeholder domain:

```
https://whetstone.vercel.app/api/stripe/webhook   (event: checkout.session.completed)
```

- ⚠️ **No production domain exists yet** (see §6). Until one is chosen, this URL
  is wrong — `checkout.session.completed` silently never fires and bookings are
  never fulfilled. Update the endpoint URL once the domain is live.
- Put the endpoint's signing secret into Vercel as `STRIPE_WEBHOOK_SECRET`
  (current sandbox secret: `whsec_8aczUaz5TDuO9TN4TEvyGQaGUpnmiHpK`).
- **Going live:** see §6 (Stripe go-live) — a *separate* live-mode webhook with
  its own secret. The sandbox endpoint only fires for test-mode payments.

## 3. Supabase Auth redirect allow-list  ⛔ needs the production domain (§6)

Sign-up uses `emailRedirectTo: ${origin}/auth/callback`. In Supabase →
**Authentication → URL Configuration**:

- Set **Site URL** to the production domain.
- Add `https://<your-domain>/auth/callback` to **Redirect URLs** (plus
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

## 6. Pre-launch activities — production domain & Stripe go-live

These are the outstanding launch activities. They are grouped because **several
other items depend on having a real production domain**, so this comes first.

### 6a. Production domain (do this first — unblocks §2 and §3)

There is **no custom production domain yet** — the app runs on Vercel's
auto-assigned `*.vercel.app` URLs (`whetstone-nu.vercel.app`,
`whetstone-engage-x2.vercel.app`). To launch on a real domain:

1. Buy/choose a domain (or decide to launch on `*.vercel.app` for now).
2. Vercel → project → **Settings → Domains** → add it; follow the DNS steps.
3. Once live, it becomes the value used everywhere below.
4. **Then action the domain-dependent items:**
   - **§2** — update the Stripe webhook endpoint URL to `https://<domain>/api/stripe/webhook`.
   - **§3** — set Supabase **Site URL** + add `https://<domain>/auth/callback` to Redirect URLs.

> Until a domain is chosen, §2 and §3 can't be finalised. Everything else
> (test-mode checkout aside) works on the `*.vercel.app` URLs.

### 6b. Stripe go-live (production payments)

Currently on the Stripe **sandbox** (test mode only — no real money moves).
To take real payments:

1. Activate the Stripe account (business details, bank for payouts).
2. Enable **Stripe Connect** (Express) for advisor payouts.
3. Set **live-mode** keys in Vercel: `STRIPE_SECRET_KEY` (live) and wire
   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (live) — note this var is in `.env.example`
   but not yet read by the code, so wiring it is a small code change.
4. Create a **live-mode** webhook at `https://<domain>/api/stripe/webhook`
   (event `checkout.session.completed`) and put its **live** signing secret in
   `STRIPE_WEBHOOK_SECRET`.
5. Confirm the Stripe account settles in **AUD** (matches the platform currency).

## 7. Verify with /api/health

After any deploy, load **`https://<domain>/api/health`** — it reports database
reachability, which env vars are present/missing (names only), and which services
(Stripe, video, error reporting) are configured. Use it as the first diagnostic
whenever something looks broken.

To activate **Sentry** error tracking (code is already wired): create a project
at sentry.io and set `SENTRY_DSN` in Vercel.

---

See also `docs/DEPLOYMENT.md` for the full Vercel/Supabase deploy walkthrough.
