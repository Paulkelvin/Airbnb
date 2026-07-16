# Environment Variables — Setup Checklist

Complete list of environment variables the application needs: which service each belongs to, where to obtain the value, whether it's needed for Development (local + Vercel Preview — this deployment is staging/validation only) or Production (a future real launch), and what it's used for.

Set these in **two** places:

1. **Vercel** — Project Settings → Environment Variables (set for `Preview`/`Development`; hold off on `Production` values until an actual launch).
2. **Local `.env`** (`/home/user/Airbnb/.env`, gitignored) — for local verification (migrations, seed, dev server).

I don't need to see the actual values — just confirm each is set, and I'll run migrations, seed, and deployment verification against them directly.

---

## Database — Neon

| Variable | Service | Where to obtain | Required | Purpose |
|---|---|---|---|---|
| `DATABASE_URL` | Neon | Dashboard → project → **Connect** → copy the **pooled** connection string (host contains `-pooler`) | Both | Runtime Prisma Client queries. Append `?sslmode=require` if not already present. |
| `DATABASE_URL_UNPOOLED` | Neon | Same **Connect** dialog → toggle off "Pooled connection" → copy the **direct** string (no `-pooler`) | Both | Prisma's `directUrl`, used by `prisma migrate` — migrations must bypass PgBouncer. Named `DATABASE_URL_UNPOOLED` (not the more generic `DIRECT_URL` convention) to match this schema. |

Setup notes: Postgres 15+; confirm `postgis` and `pgcrypto` show as available under the Neon console's **Extensions** tab before migrations run.

## Authentication — Auth.js (NextAuth v4)

| Variable | Service | Where to obtain | Required | Purpose |
|---|---|---|---|---|
| `NEXTAUTH_URL` | Auth.js | The deployed origin (`https://<project>.vercel.app`) or `http://localhost:3000` locally | Both, different value per environment | Must exactly match the app's own origin including protocol. |
| `NEXTAUTH_SECRET` | Auth.js | Generate with `openssl rand -base64 32` | Both, distinct value per environment | Signs/encrypts session JWTs. Never reuse the local dev placeholder anywhere real. |

## Image Uploads — Cloudinary

