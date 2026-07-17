# Release Readiness Plan

**Status as of 2026-07-17 (updated alongside a comprehensive `docs/project-status.md` rewrite — see that file's §10 "Critical Review" for full detail on every finding referenced below):** Core platform feature development is complete and has been for some time. Since the 2026-07-16 status below was written, a further ~44 commits shipped (an admin dashboard redesign, a full custom in-admin CMS replacing the embedded Sanity Studio, real embedded Stripe Elements checkout, admin-curated City taxonomy backed by the full US Census dataset, an open-redirect security fix, and the previously-missing "Featured places to stay" home page section, among others — see `docs/project-status.md` §2 for the complete, reconstructed changelog). **Cloudinary is now also fully configured and confirmed working in production** — its "not configured" status below is stale. **A new, more urgent finding supersedes everything else in this document: `docs/project-status.md` §10 finding C1 — hardcoded, source-controlled admin and host credentials that are almost certainly live in the production database.** Resolve that before treating any other item here as the top priority. Everything else below remains an accurate checklist — items closed since the previous update are marked **✅ done** in place (not removed), new findings are added inline tagged with their `docs/project-status.md` §10 reference (C1–C9). Update this file as items are completed — the fact that it (and `project-status.md`) went un-updated for a full day of work last time is itself documented as a finding (C7) — don't repeat it.

**How to read this document:** every item is tagged **BLOCKER** (must be resolved before a real, paying-customer launch) or **ENHANCEMENT** (safe to ship after launch, improves the product but doesn't put users, money, or the business at risk if deferred). The tag reflects risk if shipped without it, not effort to build it — several blockers are small; several enhancements are large.

---

## 0. Urgent — Resolve Before Treating Anything Else As The Priority

- [ ] **CRITICAL (`project-status.md` §10, C1)** — `prisma/seed.ts` creates an `admin@potomac-demo.com` / `PotomacAdmin2026!` account (full `ADMIN` role) and a `host@potomac-demo.com` / `PotomacHost2026!` account, both with plaintext passwords committed to source control. This script has been run against the real production database. Anyone with read access to this repository can log into the live admin dashboard today. Rotate both passwords (or delete the accounts, if confirmed unnecessary) before anything else on this page.
- [ ] **HIGH (`project-status.md` §10, C2)** — the embedded Stripe Elements checkout (instant-book card collection) has never been run against a real Stripe account from any development session — sandbox network policy has blocked it every time. This needs to happen at least once, with real test-mode credentials, before this platform can be called release ready, independent of the general "provision Stripe credentials" checklist item in §2 below.

---

## 1. Remaining Essential Features

Everything named in the blueprint's core feature set is built and tested (auth/authorization, listings, search, bookings, Stripe Connect payments, messaging, reviews/favorites, rate limiting, admin dashboard, notifications). Several gaps have been found since Phase 10 that were functional dead ends for a real user, not polish — all now resolved:

- **✅ done (Release Hardening milestone) — Password-reset emails are never sent.** `forgotPassword()` (`src/actions/auth.ts`) generates a real reset token but only `console.log`s it (`TODO: Send email with reset link`, predates this session). A real user who forgets their password today has no way to recover their account. Now that `EmailProvider` exists (Phase 10), this is a small fix: call `getEmailProvider().send()` with the reset link instead of logging it. Not folded into Phase 10 because a password-reset link isn't a `NotificationType` in the schema (it's a security-sensitive one-time link, not a `Notification` row a user should see in their in-app list) — it needs its own direct send, not a `notify()` call. **Resolved:** now sends via `getEmailProvider().send()` with a dedicated template (ADR-027 #1). A deeper gap was also found and fixed alongside it: no `/forgot-password`/`/reset-password` UI page existed at all before this pass (see `docs/project-status.md`).
- **✅ done (Release Hardening milestone) — The header's `AvatarDropdown` isn't wired to real session state.** `src/app/(client-components)/(Header)/AvatarDropdown.tsx` never calls `useSession()` despite `AuthSessionProvider` being mounted at the root layout — it renders the same static "My Account / Wishlist / Log out" menu regardless of whether anyone is logged in, and "Log out" just navigates to `/login` instead of calling `signOut()`. A logged-in user cannot actually sign out from the main site header (only from wherever else `signOut()` might be wired, if anywhere — not confirmed). This is pre-existing (not introduced by any recent phase) but is a launch-blocking correctness issue, not polish. **Resolved:** `AvatarDropdown` now calls `useSession()`/`signOut()`; `MainNav1`'s "Sign up" button also now hides once authenticated.
- **✅ done (Mobile UX Pass) — Mobile users could not book at all.** `BookingWidget` (the real, Phase-5-wired booking form) was `hidden lg:block` — desktop only. Mobile instead saw a layout-level component showing a hard-coded fake price and a "Reserve" button that opened an orphaned template demo checkout page wired to no real booking action. Found via a client bug report against the live deployment, not caught by any prior testing pass (every E2E pass to date used a desktop-width browser). **Resolved:** real `MobileBookingBar` (ADR-029 #4) reuses the same `BookingWidget` in a bottom sheet — one real implementation for both breakpoints.
- **✅ done (reconstructed from commit history, `project-status.md` §2.16) — No header unread-notification badge.** `NotifyDropdown` now fetches from a real `/api/notifications/recent` route (backed by `getMyNotifications()`/`getUnreadNotificationCount()`), confirmed by direct code read during this update, not just cited from a commit message.
- **✅ done (reconstructed from commit history, `project-status.md` §2.16) — `BtnLikeIcon` on search-results/home-page `StayCard` instances is local-only UI state.** Now calls the real `toggleFavorite()` action, confirmed by direct code read during this update.
- **✅ done (reconstructed from commit history, `project-status.md` §2.16) — The home page had no "Featured places to stay" section**, present on the original Chisfis template demo the client compared against. Built: a bleed-style destination carousel plus a full `StayCard` grid. Closes a gap this document's own history had explicitly flagged as unstarted.
- **ENHANCEMENT — No real-time message delivery** (polling/refresh only). Documented as acceptable for MVP since Phase 7; no architecture doc requires it.
- **ENHANCEMENT — Payout timing is manual-only** (`payoutForPayment()`, Phase 6) — the client explicitly deferred the automatic-trigger timing decision as a future business decision. Do not wire an automatic trigger without asking first (this is an *Outstanding Decision*, not a bug).

---

## 2. Production Infrastructure Verification

All of these are configuration/credential steps, not code changes — the codebase has run 100% functionally against stub/local equivalents this entire project by design, specifically so nothing in feature development was blocked waiting on them.

| Service | Status | Blocker? | What's needed |
|---|---|---|---|
| Neon (Postgres) | ✅ Connected and migrated | **BLOCKER** — resolved | Real `DATABASE_URL`/`DATABASE_URL_UNPOOLED` set in Vercel. All 11 migrations applied, `postgis`/`pgcrypto` enabled, reference data seeded. Live site search and amenity filters confirmed working. **Also see `project-status.md` §10 C1 (hardcoded seeded credentials) and C5 (no separate test database) — this row being "done" doesn't mean this database is risk-free.** |
| Cloudinary | ✅ **Configured and confirmed working** | **BLOCKER** — resolved | Real credentials in place, real listing photos flowing through it in production, per-component transform loader (`cloudinaryLoader`) applied everywhere. (`res.cloudinary.com` is in `next.config.js`'s `images.remotePatterns` and the CSP's `img-src`.) |
| Sanity (CMS) | ✅ **Configured and confirmed working** | **BLOCKER** — resolved (added since the previous version of this table) | Real project ID/dataset/token in place. Blog, About, FAQ, Terms, Privacy all migrated off hardcoded content. Admin edits go through a custom `/admin/content/*` editor, not Sanity's own Studio UI — see `project-status.md` §10 C4 (the old Studio route is still deployed and should be removed). |
| Stripe Connect | Code-ready, credentials not confirmed | **BLOCKER, and see §0 above — this is now the single most important unverified integration** | Real `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` (test mode first) + webhook endpoint registered pointing at `/api/webhooks/stripe`. The embedded Stripe Elements checkout (instant-book card collection) exists in code but has **never been run against a real Stripe account** — this is a bigger open question than "provision the credentials," it's "the one major system that's never been exercised against its own dependency." |
| Resend (email) | Not configured | **BLOCKER, intentionally deferred — see `project-status.md` §9** | Real `RESEND_API_KEY` + `RESEND_FROM_EMAIL` on a verified sending domain. Nothing in the notification pipeline sends real email until this is set. Deferred as a deliberate go-live decision, not a technical gap — the whole pipeline works today against the stub provider. |
| Vercel | ✅ Deployed and live | **BLOCKER** — resolved | Build succeeds with `vercel-build` script (`prisma migrate deploy && tsx prisma/seed-cities.ts && next build`). **Note: this no longer includes `prisma db seed` — see `project-status.md` §10 C3**, a real change from what this row previously claimed. Live site confirmed working. |
| `NEXTAUTH_SECRET` | Local dev placeholder only | **BLOCKER** | Generate a real, distinct-per-environment secret (`openssl rand -base64 32`) — never reuse the dev value. |
| `CRON_SECRET` | Local test value only | **BLOCKER** | Generate a real secret; Vercel Cron auto-attaches it as the `Authorization: Bearer` header once set as an env var, per `vercel.json`. |
| Google Maps API key | Documented, not populated | **ENHANCEMENT** (degrades map embeds only, doesn't block core booking flow) | Real `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` restricted to the production domain. |

See `docs/setup/environment-variables.md` for the full reference (every variable, where to obtain it, dev vs. prod requirement, including the Sanity variables added to that file alongside this update) — this table only flags launch-readiness status, not the how-to.

---

## 3. Deployment Checklist

- [ ] **BLOCKER** — First Vercel deployment, verified against real Neon + real env vars (not just local). **In progress:** first real attempt made against `main`, failed twice on build-time bugs (missing `prisma generate` on Vercel's cached install; `sitemap.ts` querying the DB at build time) — both fixed in code and verified locally with the database entirely unavailable (ADR-028). Not yet re-run against a live deployment, and no real `DATABASE_URL`/other credentials are set yet — expect this to still fail (or deploy but error at runtime) until those are provisioned.
- [ ] **BLOCKER** — `vercel.json`'s Cron entry (booking-lifecycle job) confirmed actually firing on schedule in the deployed environment, hitting `/api/jobs/booking-lifecycle` with the real `CRON_SECRET`.
- [x] `/api/jobs/review-expiry` has a Cron entry in `vercel.json` (`0 4 * * *`, confirmed present during this pass) — just needs runtime verification once deployed, per the checklist item above.
- [ ] **BLOCKER** — Stripe webhook endpoint registered against the deployed URL (not `localhost`), signature verified against a real `stripe listen`/dashboard-configured event.
- [x] **BLOCKER — done (Release Hardening milestone)** — `metadataBase` set in `src/app/layout.tsx` metadata — currently unset, so Next.js falls back to `http://localhost:3000` for resolving Open Graph/Twitter image URLs in production (confirmed via a build warning during this session). One-line fix once the production domain is known. **Resolved:** now set via `new URL(getSiteUrl())`, which reads the real `NEXTAUTH_URL` once it's populated for production — no further action needed once that env var is set.
- [ ] **ENHANCEMENT** — Custom domain + DNS cutover, if not using the default `*.vercel.app` URL at first launch.
- [ ] **ENHANCEMENT** — Preview-deployment protection (Vercel password protection or similar) so in-progress work isn't publicly indexable before intentional launch.

---

## 4. Security Verification

The Phase 9 Follow-up audit (documented in `project-status.md`) already verified, against the real codebase, that: no `/admin/*` page is reachable by non-admins; no Server Action is callable in a way that bypasses its own authorization; every admin action requires `requireAdmin()`; every privileged action now writes an `AuditLog` row (three real gaps found and fixed in that pass); no privilege escalation is possible via a modified request (roles are never client-supplied); IDs cannot be enumerated to expose other users' data; hidden/rejected listings aren't reachable via direct URL without permission. That work does not need to be redone — this section covers what it didn't cover.

- [x] **BLOCKER — done (Release Hardening milestone)** — **No rate limiting on login** (`/api/auth/[...nextauth]`, NextAuth credentials provider). The blueprint named signup/inquiry/message/review explicitly and those are covered (ADR-023) — login itself was never in that list, but shipping a credentials-based login with zero brute-force/credential-stuffing protection is a real production risk. Needs a `checkRateLimit()` call keyed by IP and/or email in the NextAuth `authorize()` callback, or an edge-level rate limit in front of the route. **Resolved:** two independent limits (`LOGIN_IP` + `LOGIN_EMAIL`, ADR-027 #2) checked inside `authorize()`.
- [x] **BLOCKER — done (Release Hardening milestone)** — **No rate limiting on `forgotPassword()`.** An unauthenticated endpoint that accepts an email and always returns success (correctly avoids user enumeration via response shape) but has no request-volume limit — can be hit repeatedly to spam a target's inbox once real email sending is wired (§1), or used to fingerprint valid accounts via timing if the DB lookup cost differs meaningfully (unlikely here, but worth a look once real Resend calls are in the path). **Resolved:** `RATE_LIMITS.FORGOT_PASSWORD` (5/hour, IP-keyed).
- [ ] **BLOCKER** — Real credential rotation plan: confirm `NEXTAUTH_SECRET`, `CRON_SECRET`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `CLOUDINARY_API_SECRET` are stored only in Vercel's env var system (never committed), and that whoever provisions them documents where the source-of-truth copies live (password manager, secrets vault) outside this repo. *(Still open — requires actual credential provisioning, not code.)*
- [x] **BLOCKER — done (Release Hardening milestone)** — No security headers configured anywhere (`next.config.js` has no `headers()` function). At minimum before launch: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` (or `frame-ancestors 'none'` via CSP), a baseline `Content-Security-Policy`. None of this exists today. **Resolved:** `next.config.js`'s `headers()` now sets all of the above plus `Referrer-Policy`/`Permissions-Policy` — see ADR-027 #3 for source scoping and accepted trade-offs (`'unsafe-inline'`, dev-only `'unsafe-eval'`). **Also confirmed still correctly scoped** for Stripe and Sanity domains added after this CSP was originally written — no drift found.
- [x] **BLOCKER — done (reconstructed from commit history)** — **Open redirect via `callbackUrl`.** A login/signup redirect parameter was not validated before use, allowing an attacker to craft a link that logs a user in on the real site then redirects them to an attacker-controlled domain. **Resolved:** `callbackUrl` is now validated before redirect.
- [ ] **CRITICAL, new finding (`project-status.md` §10, C1)** — **hardcoded, source-controlled admin and host demo credentials, almost certainly live in the production database.** This is more severe than anything else in this section — see §0 at the top of this document. Not a "verification" gap, an active exposure.
- [ ] **HIGH, new finding (`project-status.md` §10, C2)** — **Next.js 13.5.11 carries multiple unpatched high-severity CVEs** (SSRF in Server Actions and via WebSocket upgrades, an authorization-bypass CVE, several DoS-via-Server-Components CVEs, HTTP request smuggling in rewrites). Fix requires a major-version upgrade (13→16), not a patch. Mitigated somewhat by this app having no `middleware.ts` (the most commonly-exploited CVE in this family only applies to middleware-enforced authorization), but the DoS/SSRF CVEs are framework-level and apply regardless. Schedule as a dedicated upgrade project, don't defer indefinitely.
- [ ] **ENHANCEMENT** — Formal dependency vulnerability scan. `npm audit` now reports **21 known vulnerabilities (12 moderate, 9 high)** — up from the previously-documented 18 (9/9), driven mostly by Sanity's dependency tree (added since that count was taken). Still not individually triaged, except for the Next.js-specific subset broken out above as its own HIGH item given its severity.
- [ ] **ENHANCEMENT** — CSRF is implicitly handled by Next.js Server Actions' same-origin enforcement, but this has not been explicitly verified against a cross-origin POST attempt in this project. Worth one explicit test.
- [ ] **ENHANCEMENT** — Formal external penetration test / bug bounty, once launched and there's real traffic worth attacking.
- [ ] **ENHANCEMENT, new finding (`project-status.md` §10, C4)** — the original embedded Sanity Studio route (`/studio`) is superseded by the custom `/admin/content/*` CMS but was never removed — still deployed, ~1.7 MB bundle, no app-level auth gate (relies entirely on Sanity's own external auth). Remove it, or confirm it's still needed before leaving it in place.
- [ ] **ENHANCEMENT, new finding (`project-status.md` §10, C5)** — no dedicated test/staging database exists; this project's own integration test suite would write directly to production data if run from a machine with full network access to the configured Neon instance. Provision a separate branch/database for test runs.

---

## 5. Performance Optimization

Per the blueprint, this is explicitly **not** a catch-up phase for indexes that should already exist — GIN (full-text search), GIST (geo radius), and standard B-tree indexes were front-loaded in Phase 2's schema design, not deferred.

- [ ] **BLOCKER** — Load testing against realistic concurrent traffic has never been done — everything so far is single-request integration/E2E testing. At minimum, verify the booking-creation path (the one with a real concurrency guarantee — Phase 5's transactional per-night `Availability` insert against a unique constraint) holds up under concurrent double-booking attempts at real scale, not just the two-request test used during Phase 5 development.
- [ ] **BLOCKER** — Confirm Prisma's connection pooling (`DATABASE_URL` via Neon's pooler) is actually sized correctly for the Vercel serverless function concurrency model — a common real-world failure mode for Prisma + Neon + Vercel is connection exhaustion under load that never shows up in local dev.
- [ ] **ENHANCEMENT** — `next/image` optimization audit — confirm listing photos (once real Cloudinary images flow through) are appropriately sized/lazy-loaded, not just correctly domain-whitelisted (§2's fix only made them loadable, not necessarily optimized).
- [ ] **ENHANCEMENT** — Query-level profiling of `searchListings()` (Phase 4's two-step raw-SQL-then-Prisma-hydrate pattern) under realistic listing-table row counts — works correctly today but has never been profiled against, say, 50k+ listings.
- [ ] **ENHANCEMENT** — Bundle-size audit / code-splitting review now that the app has grown to 58 routes (up from 43 at the last time this was counted) — particularly relevant given the orphaned `/studio` route (`project-status.md` §10 C4) is currently the single largest bundle in the app at ~1.7 MB.

---

## 6. Accessibility Review

No accessibility-specific work has been done in any phase — the UI layer was inherited from the Chisfis template (ADR-016: "visual layer kept, logic rebuilt") and accessibility was never an explicit acceptance criterion for any phase.

- [ ] **BLOCKER** — Keyboard navigation audit of the booking flow end-to-end (search → listing detail → date picker → checkout) — date pickers and modal/popover components (Headless UI `Popover`, used in `AvatarDropdown` and elsewhere) are common sources of keyboard traps if not configured correctly; never explicitly tested.
- [ ] **BLOCKER** — Screen reader pass on the core conversion paths (signup, login, booking creation, checkout) — never tested with an actual screen reader (VoiceOver/NVDA) in any phase.
- [ ] **ENHANCEMENT** — Full WCAG 2.1 AA audit (color contrast, alt text coverage, ARIA labeling) across every page — a broader pass than the blocker items above, appropriate after launch unless the client has a specific compliance requirement (e.g., ADA exposure for a US consumer-facing marketplace, which is a real legal risk category — worth explicitly asking the client whether this should be a blocker instead of an enhancement given the business's risk tolerance).
- [ ] **ENHANCEMENT** — Automated accessibility CI check (axe-core or similar) added to the test suite so regressions are caught going forward, not just a one-time audit.

---

## 7. SEO Review

The blueprint has no dedicated SEO phase (noted in `project-status.md`'s prior Remaining Roadmap section); baseline SEO infrastructure exists but is incomplete.

- [x] **BLOCKER — done (Release Hardening milestone)** — `metadataBase` unset (see §3) — breaks Open Graph/Twitter card image resolution in production, which matters for social-share conversion on listing links, one of the primary organic-growth channels for a marketplace.
- [x] **BLOCKER — done (Release Hardening milestone)** — No `sitemap.xml` — `public/robots.txt` (Phase Pre-9 branding audit) references `Sitemap: https://potomac.com/sitemap.xml`, but no route or static file actually generates one. Next.js 13's `app/sitemap.ts` convention would need to be added, dynamically listing published listing detail pages at minimum. **Resolved:** `src/app/sitemap.ts` (new), listing every `PUBLISHED` listing plus static marketing routes.
- [x] **BLOCKER — done (Release Hardening milestone)** — No `og:image` set anywhere (flagged, not resolved, in the Pre-9 branding audit) — every shared link (a listing on social media, a WhatsApp share) renders with no preview image, materially hurting click-through on the platform's primary discovery/sharing surface. **Resolved:** `src/app/opengraph-image.tsx` (new) generates a branded default OG image at request time (`next/server`'s `ImageResponse`) — site-wide fallback; per-listing dynamic OG images remain the enhancement below.
- [ ] **ENHANCEMENT** — Per-listing structured data (`schema.org` `LodgingBusiness`/`Product` JSON-LD) for richer search-engine result snippets — not started in any phase. Per-listing dynamic OG images (using a listing's actual title/photo instead of the site-wide default) are a related, equally-unstarted enhancement.
- [x] **ENHANCEMENT — done (Release Hardening milestone)** — `public/robots.txt`'s `Sitemap:` URL still hardcodes `potomac.com` — needs the real production domain once known (already flagged as a placeholder in the Pre-9 branding audit). **Resolved:** `public/robots.txt` replaced with `src/app/robots.ts` (dynamic, uses `getSiteUrl()`), which also closes a gap the static file never got: it now disallows `/admin*` (Phase 9 shipped after the original file was written).
- [ ] **ENHANCEMENT** — Canonical URL tags, structured breadcrumbs — standard marketplace SEO hygiene, not launch-blocking.

---

## 8. Monitoring and Observability

**Nothing exists here today.** No error-tracking SDK (Sentry or equivalent), no APM, no uptime monitoring, no structured logging beyond `console.log`/`console.error` calls scattered through the codebase (e.g. `notify()`'s email-failure logging, Phase 10).

- [ ] **BLOCKER** — Error tracking (Sentry or equivalent) wired into both the Next.js server and client runtimes — without this, a production bug (e.g. a failed Stripe charge, a crashed Server Action) is invisible until a user reports it.
- [ ] **BLOCKER** — Uptime/health-check monitoring on the deployed app and on the Cron-triggered job routes specifically (`/api/jobs/booking-lifecycle`, `/api/jobs/review-expiry`) — a silently-failing-forever Cron job (auth misconfiguration, a code exception) would have no alerting today.
- [ ] **BLOCKER** — Alerting on Stripe webhook failures — a webhook silently failing to process (bad signature, downstream exception) currently has no operator-facing signal beyond Stripe's own dashboard retry log, which nobody is committed to watching.
- [ ] **ENHANCEMENT** — Structured application logging (replace ad hoc `console.log`/`console.error` with a real logger emitting to a log aggregation service) — the current approach is fine for a single-operator MVP but doesn't scale to a team debugging production incidents.
- [ ] **ENHANCEMENT** — Business-metrics dashboard (bookings/day, GMV, active listings, notification delivery success rate) — `getPlatformStats()`-style queries already exist for the admin dashboard's overview cards (Phase 9); a proper analytics pipeline is a natural extension, not urgent for day-one launch.
- [ ] **ENHANCEMENT** — Notification delivery observability specifically — ADR-026 accepted that a failed Resend send is currently silent beyond a server log line; promote per that ADR's "Revisit If" once real volume exists to judge against.

---

## 9. Backup and Recovery

- [ ] **BLOCKER** — Confirm Neon's automated backup/point-in-time-recovery settings are enabled and understood (retention window, restore procedure) before real user data (bookings, payments, messages) exists in the production database. This has never been explicitly configured or verified in any phase — everything so far ran against an ephemeral local dev database.
- [ ] **BLOCKER** — Documented, tested restore procedure — "backups exist" is not the same as "we know how to restore from one under pressure." At minimum, one dry-run restore into a scratch environment before launch.
- [ ] **ENHANCEMENT** — Formal disaster-recovery runbook (what to do if Stripe/Cloudinary/Resend has an outage, what to do if the Vercel deployment is down) — good practice, not launch-blocking for a first release.
- [ ] **ENHANCEMENT** — Data export/deletion tooling for user-initiated account deletion or GDPR-style data requests, if the target market requires it (worth explicitly asking the client about target geography/compliance scope — this is a business decision, not a technical default to assume).

---

## 10. Final End-to-End Testing

Every phase to date was verified via genuine end-to-end testing (Vitest integration tests against a real local database, plus temporary Playwright passes driving the real dev server) per the client's standing working agreement — this is not starting from zero. What remains is testing against the *real* production-equivalent stack, which nothing has exercised yet.

- [ ] **BLOCKER** — Full golden-path walkthrough against the deployed Vercel environment with real (test-mode) Stripe, real Cloudinary, real Resend: signup → email verification (if added) → browse/search → book (both short-term instant-book and long-term application/accept) → pay → message → complete stay → review → host payout. Every phase's own E2E pass used a local dev server; none has run against the actual deployed stack end-to-end. **This specifically includes the embedded Stripe Elements checkout added since the last update — it has never been run against a real Stripe account at all, in any environment (see §0).**
- [ ] **BLOCKER** — Stripe test-mode webhook delivery verified against the real deployed webhook endpoint (not `stripe listen --forward-to localhost`) — signature verification, idempotency, and the full charge/refund/payout/chargeback event set.
- [ ] **BLOCKER** — Cross-browser smoke test (Chrome, Safari, Firefox at minimum; iOS Safari specifically, given a property-rental marketplace's real-world mobile-heavy usage pattern) — every E2E pass this project has run used Chromium (the Mobile UX Pass's verification used Chromium's `iPhone 13` device emulation, still Chromium's rendering engine, not real iOS Safari/WebKit). This blocker caught a real bug when finally exercised at mobile *viewport* (the mobile-booking gap, ADR-029 #4) even without a different *engine* — real WebKit coverage is still untested and still a genuine risk, not a formality.
- [x] Mobile-viewport golden path (login → real listing → real price → real booking form in a bottom sheet → date selection → quote) verified via Chromium mobile emulation (Mobile UX Pass) — narrower than the full cross-browser blocker above, but the first real mobile-viewport E2E pass this project has run.
- [ ] **ENHANCEMENT** — Automated E2E suite committed to the repo and run in CI, rather than the current pattern of temporary, scratchpad-only Playwright scripts written fresh each session. This is a meaningful process improvement worth doing, but the manual-per-phase approach has caught real bugs throughout the project and isn't itself a launch blocker.

---

## 11. Launch Checklist

The actual go/no-go list — everything above distilled into one pass. All **BLOCKER**-tagged items above should be resolved (or explicitly, consciously waived by the client with a documented reason) before this checklist is run.

- [ ] **Hardcoded demo admin/host credentials rotated or removed (§0, `project-status.md` §10 C1) — do this first, before running the rest of this checklist.**
- [ ] All Infrastructure (§2) services connected with real production credentials.
- [ ] Vercel deployment verified, both Cron jobs confirmed firing (§3).
- [ ] Stripe webhook live against the deployed URL, tested against a real event (§3, §10) — **and the embedded Elements checkout itself run at least once against a real test-mode account (§0).**
- [x] `metadataBase`, sitemap, `og:image` all set (§3, §7) — done, Release Hardening milestone.
- [x] Login and password-reset rate limiting in place (§4) — done, Release Hardening milestone.
- [x] Baseline security headers configured (§4) — done, Release Hardening milestone.
- [x] Password-reset emails actually send (§1) — done, Release Hardening milestone.
- [x] Header session-awareness fixed — a logged-in user can actually log out (§1) — done, Release Hardening milestone.
- [x] Open redirect via `callbackUrl` fixed (§4) — done, reconstructed from commit history.
- [ ] Load test passed for the booking-concurrency path (§5).
- [ ] Keyboard nav + screen reader pass on signup/login/booking/checkout (§6).
- [ ] Error tracking, uptime monitoring, and Stripe-webhook-failure alerting live (§8).
- [ ] Neon backup/PITR confirmed enabled, one restore dry-run completed (§9).
- [ ] Full golden-path E2E walkthrough against the real deployed stack, cross-browser (§10).
- [ ] Client sign-off on the two flagged business-scope questions this plan surfaces but doesn't resolve unilaterally: (a) whether full WCAG 2.1 AA compliance is a launch blocker given legal/ADA exposure (§6), (b) whether data export/deletion tooling is required for the target launch market (§9).
- [ ] Final review of `docs/project-status.md`'s Outstanding Decisions section — confirm payout-timing policy is either decided or explicitly still deferred with the client's knowledge (not silently shipped as "manual only" without a conscious choice).
- [ ] A decision made (and recorded here) on `project-status.md` §10 findings C3 (whether `vercel-build` should re-seed reference data automatically), C4 (remove the orphaned `/studio` route), and C5 (provision a separate test/staging database).

---

## Maintaining This Document

Update this plan as items are completed, the same way `project-status.md` is kept current at the end of every phase per the client's standing working agreement. When every **BLOCKER** item is checked off (or explicitly waived by the client, with the waiver recorded here), the platform is ready for a real launch — **ENHANCEMENT** items remain a living backlog afterward, not a gate.
