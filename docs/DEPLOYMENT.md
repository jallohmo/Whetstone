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
   - **Site URL:** your production URL (`https://app.whetstone.au`).
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

### Social sign-in — "Continue with LinkedIn" / "Continue with Google"

Both buttons already ship on `/login`, `/signup` and `/advisor/apply`
(`src/components/auth/AuthForm.tsx` → `GoogleButton` / `LinkedInButton` →
`OAuthButton`). Nothing needs to be built; each provider just has to be enabled
on the Supabase project. Until it is, clicking the button surfaces an inline
"Unsupported provider" error rather than silently failing. There are **no app
env vars** for either provider — the client ID/secret live in Supabase only.

**LinkedIn — create the app (linkedin.com/developers/apps → Create app)**

1. Fill in name, and associate the app with your **LinkedIn Company Page**
   (required). Upload a logo, create, then click **Verify** on the page
   association — an admin of that Page has to approve the one-click prompt
   before the app leaves draft.
2. **Products** tab → request **"Sign In with LinkedIn using OpenID Connect"**.
   It is self-serve and granted immediately; no LinkedIn review is involved.
   This is the product that grants the `openid`, `profile` and `email` scopes
   Supabase's `linkedin_oidc` provider asks for. (The older "Sign In with
   LinkedIn" v1 product is deprecated — don't use it, and don't use Supabase's
   legacy `linkedin` provider.)
3. **Auth** tab → **Authorized redirect URLs for your app** → add exactly:
   ```
   https://yywcerybuaxndsvdkjiw.supabase.co/auth/v1/callback
   ```
   That is Supabase's callback, **not** the app's `/auth/callback` — LinkedIn
   redirects to Supabase, Supabase then redirects to the app. One entry covers
   production, previews and localhost. LinkedIn requires HTTPS here, which is
   why local dev still works through the Supabase URL.
4. Copy the **Client ID** and **Primary Client Secret** from the same tab.

**Enable it on Supabase**

5. Dashboard → **Authentication → Providers → LinkedIn (OIDC)** → toggle on,
   paste the Client ID + Secret, **Save**. (Pick the OIDC entry, not the plain
   "LinkedIn" one.)
6. Dashboard → **Authentication → URL Configuration** → confirm the app's own
   redirect URLs are allow-listed (§5.1 above): `/auth/callback` for production,
   previews and `http://localhost:3000`. `OAuthButton` sends
   `redirectTo = <origin>/auth/callback`, and Supabase refuses any origin that
   isn't on that list.

**Google** is the same shape: Google Cloud Console → OAuth consent screen →
Credentials → **OAuth client ID (Web application)** → authorized redirect URI
`https://yywcerybuaxndsvdkjiw.supabase.co/auth/v1/callback` → paste the client
ID/secret into **Authentication → Providers → Google**.

**Verify:** open `/login` in a private window → **Continue with LinkedIn** →
approve on LinkedIn → you land back on `/` (or `next`) signed in. A new row
appears in **Authentication → Users** and, via the `handle_new_user` trigger, in
`public.users`.

**What to expect after an OAuth signup**

- **Role is always `CUSTOMER`.** The redirect flow can't carry a role into the
  signup trigger, so an advisor who signs up with LinkedIn lands as a customer
  and converts at `/advisor/apply`, where `AdvisorRolePrompt` calls
  `becomeAdvisor()`. This is by design — the ADVISOR role is never taken from
  provider metadata.
- **Name and avatar are not copied.** `handle_new_user` (migration 0001) mirrors
  only `id`, `email` and `role`, so `displayName()` falls back to the email
  handle until the user fills in first/last name in account settings. The OIDC
  claims are still on the auth user (`raw_user_meta_data.name`, `picture`) if
  you later want a migration to backfill them.
- **Email matching.** LinkedIn returns the member's primary verified email.
  If that address already has a password account, Supabase links the identity to
  the existing user (same email) rather than creating a second account.
- **Secret rotation.** LinkedIn client secrets expire (12 months). When one
  expires every LinkedIn sign-in fails at the provider; regenerate it on the
  **Auth** tab and re-paste it into Supabase. Put a reminder in the calendar.

### Custom auth domain — what the OAuth consent screen shows

The LinkedIn (and Google) consent screen names the host the user is about to be
redirected to, which is the **Supabase** host, not `app.whetstone.au`. Out of the
box that reads:

> You will be redirected to https://yywcerybuaxndsvdkjiw.supabase.co

A random 20-character project ref on an unfamiliar domain, shown at the moment
the user decides whether to hand over their LinkedIn identity. On a marketplace
selling verification and insurance, that is worth fixing before social sign-in
goes public — and it is far cheaper to fix while there are no OAuth users yet.