| Variable | Service | Where to obtain | Required | Purpose |
|---|---|---|---|---|
| `CLOUDINARY_CLOUD_NAME` | Cloudinary | Dashboard home page, top-left | Both | Server-side SDK config. |
| `CLOUDINARY_API_KEY` | Cloudinary | Dashboard → **Settings** → **Access Keys** | Both | Server-side only — signed image deletion. |
| `CLOUDINARY_API_SECRET` | Cloudinary | Same page as API Key | Both | Server-side only. Never prefix with `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary | Same value as `CLOUDINARY_CLOUD_NAME` | Both | Client-side — cloud name isn't sensitive. |
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | Cloudinary | Dashboard → **Settings** → **Upload** → **Upload presets** → create an **unsigned** preset, scope to a `listings/` folder, restrict to image formats | Both | Lets the browser upload directly to Cloudinary without exposing the API secret. |

## Payments — Stripe Connect (test mode)

| Variable | Service | Where to obtain | Required | Purpose |
|---|---|---|---|---|
| `PAYMENTS_PROVIDER` | Self-selected | Set to `stripe` to activate real Stripe Connect calls | Optional — defaults to `stub` | Feature flag (`src/lib/payments/index.ts`). Unset or any value other than `stripe` keeps the app on `StubPaymentProvider` (no network calls, no credentials needed) — the entire booking engine works end-to-end without this. Setting `stripe` without both variables below throws a clear startup error rather than silently falling back. |
| `STRIPE_SECRET_KEY` | Stripe | Dashboard → **Developers** → **API keys** → toggle **Test mode** → **Secret key** (`sk_test_...`) | Required only when `PAYMENTS_PROVIDER=stripe` | Server-side only. Test mode — never a live (`sk_live_...`) key. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe | Same page → **Publishable key** (`pk_test_...`) | Not consumed yet | Reserved for when a real Stripe Elements checkout UI replaces the current fixed test-card stand-in (see `StripeConnectProvider.createCharge`'s doc comment) — not required for this phase's server-side integration. |
| `STRIPE_WEBHOOK_SECRET` | Stripe | Dashboard → **Developers** → **Webhooks** → add an endpoint pointing at `/api/webhooks/stripe` → **Signing secret** (`whsec_...`). For local testing, `stripe listen --forward-to localhost:3000/api/webhooks/stripe` prints a session-scoped secret instead. | Required only when `PAYMENTS_PROVIDER=stripe` | Verifies `POST /api/webhooks/stripe` request signatures (`stripe-signature` header). |

## Notifications — Resend (email)

| Variable | Service | Where to obtain | Required | Purpose |
|---|---|---|---|---|
| `NOTIFICATIONS_PROVIDER` | Self-selected | Set to `resend` to activate real email sends | Optional — defaults to `stub` | Feature flag (`src/lib/notifications/index.ts`), mirrors `PAYMENTS_PROVIDER`. Unset or any value other than `resend` keeps the app on `StubEmailProvider` (logs to console, no network calls, no credentials needed) — the entire notification pipeline (in-app rows, preference gating, retrofit call sites) works end-to-end without this. Setting `resend` without both variables below throws a clear startup error rather than silently falling back. |
| `RESEND_API_KEY` | Resend | Dashboard → **API Keys** → create key | Required only when `NOTIFICATIONS_PROVIDER=resend` | Server-side only. |
| `RESEND_FROM_EMAIL` | Resend | A verified sending domain/address in the Resend dashboard | Required only when `NOTIFICATIONS_PROVIDER=resend` | The `from` address on every transactional email — must belong to a domain verified in Resend or sends will fail. |

## Maps

| Variable | Service | Where to obtain | Required | Purpose |
|---|---|---|---|---|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Cloud | Console → **APIs & Services** → **Credentials** → create a key restricted to **Maps JavaScript API** and your Vercel domain(s) | Both | Powers listing map embeds (referenced in 3 components). |

## Background Jobs

| Variable | Service | Where to obtain | Required | Purpose |
|---|---|---|---|---|
| `CRON_SECRET` | Self-generated | Generate with `openssl rand -base64 32` | Both, distinct value per environment | Bearer-token auth for `/api/jobs/booking-lifecycle` (date-driven check-in/checkout/lease transitions + monthly rent charging — ADR-015), triggered daily by the `crons` entry in `vercel.json`. Named `CRON_SECRET` specifically because Vercel auto-attaches it as the `Authorization: Bearer` header on its own Cron Job requests — no manual header wiring needed once this variable is set. |

## Provided automatically — no action needed

`VERCEL_URL`, `VERCEL_ENV`, `NODE_ENV` are set by the platform itself.

---

## Verification Sequence (once variables are set)

Once you confirm the Neon and Auth.js variables are populated, I will:
1. Point Prisma at `DATABASE_URL_UNPOOLED` and run `prisma migrate deploy` against Neon (not `migrate dev` — history is already finalized from local development).
2. Run `prisma db seed` against Neon and verify row counts (property types, amenities).
3. Confirm the Vercel deployment builds and starts without error (via deployment logs, no secret values printed).
4. Exercise registration → login → session on the deployed URL to confirm Auth.js + Neon connectivity end-to-end.

Cloudinary and Stripe variables aren't required for the infra verification steps above — those can follow whenever, ahead of testing image upload or before the Payments phase.

---

## Seed Data

Two separate seed scripts exist — do not confuse them:

| Script | Command | Safe in production? | Contents |
|---|---|---|---|
| `prisma/seed.ts` | `npm run db:seed` | Yes — idempotent reference data | Property types, amenities |
| `prisma/seed-dev-data.ts` | `ALLOW_DEV_SEED=1 npm run db:seed:dev` | **No — refuses to run** | 6 fake listings + a test host, for exercising search/filter/sort locally |

`seed-dev-data.ts` hard-refuses to run unless `NODE_ENV` and `VERCEL_ENV` both look non-production **and** `ALLOW_DEV_SEED=1` is explicitly set — it will not run by accident from a CI job or a misconfigured deploy step. Never wire it into a build/deploy pipeline; it's a manual, local-only command.
