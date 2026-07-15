# Environment Variables — Setup Checklist

Complete list of environment variables the application needs, where each one comes from, and where it must be set. Set these in **two** places:

1. **Vercel** — Project Settings → Environment Variables (set for both `Preview` and `Development` environments for this dev/staging deployment; do not set `Production` values yet).
2. **Local `.env`** (this environment's `/home/user/Airbnb/.env`, gitignored) — for local verification (migrations, seed, dev server) before/alongside the Vercel deployment.

I don't need to see the actual values — just confirm each is set in both places, and I'll run migrations, seed, and deployment verification against them directly.

---

## Database — Neon

| Variable | Source | Notes |
|---|---|---|
| `DATABASE_URL` | Neon dashboard → your project → **Connect** → copy the **pooled** connection string (host includes `-pooler`) | Used by the app at runtime (Prisma Client queries). Append `?sslmode=require` if Neon's copy button doesn't already include it. |
| `DATABASE_URL_UNPOOLED` | Same Neon **Connect** dialog → toggle off "Pooled connection" → copy the **direct** connection string (host has no `-pooler`) | Used by Prisma Migrate for schema changes — migrations must bypass PgBouncer. |

Neon setup: create a project, create a database (or use the default `neondb` — if so, either rename it or adjust the connection string path to match our `booking_platform` naming), and ensure the Postgres version is 15+ (needed for the `postgis` and `pgcrypto` extensions already used in our schema). Neon supports both extensions on its standard tier — no special add-on needed, but confirm they show as available under **Extensions** in the Neon console before I run migrations.

---

## Authentication — NextAuth

| Variable | Source | Notes |
|---|---|---|
| `NEXTAUTH_URL` | The deployed URL Vercel assigns this environment (e.g. `https://<project>-<hash>-<team>.vercel.app`), or `http://localhost:3000` locally | Must match the actual origin exactly, including protocol. |
| `NEXTAUTH_SECRET` | Generate with `openssl rand -base64 32` | Any 32+ byte random string. Use a **different** value than your local `.env`'s dev placeholder — this should be a real secret even for staging. |

---

## Image Uploads — Cloudinary (Phase 3)

| Variable | Source | Notes |
|---|---|---|
| `CLOUDINARY_CLOUD_NAME` | Cloudinary dashboard home page, top left | Server-side. |
| `CLOUDINARY_API_KEY` | Cloudinary dashboard → **Settings** → **Access Keys** | Server-side, keep secret. |
| `CLOUDINARY_API_SECRET` | Same page as API Key | Server-side, keep secret — never expose with `NEXT_PUBLIC_` prefix. |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Same value as `CLOUDINARY_CLOUD_NAME` | Client-side, safe to expose (cloud name is not sensitive). |
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | Cloudinary dashboard → **Settings** → **Upload** → **Upload presets** → create an **unsigned** preset scoped to a specific folder (e.g. `listings/`) | Needed for direct-from-browser uploads without exposing the API secret. Set **Signing Mode** to "Unsigned" and restrict allowed formats to images only. |

---

## Payments — Stripe (test mode)

| Variable | Source | Notes |
|---|---|---|
| `STRIPE_SECRET_KEY` | Stripe dashboard → **Developers** → **API keys** → toggle **Test mode** (top right) → **Secret key** | Starts with `sk_test_`. Server-side only. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Same page → **Publishable key** | Starts with `pk_test_`. Safe to expose client-side. |
| `STRIPE_WEBHOOK_SECRET` | Stripe dashboard → **Developers** → **Webhooks** → add an endpoint pointing at `<deployed-url>/api/webhooks/stripe` (once that route exists — later phase) → **Signing secret** | Starts with `whsec_`. Can be left unset for now since no webhook route consumes it yet; needed before Phase 11 (payments). |

---

## Maps

| Variable | Source | Notes |
|---|---|---|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Cloud Console → **APIs & Services** → **Credentials** → create an API key, restrict it to the **Maps JavaScript API** and to your Vercel domain(s) | Already referenced in three components (listing map views). |

---

## Vercel-provided (no action needed)

`VERCEL_URL`, `VERCEL_ENV`, `NODE_ENV` are set automatically by the platform — nothing to configure.

---

## Verification Sequence (once variables are set)

Once you confirm the Neon and Vercel variables are populated, I will:
1. Point this environment's Prisma CLI at `DATABASE_URL_UNPOOLED` and run `prisma migrate deploy` against Neon (no destructive `migrate dev` — the migration history is already finalized from local development).
2. Run `prisma db seed` against Neon and verify row counts (property types, amenities).
3. Confirm the Vercel deployment builds and starts without error (via deployment logs, no secret values printed).
4. Exercise registration → login → session on the deployed URL to confirm NextAuth + Neon connectivity end-to-end.

Cloudinary and Stripe variables unblock Phase 3 feature work (image upload, and dev-environment payment wiring ahead of Phase 11) but aren't required for the infra verification steps above — those can be populated any time before Phase 3's image-upload work needs testing.
