# Deploying Whetstone to Vercel

The app is a standard Next.js (App Router) project wired to the Supabase project
**whetstone** (`yywcerybuaxndsvdkjiw`, ap-southeast-2 / Sydney). This repo is
already deploy-ready:

- `vercel.json` — pins the framework + `prisma generate && next build` build command
- `package.json` — `postinstall: prisma generate` so Vercel's cached `node_modules`
  never serves a stale Prisma Client
- `prisma/schema.prisma` — `binaryTargets = ["native", "rhel-openssl-3.0.x"]` so the
  query engine works on Vercel's serverless runtime (without it: *"Query engine
  binary not found"* at runtime)

There's nothing to run in the database for deploy — its schema, RLS, and seed are
already live.

---

## 1. Connect the repo (dashboard — simplest)

1. Go to **https://vercel.com/new** and import `jallohmo/Whetstone`.
2. Framework preset: **Next.js** (auto-detected). Leave build/install as-is —
   `vercel.json` already sets them.
3. **Before the first deploy**, add the environment variables from §3.
4. Deploy. Vercel builds `main` as production and every other branch as a preview.

**Region:** set the project's function region to **Sydney (syd1)** to sit next to
the Supabase DB (Project → Settings → Functions → Region). Keeping app and DB in
the same region materially cuts query latency. (Region isn't pinned in
`vercel.json` because multi-region config is a Pro-plan feature and would break a
Hobby deploy.)

## 2. Or connect via CLI

```bash
npm i -g vercel
vercel login
vercel link            # select/create the Whetstone project
# set env vars (see §3, or use scripts/vercel-env-sync.sh below)
vercel --prod
```

## 3. Environment variables

Set these in Vercel (Project → Settings → Environment Variables) for
**Production**, **Preview**, and **Development**. Public-safe values are filled in;
the two secrets must come from the Supabase dashboard.

