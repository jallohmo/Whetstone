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
| `NEXT_PUBLIC_DEFAULT_CURRENCY` | public | `USD` |
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

## 5. Notes

- **Migrations:** applied to Supabase already. When you change the schema later,
  run `prisma migrate` against `DIRECT_URL` and apply any new `supabase/migrations/*.sql`
  (RLS/policies) via the Supabase CLI — Vercel does not run migrations on deploy.
- **Auth callback:** when you wire Supabase Auth, add your Vercel production URL and
  `*.vercel.app` preview URLs to Supabase → Authentication → URL Configuration
  (redirect allow-list).
