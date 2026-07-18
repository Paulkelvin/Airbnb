# Production Deployment Checklist

A practical, checkbox-driven runbook for taking this app from "deployed and working in dev/preview" to "actually launched." This is the *how-to-execute* companion to `docs/release-readiness-plan.md` (the longer-form audit of what's done/not-done and why) and `docs/project-status.md` (the canonical project history and findings log, especially §10's C1–C9). Work through this top to bottom; don't skip the credential-rotation section at the end just because everything above it is green.

**Before you start:** read `docs/project-status.md` §10, finding **C1** — this repo's `prisma/seed.ts` contains a hardcoded, source-controlled demo admin login. As of this checklist's writing that credential has *not* been rotated (a private copy is held outside the repo, by client decision) — see the Secret Rotation section below before this goes anywhere near real users.

---

## 1. Neon (Postgres) Provisioning

- [ ] Production Neon project/branch created, separate from any dev/preview branch.
- [ ] `postgis` and `pgcrypto` extensions enabled (Neon console → **Extensions**) — migrations will fail without both.
- [ ] Pooled connection string copied for `DATABASE_URL` (host contains `-pooler`).
- [ ] Direct (unpooled) connection string copied for `DATABASE_URL_UNPOOLED` (no `-pooler` — used by `prisma migrate deploy`, which must bypass PgBouncer).
- [ ] Both appended with `?sslmode=require` if not already present.
- [ ] Neon's automated backup / point-in-time-recovery window confirmed enabled and its retention period noted somewhere the team can find it under pressure.
- [ ] **A separate test database branch provisioned** (`docs/project-status.md` §10, finding C5) — do this before anyone runs `npm test` against real credentials. See §4 (Testing) of `docs/setup/environment-variables.md` for the `.env.test` convention this repo expects.

## 2. `prisma migrate deploy`

