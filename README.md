# Whetstone

A verified, insured marketplace connecting business owners with **semi-retired and
retired professionals** for bounded, paid advisory sessions — across **any industry**,
**anywhere in the world**.

Not general business coaching: verified, insured, scope-limited engagements matched to
real domain experience.

---

## Resolved product decisions

| Decision | Choice |
|---|---|
| **Product name** | **Whetstone** |
| **Launch breadth** | **All industries at once** (broad taxonomy, seeded as data) |
| **Currency** | **Multi-currency**, `USD` default — global from day one |
| Insurance | Static coverage statement from config (negotiated blanket policy), not a live API |

## Stack

- **Next.js (App Router) + TypeScript** — frontend + API in one framework
- **Tailwind CSS** — design tokens are the literal source of truth (`tailwind.config.ts`)
- **PostgreSQL + Prisma** — schema-as-code, reviewable migrations
- **Supabase** — auth, storage, realtime, DB (single backend vendor)
- **Vercel** — hosting
- **Stripe Connect** — marketplace escrow/payout (multi-currency)
- **Stripe Identity / Persona** — KYC · **Daily.co** — video

> Prisma manages **table structure**; Supabase **RLS policies + auth triggers** are
> hand-written SQL under `supabase/migrations/` — Prisma has no native RLS concept.

## Project layout

```
src/
  app/
    (customer)/     # Screens 1-9  — calm, phone-first shell (canvas gray100, pill top bar)
    (advisor)/      # Screens 10-14 — 264px sidebar, large targets, plain language
    (ops)/          # Screens 15-18 — dark rail, dense 13px canvas, keyboard-first
    layout.tsx, globals.css
  components/
    ui/             # Button, Card, Input, Field, PageHeader…
    shared/         # VerificationBadge, InsuranceCoverageNotice, IndustryTag,
                    # BoundedScopeSummary, ReviewSummary, RelevanceExplainer, Money
    customer/ ops/  # screen-specific (NeedIntakeForm, PostSessionSurvey, MatchingWorkbench)
  lib/
    currency.ts     # multi-currency contract (format, minor units, commission split)
    supabase/       # browser + server + middleware clients
    prisma.ts, platform-config.ts, cn.ts
  middleware.ts     # one role check per route GROUP (customer / advisor / ops)
prisma/
  schema.prisma     # full data model (snake_case mapped so RLS SQL lines up)
  seed.ts           # IndustryTaxonomy (all industries) + bounded-scope Packages
supabase/migrations/
  0001_auth_users_trigger.sql   # auth.users -> public.users mirror + role helpers
  0002_rls_policies.sql         # per-table RLS (05b §2)
  0003_storage_buckets.sql      # advisor-credentials (private) + avatars (public)
```

The 18 screens map 1:1 to routes and to the engineering tasks (A1–A7, B1–B4, C1–C2)
from the handover. Screens are wired scaffolds: real shared components, sample data,
and a `ScaffoldNote` marking exactly what to connect at build time.

## Multi-currency

Money is always stored as an integer **minor-unit amount + ISO 4217 currency code**
(never a float or formatted string) on `Package`, `Booking`, and `Payment`. `USD` is the
default. Formatting happens only at the display edge via `lib/currency.ts` / the `Money`
component. Add a currency by adding one row to `SUPPORTED_CURRENCIES`.

## Database — already provisioned on Supabase

The backend is wired to a dedicated Supabase project (fully isolated from any
other app):

| | |
|---|---|
| Project | **whetstone** · ref `yywcerybuaxndsvdkjiw` |
| Region | ap-southeast-2 (Sydney) · Postgres 17 |
| URL | `https://yywcerybuaxndsvdkjiw.supabase.co` |

Already applied to that project (via migrations, in order):
1. **Schema** — all 16 tables + the advisor↔specialty join + enums
2. **Auth** — `auth.users → public.users` trigger + `current_user_role()` /
   `is_ops()` / `is_booking_party()` helpers (ids cast `auth.uid()::text` since
   `public.users.id` is a TEXT cuid mirror)
3. **RLS** — per-table policies (05b §2)
4. **Storage** — `advisor-credentials` (private) + `avatars` (public) buckets
5. **Seed** — 15 industries, 60 sub-specialties, 2 packages, + dev-fixture
   verified advisors and an ops admin

## Getting started

`.env.example` already carries this project's real URL + anon key (public-safe).
You only need to add **two secrets** from the Supabase dashboard:

```bash
npm install
cp .env.example .env.local
# In .env.local, fill the two placeholders:
#   DATABASE_URL / DIRECT_URL -> [YOUR-DB-PASSWORD]  (Settings -> Database, ORM/Prisma tab)
#   SUPABASE_SERVICE_ROLE_KEY -> service_role key    (Settings -> API)

npm run prisma:generate
npm run dev                       # http://localhost:3000
```

The schema, RLS, and seed are **already live** — you do not re-run
`prisma migrate` or `db:seed` against this project unless you're changing the
schema. For a *fresh/other* Supabase project, apply `supabase/migrations/` in
order (or `prisma migrate` for tables + `supabase db push` for the SQL policies),
then `npm run db:seed` and `npm run db:seed:demo`.

`npm run typecheck` and `npm run lint` should pass before committing.

## Deploying to Vercel

The repo is deploy-ready (`vercel.json`, `postinstall: prisma generate`, and the
serverless Prisma `binaryTargets`). Import `jallohmo/Whetstone` at
**vercel.com/new**, add the environment variables, and deploy. Full steps, the
env-var table (with this project's public values pre-filled), and a
`scripts/vercel-env-sync.sh` helper are in **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

## Deliberately deferred (per handover)

- Endpoint-by-endpoint API contract (generate at build time once schema is locked)
- Full UI copy for all 18 screens (placeholder copy in brand voice; flag for review)
- Realtime for messaging (polling is fine at MVP; Supabase Realtime optional)
- Self-hosted fonts (General Sans / JetBrains Mono) — falls back to system until added