| Variable | Scope | Value |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | `https://yywcerybuaxndsvdkjiw.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | *(anon key — in `.env.example`)* |
| `DATABASE_URL` | **secret** | pooled string, port **6543**, `?pgbouncer=true` — see below |
| `DIRECT_URL` | **secret** | direct/session string, port **5432** — see below |
| `SUPABASE_SERVICE_ROLE_KEY` | **secret** | Supabase → Settings → API → `service_role` |
| `NEXT_PUBLIC_DEFAULT_CURRENCY` | public | `AUD` |
| `PLATFORM_COMMISSION_BPS` | public | `1500` |
| `INSURANCE_COVERAGE_ACTIVE` | public | `true` |
| `INSURANCE_COVERAGE_STATEMENT` | public | your coverage sentence |

Get the exact `DATABASE_URL` / `DIRECT_URL` from **Supabase → Project Settings →
Database → Connection string → ORM (Prisma)** — it fills in the pooler host and
your DB password. They look like:

```
DATABASE_URL="postgresql://postgres.yywcerybuaxndsvdkjiw:[PASSWORD]@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.yywcerybuaxndsvdkjiw:[PASSWORD]@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres"
```

> The pooled URL (pgBouncer, 6543) is what serverless functions use; `DIRECT_URL`
> (5432) is used by Prisma for migrations. Don't swap them.

**Stripe / Daily / KYC** (`STRIPE_*`, `DAILY_API_KEY`, `KYC_PROVIDER`) aren't needed
to boot the app — add them when you wire those integrations.

### Native Supabase integration (optional)

Vercel's Supabase integration (Project → Integrations → Supabase) auto-syncs
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, and `POSTGRES_PRISMA_URL` / `POSTGRES_URL_NON_POOLING`.
If you use it, either map those two Postgres vars onto `DATABASE_URL` / `DIRECT_URL`,
or point `schema.prisma`'s datasource at them. Setting `DATABASE_URL` / `DIRECT_URL`
by hand (above) is the simplest and is what this repo expects.

## 4. After deploy — smoke check

- `/` renders (landing).
- `/needs/new` shows the seeded industry dropdown (confirms DB connectivity).
- `/ops` and `/advisor/*` redirect to `/login` (confirms role-gating middleware).

## 5. Supabase Auth setup

The app uses **Supabase Auth (email + password)**. Configure the project once:

1. **Authentication → URL Configuration**
   - **Site URL:** your production URL (`https://whetstone.au`).
   - **Redirect URLs:** add `https://<your-domain>/auth/callback` **and**
     `https://*-<your-team>.vercel.app/auth/callback` for preview deploys, plus
     `http://localhost:3000/auth/callback` for local dev. The email-confirmation
     link returns here (`src/app/auth/callback/route.ts`) to exchange the code
     for a session.
2. **Authentication → Providers → Email**
   - Keep **Confirm email** ON for production. For quick local testing you can
     turn it OFF so signups get a session immediately (turn it back on before launch).
   - The built-in Supabase email sender is rate-limited — configure your own SMTP
     under **Project Settings → Auth → SMTP** before real signups.
3. **First ops admin** — there is no public signup for `OPS_ADMIN`. Two ways to
   create one; both set the role in auth metadata (route gating) **and**
   `public.users` (authoritative for RLS). The seeded fixture `ops@whetstone.dev`
   has no password — make a real one below.

   **Option A — from the Supabase website (no local setup):**
   1. **Authentication → Users → Add user** → enter your email + a password, tick
      **Auto Confirm User**, Create.
   2. **SQL Editor → New query** → paste (with your email), Run:
      ```sql
      update public.users
      set role = 'OPS_ADMIN'
      where email = 'you@yourco.com';

      update auth.users
      set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"role":"OPS_ADMIN"}'::jsonb
      where email = 'you@yourco.com';
      ```
   3. Log in at `/login` with that email + password.

   **Option B — from a terminal (if you have the repo locally):**
   ```bash
   # reads config from .env.local automatically
   npx tsx scripts/create-ops-admin.ts ops@yourco.com 'a-strong-password'
   ```
   (Requires `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `DIRECT_URL`.)

Roles: customers self-serve at `/signup`; advisors at `/advisor/apply` (public);
ops only via one of the methods above.

## 6. Payments (Stripe Connect)

Payments use **Stripe Connect** (separate charges & transfers): the customer pays
at checkout (funds held on the platform), and the advisor's cut is transferred to
their connected account when the session completes (the customer's review triggers
the release). Commission is `PLATFORM_COMMISSION_BPS` (default 1500 = 15%).

**Without** `STRIPE_SECRET_KEY`, checkout falls back to recording a held payment
directly so the full flow still works in dev — no card needed.

To enable real payments:

1. Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and
   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (test keys to start).
2. **Enable Connect** in the Stripe dashboard (Express accounts). Advisors connect
   a payout account from **/advisor/earnings** ("Set up payouts" →
   `startPayoutOnboarding`), which stores their `stripe_account_id`.
3. **Webhook:** add an endpoint at `https://<your-domain>/api/stripe/webhook`
   subscribed to **`checkout.session.completed`**, and put its signing secret in
   `STRIPE_WEBHOOK_SECRET`. The route verifies the signature on the raw body and
   fulfils the booking (held Payment + confirmed).
4. Money movement: checkout → held; customer review → transfer to advisor
   (released); ops can **Refund** from the dispute view (→ refunded + cancelled).

Amounts are multi-currency throughout — each booking/payment carries its own ISO
currency and Stripe is called in that currency.

## 7. Notes

- **Migrations:** applied to Supabase already. When you change the schema later,
  run `prisma migrate` against `DIRECT_URL` and apply any new `supabase/migrations/*.sql`
  (RLS/policies) via the Supabase CLI — Vercel does not run migrations on deploy.
- **Auth callback:** add the production URL (`https://whetstone.au`) and
  `*.vercel.app` preview URLs to Supabase → Authentication → URL Configuration
  (redirect allow-list).
