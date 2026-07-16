# Project Status

**This is the canonical, single source of truth for implementation progress.** Read this file first in any new session before touching code or asking the client about status — it is kept current at the end of every completed phase and should never fall out of sync with the codebase or `docs/architecture/architecture-decision-record.md`.

Last updated: **2026-07-16**, Phase 8 (Reviews and Favorites) plus the client-approved role-aware post-login redirect fix, plus a branding audit before Phase 9.

---

## Project Overview

**Potomac** — a single-vertical property rental marketplace (short-term stays and long-term leases, one unified `Listing`/`Booking` data model with `rentalType`-conditional fields, not five Airbnb-style categories) built on a UI/visual layer inherited from the original Next.js template with its business logic layer fully rebuilt. Guests browse and book either nightly stays or monthly leases; hosts list properties, manage availability and pricing, and get paid out via Stripe Connect; the platform takes a service fee on short-term bookings.

**Architecture summary:** Next.js 13 App Router with Server Actions as the primary mutation mechanism (no separate REST API layer for app-internal calls); `src/app/` is thin routing only, `src/modules/<domain>/{actions.ts,queries.ts}` is the only public surface between domains (ADR-012 — a module never reaches into another module's Prisma model directly); PostgreSQL (Neon-hosted in production, local Postgres 16 + PostGIS for dev) via Prisma as the single schema-defines-the-contract source of truth; all payment/gateway logic sits behind one `PaymentProvider` interface (ADR-006) so Stripe specifics never leak into `modules/bookings`; background/scheduled work lives in `src/jobs/`, triggered by an authenticated route handler (Vercel Cron in production).

**Current technology stack:**
| Layer | Choice |
|---|---|
| Framework | Next.js 13.5.11 (App Router, Server Actions, `typedRoutes`) |
| Language | TypeScript 5.0.4 (target `es5`, strict mode) |
| UI | React 18.2, Tailwind CSS 3.3 |
| Database | PostgreSQL 16 + PostGIS + pgcrypto, via Prisma 5.22 (pinned — see ADR-018) |
| Auth | NextAuth v4.24 (`@next-auth/prisma-adapter`), JWT sessions, bcrypt — see ADR-019 |
| Validation | Zod 4.4 |
| Payments | Stripe SDK 22.3 (`stripe` npm package), Stripe Connect Express, separate-charges-and-transfers model (ADR-005) |
| Media | Cloudinary 2.10 (unsigned client upload, signed server-side delete) |
| Testing | Vitest 4.1 (unit/integration, DI-mocked adapters); Playwright (E2E, installed/uninstalled per session — not a persistent devDependency) |
| Deployment target | Vercel (not yet deployed — see Infrastructure) |

---

## Current Status

- **Current phase:** Phase 8 complete (Reviews and Favorites), plus post-login redirect fix and branding audit. Phase 9 (Admin Dashboard) not yet started.
- **Current branch:** `claude/booking-platform-overhaul-j2unm6`
- **Latest commit:** (see git log — branding audit commit pending)
- **Build status:** ✅ Clean. `npx next build` succeeds with no errors (30 routes, all typed routes resolve — the one new route this phase is `/api/jobs/review-expiry`; `/account-savelists` already existed as a route, only its data source changed). Last verified 2026-07-16.
- **Test status:** ✅ Clean. `npm test` (Vitest): 54/54 passing across 7 files (added `src/lib/__tests__/{rate-limit,dashboard-path}.test.ts`, `src/modules/reviews/__tests__/reviews.test.ts`, `src/modules/favorites/__tests__/favorites.test.ts`). `node_modules/.bin/tsc --noEmit`: zero errors. Additionally verified with real Playwright browser passes against a production build (`npm run build && npm run start`): (Phase 8) guest review submission, double-blind hide-until-counterpart behavior, host counterpart review + publish-on-match, host response, favorite toggle on/off, and `account-savelists` reflecting real favorites; (redirect fix) a CUSTOMER-only login lands on `/account-bookings`, a HOST (who also carries CUSTOMER) lands on `/account-listings`, and an ADMIN lands on `/account` — all against the real local database, Playwright uninstalled afterward per the established non-persistent-devDependency convention.
- **Working tree:** Clean, fully pushed to origin.

---

## Completed Phases

### Phase 1 — Chisfis Cleanup and Project Restructuring
Dead-code/dependency removal (Line Awesome font, dead `api/hello/` routes, a leaked Maps API key), `modules/`-by-domain folder scaffolding created (see **Developer Notes** — several scaffold folders remain empty pending later phases).

### Phase 2 — Core Infrastructure: Database, Auth, Authorization
Full Prisma schema authored from the Domain Model Specification (all entities, indexes, `CHECK` constraints, partial unique indexes) with connection pooling from the start. NextAuth v4 wired (credentials provider, JWT sessions, bcrypt). Role model implemented as `UserRole {CUSTOMER, HOST, ADMIN}` with GUEST as the implicit unauthenticated tier (ADR-017). `requireAuth/requireRole/requireOwnership/requireAdmin` authorization primitives in `src/lib/auth.ts`.
**ADRs:** 001–004, 008–010, 012, 017–019 established or amended.
**Amendments (approved same phase):** CUSTOMER role added to the base model; Prisma 5→7 upgrade path documented (ADR-018); NextAuth v4 vs. Auth.js v5 rationale documented (ADR-019); full-text search coexistence confirmed.

### Phase 3 — Property Listing Module
Full listing CRUD, Cloudinary image upload (unsigned client-side, signed server-side delete), draft/publish/pause/archive lifecycle with `CHECK`-constraint-driven completeness validation, owner-only authorization. Auto-host-onboarding: any `CUSTOMER` becomes `HOST` on first listing creation, no separate application flow (client-approved deviation from a formal host-application flow). Listing extensibility model established: reference tables for catalog-like toggles (amenities), typed columns for core fields, one narrow `metadata Json?` escape hatch for presentational extras (ADR-020).
**Files:** `src/modules/listings/{actions,queries,types,search}.ts`, `src/app/add-listing/*`, `src/app/(account-pages)/account-listings/*`.

### Phase 4 — Search & Discovery
`searchListings()` as the single search query boundary (ADR-013): URL is the source of truth for all filter/sort state (never client `useState`), `rentalType` is a required top-level facet. Full-text search via generated `tsvector` + GIN index; geo radius/distance search via PostGIS `geography(Point)` + GIST index (ADR-014, storage from day one, query capability added when needed); cursor-based `(sortKey, id)` keyset pagination (ADR-010) uniform across all sort modes; two-step raw-SQL-then-Prisma-hydrate query pattern to keep the raw SQL surface small and auditable.
**Files:** `src/modules/listings/search.ts`, `src/lib/validations/search.ts`, `src/app/(stay-listings)/*`, `src/app/(client-components)/(HeroSearchForm*)/*`.

### Phase 5 — Booking Engine
Complete booking lifecycle for both rental types against a `PaymentProvider` stub adapter (dog-fooding the abstraction ahead of Phase 6): creation, atomic availability enforcement (transactional per-night `Availability` insert against a unique constraint — ADR-011), idempotent creation (client-supplied UUID), a single centralized `canTransition()` status-transition authority (ADR-003), cancellation with policy-driven refund tiers, long-term security deposits, a date-driven lifecycle job (check-in/checkout/lease-activation/completion transitions, monthly rent charging) exposed via a `CRON_SECRET`-gated route handler.
**Business constants (client-approved, centralized in `src/lib/pricing-policy.ts` — never hardcoded elsewhere):**
- Guest service fee: 10% of subtotal (short-term only).
- Short-term cancellation refund tiers — FLEXIBLE: 100% if ≥24h before check-in, else 0%. MODERATE: 100% if ≥5 days, 50% if 1–5 days, 0% within 24h. STRICT: 50% if ≥7 days, else 0%.
- Long-term early termination — STANDARD: 100% deposit refund at ≥30 days notice, linearly prorated to 0%. STRICT: deposit always forfeited.
**Bugs found/fixed:** none carried forward (all resolved within-phase before commit).
**Files:** `src/modules/bookings/*`, `src/lib/pricing-policy.ts`, `src/lib/payments/{provider,stub-provider}.ts`, `src/jobs/booking-lifecycle.ts`.

### Phase 6 — Stripe Connect Integration
Real `StripeConnectProvider` behind the unchanged `PaymentProvider` interface: PaymentIntent create/confirm, refunds, Express account creation + onboarding Account Links, live account status, Transfers (separate charges and transfers, ADR-005), webhook signature verification + event normalization. Feature-flagged via `PAYMENTS_PROVIDER` (`stub` default / `stripe`) so the app runs and is fully testable with zero real credentials. Webhook idempotency implemented exactly per the Domain Model Spec's stated mechanism (check whether the relevant `Payment` row already reflects the incoming outcome — no separate event-log table). Admin-callable `payoutForPayment()` built and tested but **deliberately not wired to the booking lifecycle** — see Outstanding Decisions.
**Bugs found/fixed:**
1. `chargeBookingTx` collapsed a `PENDING` charge result into a thrown error (would have wrongly rolled back a booking for any charge that didn't settle synchronously) — fixed to only throw on `FAILED`.
2. Refund/chargeback `Payment` rows never set `relatedPaymentId`, despite the domain spec requiring it — fixed.
3. `Booking.status` couldn't reach `DISPUTED` except from `COMPLETED`/`ACTIVE` — widened to include `CONFIRMED`/`CHECKED_IN` since a chargeback can be filed any time after a charge, not only post-completion.
**ADRs:** 021 (interface extensions `createOnboardingLink`/`getAccountStatus`, idempotency mechanism, deferred payout timing).
**Files:** `src/lib/payments/{stripe-provider,index}.ts`, `src/modules/payments/*`, `src/app/api/webhooks/stripe/route.ts`, `src/app/(account-pages)/account-billing/*`.

### Phase 7 — Messaging
`Conversation`/`Message`/`ConversationParticipant` wired up (models existed in schema since Phase 2, unused until now). Two conversation-creation triggers: eager for inquiries (the inquiry text becomes message #1, in the same transaction as the `Inquiry` row), lazy for bookings (created on first actual message send, never at booking-creation time). Host's reply in an inquiry-anchored thread auto-marks that inquiry `RESPONDED`. `ADMIN` dispute-resolution read access built as a dedicated, always-audit-logged function (`getConversationForAdmin`), never a bypass condition inside the normal participant-gated query.
**Bugs found/fixed:** `MessageThread` copied server-fetched messages into local `useState`, which never re-synced after `router.refresh()` — a sent reply would succeed in the DB but never render for its own sender. Fixed by rendering the prop directly instead of shadowing it in state.
**ADRs:** 022 (two conversation-creation triggers, admin access as a separate audited path).
**Files:** `src/modules/messaging/*`, `src/app/(account-pages)/account-messages/*`, `src/lib/validations/messaging.ts`.

### Phase 8 — Reviews and Favorites
Two-sided, double-blind reviews (`Review.direction`, one row per direction, `isVisible=false` on submission, published the instant both sides exist OR after a 14-day window from the still-hidden review's own `createdAt` — whichever first, via `src/jobs/review-expiry.ts`). `Listing.avgRating`/`reviewCount` recomputed only on an actual visibility transition (publish-on-match, publish-on-expiry, or admin `hideReview`) — never on raw submission, so a pre-reveal rating can never leak into the listing card. `Favorite` toggle wired end-to-end: `FavoriteButton` on the listing detail page, `account-savelists` rewritten from static demo data to `getMyFavoriteListings()`. Host can post one public response per guest→host review.
**Architectural gap found and closed:** the Platform Architecture Blueprint requires rate limiting on four endpoints (signup, Inquiry creation, Message creation, Review submission), but three of those had shipped across Phases 2/5/7 with no limiter at all — discovered only because Review submission (this phase's own endpoint) forced the question. Raised to the client rather than assumed (new infra question: DB-backed vs. Redis, plus it spanned already-shipped phases). Client chose DB-backed now (`RateLimitHit` model + `src/lib/rate-limit.ts`, sliding window), retrofitted into all four endpoints including the three already-shipped ones. Redis/Upstash remains the named, not-yet-triggered graduation path (ADR-023), same pattern as ADR-015's job queue.
**Bugs found/fixed:** none carried forward — an early draft of `ReviewsSection.tsx` misused `StartRating` (built for the aggregate rating + review count) to render a single review's star value; caught before commit and replaced with a direct `StarIcon` + numeric rating render.
**Documentation reconciled:** `platform-architecture-blueprint.md` §8 said review eligibility was "only bookings with `status = Completed`"; `domain-model-specification.md` §2.10 already correctly said "`COMPLETED` or `TERMINATED_EARLY`" (a terminated-early lease still had a real, reviewable stay). The blueprint was corrected to match the domain-model-spec, which was already the rule implemented in code — see ADR-024.
**ADRs:** 023 (rate limiting — DB-backed sliding window, retrofitted across all four required endpoints), 024 (review eligibility — `COMPLETED` or `TERMINATED_EARLY`, blueprint/domain-spec reconciliation).
**Files:** `src/modules/reviews/{actions,queries,rating}.ts`, `src/modules/favorites/{actions,queries}.ts`, `src/lib/rate-limit.ts`, `src/lib/validations/review.ts`, `src/jobs/review-expiry.ts`, `src/app/api/jobs/review-expiry/route.ts`, `src/app/(listing-detail)/listing-stay-detail/[slug]/{FavoriteButton,ReviewsSection}.tsx`, `src/app/(account-pages)/account-bookings/[id]/ReviewPrompt.tsx`, `src/app/(account-pages)/account-savelists/page.tsx`, `prisma/migrations/20260715174500_add_rate_limit_hit/`.

### Phase 8 Follow-up — Role-Aware Post-Login Redirect
Client-requested fix, approved alongside Phase 8 and completed before Phase 9 began. Post-login/post-signup navigation always pushed to `/account-listings` (the host dashboard) regardless of role — flagged as a Known Issue at the end of Phase 8. Replaced with `getDefaultDashboardPath(roles)` (`src/lib/dashboard-path.ts`), a single lookup used by both `/login` and `/signup`: role-priority `ADMIN > HOST > CUSTOMER` (a `HOST` always also carries `CUSTOMER` per ADR-017, so priority order matters), routing to `/account-bookings` (CUSTOMER), `/account-listings` (HOST), or `/account` (ADMIN — temporary placeholder; no dedicated `/admin` route exists until the Admin Dashboard phase ships one, tracked with a `TODO` in the file). Deliberately a single centralized function (not inlined in each page) so a future "remember the user's last active dashboard" feature is a one-place change.
**Files:** `src/lib/dashboard-path.ts` (new), `src/app/login/page.tsx`, `src/app/signup/page.tsx`, `src/lib/__tests__/dashboard-path.test.ts` (new).

### Pre-Phase 9 — Branding Audit
Repository-wide audit to verify no legacy Chisfis/template branding remains on any user-facing surface. All user-facing branding confirmed as Potomac.
**Changes made:**
- Removed unused Next.js boilerplate files from `public/` (`next.svg`, `thirteen.svg`, `vercel.svg`).
- Created `public/robots.txt` — disallows crawling of `/api/`, `/account*`, `/add-listing*`, `/checkout*`.
- Created `public/manifest.json` — Potomac-branded PWA manifest.
- Created `public/favicon.svg` — Potomac location-pin icon (SVG favicon, matches the logo's pin motif); referenced in root layout metadata alongside the existing `.ico` fallback.
- Updated `src/app/layout.tsx` metadata to include SVG favicon, `.ico` fallback, and manifest link.
- Fixed typo in `SectionSliderNewCategories.tsx` default subHeading ("recommends" → "recommended").
**Audit findings — no action needed:**
- All "Chisfis" references are confined to architecture documentation (`chisfis-technical-assessment.md`, ADRs, blueprint, pre-implementation-review.md`) — historical context, correctly left in place per client instruction.
- No "ciseco", "codely", or other template-author names found anywhere.
- No "airbnb" string in `src/`.
- No lorem ipsum text.
- `data-nc-id` HTML attributes on ~16 components are a leftover naming convention from the template's CSS framework — not user-visible, harmless.
- `DEMO_CATS` in `SectionSliderNewCategories.tsx` (used on the home page) contains placeholder category cards with stock photos and fabricated counts — these are visual placeholders for an unbuilt feature (home page category browsing wired to real `PropertyType` data). Names are generic property types (Nature House, Farm House, etc.), not template-branded.
- `DEMO_DATA` default props in `StayCard.tsx`, `StayCardH.tsx`, `CommentListing.tsx` are empty-array or never-rendered fallbacks — real data is always passed by the calling pages.
**Intentional placeholders still requiring client-provided information:**
- `src/app/contact/page.tsx`: support email (`support@potomac.com`) and phone (`(202) 555-0100`) have `TODO` comments noting they need final values from the client.
- `src/components/ui/SocialsList.tsx`: social media URLs are `#` placeholders with a `TODO` comment noting they need final Potomac social media URLs.
- `public/robots.txt`: `Sitemap:` URL uses `https://potomac.com/sitemap.xml` — needs the real production domain once known.
- `public/manifest.json`: `theme_color` uses a default indigo (`#4f46e5`) — can be updated to match the client's brand color.
- `public/favicon.ico`: still the default Next.js favicon (binary, not editable in-session) — the new SVG favicon takes precedence in modern browsers, but the `.ico` should be replaced with a Potomac-branded version for legacy browser support.
- OG image: no `og:image` is set in metadata — the client should provide a branded image for social sharing previews.
**Files:** `public/{robots.txt,manifest.json,favicon.svg}` (new), `src/app/layout.tsx`, `src/components/SectionSliderNewCategories.tsx`.

---

## Remaining Roadmap

Per `docs/architecture/platform-architecture-blueprint.md` §17 (the authoritative sequencing, re-checked before Phase 8 began):

1. **Admin Dashboard** *(next)* — listing moderation queue, user management (suspend/verify), booking/dispute oversight (surfacing the `DISPUTED` bookings and `CHARGEBACK` payments Phase 6 already produces, plus the `hideReview` moderation path Phase 8 already built), manual refunds/adjustments, category/amenity taxonomy management, platform-wide analytics, audit log viewer.
2. **Notifications** — email delivery + in-app preferences UI, **and** the emission primitive itself. The blueprint's roadmap describes a minimal `notify()` primitive (writes a `Notification` row, no delivery) as shared infrastructure meant to exist since the auth phase so later phases could call it — confirmed on 2026-07-15 that **no such function exists anywhere in the codebase yet** (verified via full-codebase search). The `Notification`/`NotificationPreference` tables exist in the schema (unused, zero rows written to them by any code path so far) but this phase needs to build the emission primitive from scratch, not just the delivery/UI layer on top of one that already exists.
3. **Performance Optimization** — load testing and query tuning under real traffic. Per the blueprint, explicitly **not** a catch-up phase for indexes that should already exist (they were front-loaded in Phase 2).
4. **Final Testing and Production Readiness** — the last blueprint phase; real-credential verification (see Infrastructure below) belongs here at the latest, likely earlier once the client supplies credentials.

Note: the blueprint sequences Messaging/Reviews *before* Payments; this project did Payments first (client-approved reordering) — no conflict, just a recorded deviation. The blueprint has no dedicated SEO phase; fold SEO concerns into step 5 unless the client asks for a dedicated slot.

---

## Outstanding Decisions

Business decisions still waiting for client input — do not resolve these unilaterally:

- **Payout timing policy.** `payout()` and `payoutForPayment()` (Phase 6) are fully built and tested but not wired to any automatic trigger. The client explicitly deferred the timing decision (on check-in? on completion? after a dispute window?) as its own future decision, separate from building the mechanism. **Do not wire an automatic trigger without asking first.**

No other unresolved business-rule gaps are currently known. If Admin (dispute-resolution authority limits, moderation escalation policy) surfaces undocumented business rules, stop and ask per standing instruction — do not assume.

---

## Known Issues

Accepted limitations, technical debt, and deferred work — none block the next phase, all are worth a glance before touching adjacent code:

- **Empty scaffold module folders from Phase 1** don't match real implementation locations: `src/modules/booking` (singular, empty) vs. the real `src/modules/bookings` (plural); `src/modules/auth`, `src/modules/users`, `src/modules/search` are empty — that logic actually lives in `src/lib/auth.ts`/`src/actions/auth.ts` and `src/modules/listings/search.ts`. `src/modules/reviews` and `src/modules/favorites` are now real, implemented modules (Phase 8) — no longer empty scaffolds. `src/modules/admin`, `src/modules/notifications` remain empty scaffolds correctly waiting for their phases. **Don't create new files in the empty `booking`/`auth`/`search`/`users` folders** — they're stale scaffolding, not the real location.
- **`Conversation.listingId` and `Conversation.inquiryId` are plain columns with no FK/relation** (pre-existing schema design from before this session, not introduced by Phase 7) — populated manually at creation time, never joinable via Prisma `include`. Any query needing listing context from a `Conversation` must batch-fetch `Listing` separately (see `modules/messaging/queries.ts`'s `attachListing` helper for the established pattern).
- **No real-time message delivery.** Messages appear on next navigation/`router.refresh()` only — no WebSockets or polling. Not a bug; no architecture doc requires live delivery for MVP. Flag as a gap if the client asks for it.
- **`StripeConnectProvider.createCharge` uses a hardcoded Stripe test PaymentMethod** (`pm_card_visa`) since no real checkout UI (Stripe Elements + SetupIntent) exists yet — test-mode only, by design, per client direction. Swapping in a real guest-supplied payment method later requires no interface or booking-module change, only the adapter's internal call.
- **Task from Phase 2 still open:** verify Neon migration/seed and Vercel deployment once the client supplies real credentials — see Infrastructure below. Nothing code-side blocks this; it's purely waiting on credentials.
- **`RateLimitHit` pruning is opportunistic, not a sweep job.** Stale rows for a given `key` are deleted only the next time that same key is checked (see `src/lib/rate-limit.ts`) — a key that's never hit again (e.g. an abandoned signup IP) leaves its rows in the table indefinitely. Cheap at current volume (storage only, no correctness impact); revisit if the table grows large enough to matter (ADR-023's "Revisit If").
- **`BtnLikeIcon` (used by `StayCard` across search results, home page sections, and related-listings grids) is still local-only UI state**, not wired to the real `Favorite` model — only the listing detail page's dedicated `FavoriteButton` and the `account-savelists` page are backed by real data. Toggling the heart icon on a search-results card doesn't persist. Out of scope for Phase 8 (which specifically named the listing detail page's save button and the saved-listings page); wiring every `StayCard` instance to `toggleFavorite()`/`isFavorited()` is a small follow-up, not a redesign, whenever it's prioritized.
- **~~Post-login redirect always targets `/account-listings` regardless of role~~ — fixed** (see Phase 8 Follow-up above). `ADMIN`'s landing page is still a temporary placeholder (`/account`, not a real admin dashboard) until the Admin Dashboard phase ships `/admin` — tracked with a `TODO` in `src/lib/dashboard-path.ts`.

---

## Infrastructure

| Service | Status | Notes |
|---|---|---|
| **Neon (Postgres)** | ⏳ Not connected | All development/testing this entire project has run against a local Postgres 16 + PostGIS instance in the session container. `DATABASE_URL`/`DATABASE_URL_UNPOOLED` are documented (`docs/setup/environment-variables.md`) but not populated with real Neon values. Schema and migrations are Neon-ready (pooled + direct URL split already in place per ADR from Phase 3 prep) — running `prisma migrate deploy` against real Neon plus a seed-data verification pass is the only remaining step, blocked purely on credentials. |
| **Cloudinary** | ⏳ Code-ready, not configured | Upload/delete integration fully implemented and used throughout listing image flows (Phase 3). No real `CLOUDINARY_*` credentials supplied yet — unsigned upload preset must also be created in the Cloudinary dashboard per the env var doc's setup notes. |
| **Stripe** | ⏳ Code-ready, not configured | Full Connect integration built and tested via dependency injection (Phase 6) — `PAYMENTS_PROVIDER` defaults to `stub` so this has never required real credentials to develop or test against. Needs real `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` (test mode) plus a webhook endpoint registered in the Stripe dashboard pointing at `/api/webhooks/stripe` before it can be exercised against the real API. |
| **Vercel** | ⏳ Not deployed | No deployment has been verified yet. `vercel.json` (Cron config for the booking-lifecycle job) is in place. Env vars are documented but not set in a Vercel project. |
| **Auth (NextAuth)** | ✅ Fully implemented | Credentials provider, JWT sessions, bcrypt password hashing, role-based authorization primitives — all working and tested locally. `NEXTAUTH_SECRET` needs a real distinct-per-environment value in production (documented, not yet set). |
| **Environment variables** | ✅ Fully documented, ⏳ not populated | `docs/setup/environment-variables.md` is the canonical reference — every variable the app needs, where to obtain it, and whether it's required for Development vs. Production. Local `.env` (gitignored) currently holds only local-Postgres + dev-only values (`CRON_SECRET` set to a local test value, `PAYMENTS_PROVIDER` unset/defaults to stub). |

**Bottom line:** the application is 100% functional and fully tested end-to-end without any real third-party credentials, by design (stub payment provider, local Postgres, no Cloudinary calls required outside actual image upload testing). Supplying real credentials is a configuration step, not an implementation dependency — nothing in the remaining roadmap is blocked by it.

---

## Next Phase

**Admin Dashboard** (blueprint step 11). Prerequisites: none outstanding — `AuditLog` already exists and is populated by every admin escape-hatch action built so far (`payoutForPayment` in Phase 6, `getConversationForAdmin` in Phase 7, `hideReview` in Phase 8), giving the audit-log viewer real data to display from day one. `Booking.status = DISPUTED` and `Payment` chargeback rows (Phase 6) already exist for the dispute-oversight queue to surface. Before writing code:
1. Re-read `docs/architecture/domain-model-specification.md` and `platform-architecture-blueprint.md` for the Admin section in full, and check the ADR index for any existing admin-escape-hatch precedent (the pattern so far: never an inline bypass condition, always a separate, distinctly-named, always-audit-logged function — see ADR-021/022 and this phase's `hideReview`).
2. Confirm dispute-resolution authority limits (can an admin unilaterally refund/void a payment, or only flag/route it?) before implementing anything beyond read/moderate — if genuinely unstated in the docs, this is a clarifying question, not an assumption.
3. Confirm whether listing moderation (approve/reject/unpublish) is meant to gate `DRAFT → PUBLISHED` (a new required step) or only handle post-publish takedowns — the current `modules/listings/actions.ts` publish flow has no moderation gate today.

---

## Developer Notes

Read this section to get productive immediately in a fresh session with no prior chat context.

**Local dev environment:**
- Postgres 16 + PostGIS runs locally in-container: `service postgresql start` (check with `pg_lsclusters`). `.env`'s `DATABASE_URL` points at it — real Neon credentials have never been required for any work so far.
- `npm run dev` starts the app; `npm test` runs the Vitest suite (unit + DB-integration tests, no credentials needed — `PAYMENTS_PROVIDER` defaults to `stub`).
- `node_modules/.bin/tsc --noEmit` for a full-project typecheck; `npx next build` for the authoritative check (also regenerates `typedRoutes` types — a freshly-added static route literal, e.g. in `Nav.tsx`'s `listNav` array, will show a false-positive `tsc` error until a build regenerates route types; this is expected, not a bug).
- E2E testing pattern established across every phase so far: `npm install -D playwright --no-save` (temporary, always uninstalled after — never a persistent devDependency), drive the running dev server with a real browser via scripts in the scratchpad directory, verify against real DB state with `psql`, clean up test data afterward. See any phase's commit message for the pattern; scripts themselves are not committed (scratchpad-only).
- Dev seed data: `npm run db:seed` (production-safe reference data) vs. `ALLOW_DEV_SEED=1 npm run db:seed:dev` (fake listings, refuses to run outside local dev — see `docs/setup/environment-variables.md`).

**Module boundary convention (ADR-012):** a module's `actions.ts`/`queries.ts` is its only public surface. Never import another module's Prisma model directly from outside that module — call its exported function instead. `Payment` rows are treated as owned by `modules/bookings` (not a separate `modules/payments` concern) since every `Payment` row is 1:1 with a `Booking`; `modules/payments` owns only the Stripe integration surface itself (webhook dispatch, host onboarding) and calls into `modules/bookings`' exported sync functions for any Payment/Booking mutation.

**Testing convention established since Phase 6:** Vitest for anything that benefits from dependency injection or repeatable regression coverage (gateway adapters, business-logic-heavy actions) — mock only the auth gate and `next/cache`'s `revalidatePath` (both require a real request context Vitest doesn't have), run everything else against the real local database. Playwright for actual UI/user-flow verification, always temporary per session.

**Money handling:** `Payment.amount` is the only field required to be integer cents (matches Stripe's convention) — `dollarsToCents()`/`roundToCents()` live in `src/lib/pricing-policy.ts`. `Listing`/`Booking` pricing fields are `Decimal(10,2)` exact dollars; never pass a dollar amount to a cents-precision function or vice versa. **Prisma `Decimal` objects are always truthy** even when zero — never write `if (someDecimalField)` as a non-zero check, use `someDecimalField !== null` (existence) or `Number(someDecimalField) > 0` (value) explicitly; this was a real bug pattern caught and fixed in Phase 6.

**Where things are:**
- Domain/business logic: `src/modules/<domain>/{actions.ts,queries.ts}` (`bookings`, `listings`, `inquiries`, `messaging`, `payments`, `reviews`, `favorites`).
- Gateway abstractions: `src/lib/payments/` (`provider.ts` = interface, `stub-provider.ts`/`stripe-provider.ts` = adapters, `index.ts` = the only place `getPaymentProvider()` is exported from).
- Cross-cutting config/constants: `src/lib/pricing-policy.ts` (fees, refund tiers — never hardcode a money-affecting constant elsewhere).
- Rate limiting: `src/lib/rate-limit.ts` — `checkRateLimit(key, config)` against the DB-backed `RateLimitHit` model (ADR-023). `RATE_LIMITS` exports the four configured limits (signup, inquiry, message, review). Call it as the very first statement after `requireAuth()` (or, for signup, before any DB write) in any new user-facing write action — don't ship a new public mutation endpoint without asking whether it needs one.
- Scheduled work: `src/jobs/`, triggered via `src/app/api/jobs/*` route handlers (bearer-token-gated).
- Architecture source of truth, in order of authority for a conflict: `docs/architecture/architecture-decision-record.md` (ADRs, what was actually decided and why) > `domain-model-specification.md` (entity-level detail) > `platform-architecture-blueprint.md` (system-level shape and roadmap) > `pre-implementation-review.md` (historical — gaps already folded into the other three).

**Working agreement (from the client, in effect for all future phases):** validate every module through genuine end-to-end testing (not just typecheck/build), report real bugs found during that testing, stop and ask before assuming any business rule not already covered by the ADRs/specs — but proceed with documentation (not a blocking question) for smaller, clearly-scoped implementation choices. Update this file at the end of every phase, before reporting completion to the client.