- [ ] Run `prisma migrate deploy` against the **production** `DATABASE_URL_UNPOOLED`, not `migrate dev` (history is already finalized from development — `migrate dev` is a local-only workflow).
- [ ] Confirm all 11+ migrations apply cleanly (check `prisma/migrations/` for the current count — it grows over time, don't hardcode a number in your head).
- [ ] Vercel's `vercel-build` script already runs this automatically on every deploy (`prisma migrate deploy && tsx prisma/seed-cities.ts && next build`) — verify this actually happened by checking the deploy logs, don't assume.

## 3. Seed

- [ ] `npm run db:seed` (`prisma/seed.ts`) run at least once against production — this is **not** currently wired into `vercel-build` (see `docs/project-status.md` §10, finding C3: this was silently dropped at some point and never restored; a deliberate decision on whether to re-add it is still outstanding).
- [ ] Confirm reference data landed: property types and amenities rows exist.
- [ ] **Be aware this same script also creates a demo admin account, a demo host account, and 15 demo listings with hardcoded credentials** (finding C1). Confirm with the client whether these demo accounts/listings are wanted in the production database at all before running this against a real launch environment — don't run it unthinkingly just because it's "the seed script."
- [ ] `tsx prisma/seed-cities.ts` (the ~32,000-row US Census city taxonomy) — already wired into `vercel-build`, confirm it actually populated (`SELECT count(*) FROM "City"`).
- [ ] Do **not** run `prisma/seed-dev-data.ts` against production — it hard-refuses to run if `NODE_ENV`/`VERCEL_ENV` look like production, so this should be self-enforcing, but don't try to work around that guard.

## 4. Cloudinary

- [ ] Production Cloudinary account/cloud confirmed (or reuse the existing one if it's already been serving real listing photos — check `docs/project-status.md` §4 for current status).
- [ ] `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` set server-side only.
- [ ] `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` set (same value as `CLOUDINARY_CLOUD_NAME` — not sensitive, safe to expose client-side).
- [ ] `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` — an **unsigned** upload preset created in the Cloudinary dashboard, scoped to a `listings/` folder, restricted to image formats.
- [ ] `res.cloudinary.com` confirmed present in `next.config.js`'s `images.remotePatterns` and the CSP's `img-src` (should already be there — just verify it wasn't dropped in a future edit).

## 5. Vercel Environment Variables

- [ ] Full variable list cross-checked against `docs/setup/environment-variables.md` — every row marked "Required" for Production is actually set in Vercel's **Production** environment (not just Preview/Development).
- [ ] No variable value pasted with a leading/trailing space — `docs/project-status.md` §1 documents a real bug class here (`NEXTAUTH_URL` with a stray leading space breaks `next build`'s URL parsing outright).
- [ ] `NEXT_PUBLIC_*` variables double-checked to contain nothing sensitive (they ship to the browser bundle).

## 6. `NEXTAUTH_SECRET`

- [ ] Generated fresh with `openssl rand -base64 32` — **never reuse the local dev placeholder value.**
- [ ] Distinct value per environment (Production ≠ Preview ≠ local `.env`).
- [ ] Set in Vercel Production environment variables.
- [ ] `NEXTAUTH_URL` set to the real production origin (exact match, including protocol, no trailing slash inconsistency) — this is also reused as the app's canonical absolute-URL source (`src/lib/site-url.ts`) for email links, `metadataBase`, sitemap, and robots.txt.

## 7. `CRON_SECRET`

- [ ] Generated fresh (`openssl rand -base64 32`), distinct from any dev value.
- [ ] Set in Vercel Production environment variables — Vercel Cron auto-attaches it as the `Authorization: Bearer` header on its own scheduled requests once set, no manual wiring needed.

## 8. Stripe Setup

- [ ] Stripe account confirmed, test mode first (do not jump straight to live keys).
- [ ] `STRIPE_SECRET_KEY` (`sk_test_...` for test mode) set server-side only.
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (`pk_test_...`) set — gates whether the embedded Stripe Elements card form renders at instant-book checkout; without it the app falls back to the dev/stub flow.
- [ ] `PAYMENTS_PROVIDER=stripe` set (defaults to `stub` otherwise — the whole booking engine works against the stub with zero Stripe credentials, so this flag is what actually turns real payments on).
- [ ] **Run the embedded Stripe Elements checkout end-to-end at least once against real test-mode credentials.** Per `docs/project-status.md` §10/§4, this has never been exercised against a real Stripe account in any development session (sandbox network policy blocks it) — this is the single most important unverified integration in the whole codebase. Do not treat "credentials are set" as equivalent to "this works."
- [ ] Stripe Connect Express account flow (host onboarding) verified against a real test host.

## 9. Stripe Webhook

- [ ] Webhook endpoint registered in the Stripe dashboard pointing at the real deployed URL: `https://<your-domain>/api/webhooks/stripe` — **not** `localhost`, and not the `stripe listen --forward-to` tunnel used for local dev.
- [ ] `STRIPE_WEBHOOK_SECRET` (`whsec_...`) copied from that endpoint's **Signing secret** and set in Vercel Production.
- [ ] At least one real event delivered and verified processed correctly (signature verification, idempotency) — trigger one from the Stripe dashboard's "send test webhook" tool or by completing a real test-mode charge.
- [ ] Full event set exercised, not just `payment_intent.succeeded`: refund, transfer, and chargeback/dispute events at minimum, since the app's webhook handler normalizes all of these.

## 10. Resend (Email)

- [ ] Resend account created, sending domain added and verified (SPF/DKIM records set at the DNS provider) — sends will fail against an unverified domain.
- [ ] `RESEND_API_KEY` set server-side.
- [ ] `RESEND_FROM_EMAIL` set to an address on the verified domain.
- [ ] `NOTIFICATIONS_PROVIDER=resend` set (defaults to `stub`, which logs to console instead of sending — the whole notification pipeline works against the stub with zero Resend credentials, so, same as Stripe, this flag is the actual on-switch).
- [ ] One real email of each `CRITICAL_EMAIL_TYPES` template received and visually checked: password reset, booking confirmed, booking cancelled, payment failed.

## 11. Cron Verification

- [ ] `vercel.json`'s two cron entries confirmed present and correctly scheduled: `/api/jobs/booking-lifecycle` (`0 3 * * *`) and `/api/jobs/review-expiry` (`0 4 * * *`).
- [ ] After the first scheduled fire post-launch, confirm in Vercel's Cron dashboard (or function logs) that both actually ran and returned success — a cron job silently failing every night (bad `CRON_SECRET`, an unhandled exception) has no other alerting today.
- [ ] Manually trigger each once ahead of the scheduled time (authenticated `Authorization: Bearer <CRON_SECRET>` request) to confirm the route works before waiting for the real schedule.

## 12. Image Upload Verification

- [ ] Upload a real image through the listing wizard (`/add-listing`) end-to-end — confirm it lands in Cloudinary under the expected folder and renders back on the listing page via `next/image` with the `cloudinaryLoader`.
- [ ] Delete an image from a listing and confirm the signed server-side delete actually removes it from Cloudinary (not just from the DB row).
- [ ] Confirm the CSP's `img-src` and `images.remotePatterns` in `next.config.js` haven't drifted from what's actually being loaded (Cloudinary + any other real image host in use).

## 13. Password Reset Verification

- [ ] Request a password reset for a real (test) account through `/forgot-password`.
- [ ] Confirm the email actually arrives (requires Resend live per §10 above) with a working reset link.
- [ ] Complete the reset via `/reset-password` and confirm login works with the new password.
- [ ] Confirm the reset token is single-use — attempting to reuse the same link a second time should fail.
- [ ] Confirm rate limiting on `forgotPassword()` is active (5/hour, IP-keyed) — hitting it repeatedly should eventually be rejected rather than silently resending forever.

## 14. Booking Flow Verification

- [ ] Full golden path, both rental types, against the real deployed stack (not local dev): search → listing detail → date selection → checkout → payment → confirmation.
- [ ] Short-term instant-book: real Stripe Elements card collection completes and a `Booking` row lands in `CONFIRMED` status.
- [ ] Long-term application/accept flow: host approval step, security deposit hold, lease terms all confirmed working.
- [ ] Cancellation flow exercised for at least one booking, confirming the correct refund tier applies (FLEXIBLE/MODERATE/STRICT per `src/lib/pricing-policy.ts`).
- [ ] Availability/double-booking guard verified: attempt two concurrent bookings for overlapping dates on the same listing, confirm the transactional unique-constraint guard actually rejects the second one.
- [ ] Mobile viewport booking flow re-confirmed on the real deployed URL (not just local dev) — this was a real, previously-shipped bug (`docs/project-status.md` §2.15).

## 15. Host Payout Verification

- [ ] `payoutForPayment()` exercised at least once against a real Stripe Connect Express test account, confirming the transfer actually completes and is `AuditLog`-recorded (actor, amount, currency, status).
- [ ] **Confirm the payout-timing policy decision has actually been made**, not silently left as "manual only" by default — `docs/project-status.md` §7 lists this as an explicit Outstanding Decision the client needs to resolve, not a technical gap. Don't wire an automatic trigger without that decision being made first.
- [ ] Host-facing payout/earnings UI (`account-billing`) checked against the real payout data, not just the admin-side view.

## 16. Secret Rotation

- [ ] **The demo admin/host credentials in `prisma/seed.ts` (finding C1)** — rotate both passwords (or decide, with the client, whether these accounts should exist in production at all) before real users are on the platform. This is explicitly deferred as of this checklist's writing; don't let "deferred" quietly become "forgotten." See `prisma/seed.ts`'s header comment for the recommended long-term fix.
- [ ] `NEXTAUTH_SECRET`, `CRON_SECRET`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `CLOUDINARY_API_SECRET`, `SANITY_API_TOKEN`, `SANITY_REVALIDATE_SECRET` — confirm every one of these lives *only* in Vercel's environment variable system, never committed, never pasted into a doc or chat log that outlives this rotation.
- [ ] Confirm whoever provisions these documents where the source-of-truth copies live (a password manager or secrets vault) — outside this repository, per `docs/release-readiness-plan.md` §4.
- [ ] If any of the above were ever exposed (committed to git history, pasted into an unencrypted doc, shared over an insecure channel) at any point, rotate them now regardless of whether this checklist item was already checked once before.

## 17. Final Smoke Tests

- [ ] Cross-browser pass: Chrome, Safari, Firefox, and specifically **real iOS Safari** (not just Chromium's mobile device emulation — `docs/project-status.md` §10 notes this project has never tested against real WebKit).
- [ ] Keyboard-only navigation through the booking flow (search → listing → date picker → checkout) — date pickers and Headless UI popovers are common keyboard-trap sources.
- [ ] Screen reader pass (VoiceOver or NVDA) on signup, login, and booking creation.
- [ ] Error tracking (Sentry or equivalent) wired in and confirmed capturing a deliberately-triggered test error, on both server and client runtimes.
- [ ] Uptime/health-check monitoring live on the deployed app and specifically on the two cron-triggered job routes.
- [ ] Load test on the booking-creation path under realistic concurrent traffic — confirm the transactional availability guard holds at real scale, not just the two-request test used during development.

## 18. Launch Checklist

The final go/no-go pass — every item above should be checked (or explicitly, consciously waived by the client with the reason recorded in `docs/release-readiness-plan.md`) before flipping this on for real users.

- [ ] All BLOCKER items in `docs/release-readiness-plan.md` resolved or explicitly waived.
- [ ] Finding C1 (demo credentials) resolved — rotated or the accounts deliberately removed from production.
- [ ] Stripe Elements checkout run at least once against a real test-mode account (§8 above).
- [ ] Stripe webhook live and verified against the real deployed URL (§9 above).
- [ ] Backup/PITR confirmed enabled on Neon, with one dry-run restore into a scratch environment completed (not just "backups exist" — confirmed the team knows how to actually restore one).
- [ ] Client sign-off obtained on the two flagged business-scope questions `docs/release-readiness-plan.md` §6/§9 raise but doesn't resolve unilaterally: (a) is full WCAG 2.1 AA compliance a launch blocker given ADA exposure, (b) is GDPR-style data export/deletion tooling required for the target launch market.
- [ ] `docs/project-status.md`'s Outstanding Decisions (§7) — payout timing policy specifically — confirmed resolved or explicitly still deferred with the client's knowledge.
- [ ] Custom domain + DNS cutover complete, if not launching on the default `*.vercel.app` URL.
- [ ] Preview-deployment protection (Vercel password protection or similar) confirmed on for any non-production deployments, so in-progress work isn't publicly indexable.
- [ ] Final review: has anything in this checklist been checked off from memory rather than actually verified? If in doubt, re-verify rather than assume.

---

## Maintaining This Document

Update this checklist the same way `docs/project-status.md` and `docs/release-readiness-plan.md` are kept current — check items off as they're genuinely done, don't check something off because it was done once in the past if a later change could have regressed it (e.g., a CSP edit that quietly drops an image host, an env var that got removed during a later cleanup pass).