Two mutually-exclusive options (a project can have one or the other):

| | Custom domain | Vanity subdomain |
|---|---|---|
| User sees | `auth.whetstone.au` | `whetstone.supabase.co` |
| Cost | $0.0137/hr ≈ **$10/mo per project**, add-on, **not** covered by the spend cap | Free, but needs a paid plan (Pro/Team/Enterprise) |
| Configured via | Dashboard **or** CLI | CLI only, flagged experimental |
| Old `<ref>.supabase.co` after activation | Keeps working — cut over at your own pace | Treat as broken (see caveat below) |

**Recommended: the custom domain.** $10/mo is noise against a consumer-facing
trust signal, and the old host staying live makes the cutover reversible and
zero-downtime.

> **Vanity-subdomain caveat.** The Supabase docs contradict themselves: the
> Custom Domains guide says the project domain "remains active", but the
> `vanity-subdomains activate` CLI reference says that after activation "your
> project's auth services will no longer function on the
> {project-ref}.{supabase-domain} hostname". Assume auth on the old host breaks,
> and update every provider console **before** activating.

**Cutover — custom domain at `auth.whetstone.au`**

Nothing in the app changes: `src/lib/supabase/{client,server,middleware}.ts` all
read `NEXT_PUBLIC_SUPABASE_URL`, so this is env + dashboards only.

1. Dashboard → **Project Settings → General → Custom Domains** (or the CLI:
   `supabase domains create --project-ref yywcerybuaxndsvdkjiw --custom-hostname auth.whetstone.au`).
   Subdomains only — the apex `whetstone.au` is not supported.
2. Add the DNS records with a **low TTL**: a `CNAME` for `auth.whetstone.au` →
   `yywcerybuaxndsvdkjiw.supabase.co.`, and the `_acme-challenge.auth` `TXT`
   record the previous step returns. Some registrars append the zone name — if
   so, enter `auth` rather than `auth.whetstone.au`.
3. `supabase domains reverify --project-ref yywcerybuaxndsvdkjiw`. May need a few
   attempts while DNS propagates; certificate issuance can take up to 30 minutes.
4. **Before activating**, add the new callback to each provider console
   **alongside** the existing one — Supabase Auth advertises the new host the
   instant the domain activates:
   - LinkedIn **Auth** tab and Google Cloud **Credentials**:
     `https://auth.whetstone.au/auth/v1/callback` **and**
     `https://yywcerybuaxndsvdkjiw.supabase.co/auth/v1/callback`.
5. `supabase domains activate --project-ref yywcerybuaxndsvdkjiw`.
6. Set `NEXT_PUBLIC_SUPABASE_URL=https://auth.whetstone.au` in Vercel and
   **redeploy** — it is build-time inlined (Launch checklist §4). Update
   `.env.example` to match.
7. After traffic has settled on the new host, remove the old callback from the
   LinkedIn and Google consoles, and update the callback URLs in §5 above.

Storage and Edge Functions move with it (`https://auth.whetstone.au/storage/v1/…`),
which is why a neutral name like `api.` or `auth.` beats anything auth-specific
if you expect to serve public storage URLs from it later.

The one documented hazard of this migration is SAML: activation changes the
project's `EntityID` and breaks existing identity providers. **Whetstone has no
SAML SSO**, so it does not apply here.

## 6. Payments (Stripe Connect)

Payments use **Stripe Connect** (separate charges & transfers): the customer pays
at checkout (funds held on the platform), and the advisor's cut is transferred to
their connected account when the booking completes. Commission is
`PLATFORM_COMMISSION_BPS` (default 1500 = 15%).

**Completion is two-sided.** The advisor marks the work done (booking →
`awaiting_confirmation`), the client is emailed, and the client accepting is what
releases the transfer. If the client never acts, the booking-lifecycle cron (§5c
of the launch checklist) nudges them at day 3 and accepts on their behalf at day
7, so a quiet client can't strand an advisor's payout. The post-session review is
feedback only and releases nothing.

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
4. Money movement: checkout → held; client confirms completion (or the day-7
   sweep does) → transfer to advisor (released); ops resolving a dispute also
   releases; ops can **Refund** from the dispute view (→ refunded + cancelled).

Amounts are multi-currency throughout — each booking/payment carries its own ISO
currency and Stripe is called in that currency.

## 7. Notes

- **Migrations:** applied to Supabase already. When you change the schema later,
  run `prisma migrate` against `DIRECT_URL` and apply any new `supabase/migrations/*.sql`
  (RLS/policies) via the Supabase CLI — Vercel does not run migrations on deploy.
- **Auth callback:** add the production URL (`https://app.whetstone.au`) and
  `*.vercel.app` preview URLs to Supabase → Authentication → URL Configuration
  (redirect allow-list).
