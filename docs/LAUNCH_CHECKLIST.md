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

## 2. Stripe webhook — domain must match production

A webhook endpoint was created in the **sandbox** account pointing at:

```
https://whetstone.vercel.app/api/stripe/webhook   (event: checkout.session.completed)
```

- ⚠️ **Confirm this is the real production domain.** If it differs,
  `checkout.session.completed` silently never fires and bookings are never
  fulfilled — no error, just nothing happens. Update the endpoint URL if so.
- Put the endpoint's signing secret into Vercel as `STRIPE_WEBHOOK_SECRET`.
- **Going live:** create a *separate* live-mode webhook endpoint (its own signing
  secret) and swap in live-mode `STRIPE_SECRET_KEY` / secret. The sandbox endpoint
  only fires for test-mode payments.

## 3. Supabase Auth redirect allow-list

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

---

See also `docs/DEPLOYMENT.md` for the full Vercel/Supabase deploy walkthrough.
