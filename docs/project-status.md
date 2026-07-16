# Project Status

**This is the canonical, single source of truth for implementation progress.** Read this file first in any new session before touching code or asking the client about status — it is kept current at the end of every completed phase and should never fall out of sync with the codebase or `docs/architecture/architecture-decision-record.md`.

Last updated: **2026-07-16**, Phase 10 (Notifications) complete. **This was the last core platform module** — the project has now transitioned from feature development into release readiness. See `docs/release-readiness-plan.md`.

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
| Notifications | Resend (`resend` npm package) for transactional email, `EmailProvider` abstraction (ADR-026), feature-flagged (`NOTIFICATIONS_PROVIDER`, stub default) |
| Testing | Vitest 4.1 (unit/integration, DI-mocked adapters); Playwright (E2E, installed/uninstalled per session — not a persistent devDependency) |
| Deployment target | Vercel (not yet deployed — see Infrastructure) |

---

## Current Status

- **Current phase:** Phase 10 complete (Notifications) — **the last core platform module.** The project is now in release readiness — see `docs/release-readiness-plan.md`.
- **Current branch:** `claude/booking-platform-overhaul-j2unm6`
- **Latest commit:** (see git log)
- **Build status:** ✅ Clean. `npx next build` succeeds with no errors (38 routes total — added `/account-notifications`). Last verified 2026-07-16.
- **Test status:** ✅ Clean. `npm test` (Vitest): 94/94 passing across 14 files (added notification-focused test files: `src/lib/notifications/__tests__/resend-provider.test.ts`, `src/modules/notifications/__tests__/{notify,actions,retrofit-integration}.test.ts`, `src/jobs/__tests__/booking-lifecycle-rent-reminder.test.ts`, `src/actions/__tests__/change-password.test.ts`; extended `src/modules/reviews/__tests__/reviews.test.ts` with a REVIEW_RECEIVED assertion; fixed a pre-existing bug in `src/modules/bookings/__tests__/payout.test.ts`, see Bugs found/fixed below). `npx tsc --noEmit`: zero errors.
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

### Phase 9 — Admin Dashboard
Complete admin dashboard with 7 routes under `/admin/`, gated by `ADMIN` role check in the layout (non-admins redirected to `/login`). All admin actions are audit-logged via `AuditLog` and gated by `requireAdmin()`.
**User Management:** suspend/unsuspend users, verify unverified users. User list with status filter (ALL/ACTIVE/SUSPENDED) and search.
**Listing Moderation:** approve, reject, or unpublish listings. Conditional moderation gate — when `listingModerationEnabled` platform setting is ON, `publishListing()` routes DRAFT/REJECTED listings to `PENDING_REVIEW` instead of `PUBLISHED`; when OFF (default), direct-publish behavior is preserved. Status filter chips across all listing statuses.
**Booking/Dispute Oversight:** full booking list with status filters (prominent `DISPUTED` filter), admin force-transition for disputed bookings (resolve to COMPLETED, CANCELLED_BY_GUEST, or CANCELLED_BY_HOST).
**Taxonomy Management:** CRUD for `PropertyType` and `Amenity` entities (auto-slug, duplicate detection, active/inactive toggle).
**Platform Settings:** key-value `PlatformSetting` model with typed accessors. Two initial settings: `listingModerationEnabled` (boolean toggle) and `serviceFeePercent` (number input). Settings page with save/confirmation feedback.
**Audit Log Viewer:** paginated audit log with target type filters, showing actor, action, target, and metadata for every admin action.
**Platform Overview:** dashboard with 6 stat cards (active users, published listings, total bookings, pending moderation, disputed bookings, total revenue) with yellow highlighting for non-zero alert counts.
**Schema changes:** Added `PlatformSetting` model (key-value store, `key` as primary key). Changed `AuditLog.targetId` from `@db.Uuid` to plain `String` (polymorphic field referencing entities with different ID types — ADR-025).
**Post-login redirect updated:** ADMIN role now lands on `/admin` (was `/account`); the TODO in `dashboard-path.ts` noting the placeholder has been resolved.
**Bugs found/fixed:**
1. `AuditLog.targetId` was typed as `@db.Uuid` but `updatePlatformSetting` passes the setting's string key as `targetId` — changed column to `String` since it's a polymorphic field (ADR-025).
2. `auditLog()` helper passed `metadata` as `Record<string, unknown>` but Prisma's `Json?` field expects `InputJsonValue` — fixed with explicit cast.
3. Admin queries used wrong field names from the Prisma schema: Image ordering field `order` (correct: `position`), Booking date fields `checkIn`/`checkOut` (correct: `checkInDate`/`checkOutDate`).
**ADRs:** 025 (conditional listing moderation, key-value platform settings, polymorphic audit targeting).
**Files:** `src/modules/admin/{actions,queries,settings}.ts`, `src/app/admin/{layout,page}.tsx`, `src/app/admin/{users,listings,bookings,taxonomy,audit-log,settings}/*`, `src/lib/dashboard-path.ts` (updated ADMIN path), `prisma/migrations/20260716140000_add_platform_setting/`, `prisma/migrations/20260716150000_audit_log_targetid_text/`.

### Phase 9 Follow-up — Security Audit and Hardening
Client-requested audit, approved alongside Phase 9 and completed before Phase 10 began. Verified seven security properties: (1) no `/admin/*` page accessible by non-admins — confirmed, layout-level `ADMIN` role check; (2) no Server Action callable by bypassing the UI — confirmed, every exported action independently authorizes; (3) all admin actions require `requireAdmin()` — confirmed; (4) every privileged action creates an `AuditLog` entry; (5) no privilege escalation via modified requests — confirmed, roles are never client-supplied; (6) IDs cannot be enumerated to expose other users' data — confirmed, queries are scoped to the caller or admin-gated; (7) hidden/rejected listings aren't reachable via direct URL without permission — confirmed.
**Gaps found and fixed:**
1. `src/modules/admin/settings.ts` had a stray `"use server"` directive, making `getSetting()`, `isListingModerationEnabled()`, and `getServiceFeePercent()` — internal config helpers with no auth check — callable directly from the client. Removed the directive; these are now plain server-side imports, unreachable from client code.
2. Four taxonomy mutations (`createPropertyType`, `updatePropertyType`, `createAmenity`, `updateAmenity` in `src/modules/admin/actions.ts`) called `requireAdmin()` but discarded the returned admin identity and never wrote an `AuditLog` row — violated property (4) above. Fixed: all four now capture the admin and audit-log the mutation.
3. **Most critical:** `payoutForPayment()` (`src/modules/bookings/actions.ts`) — an admin-triggered financial disbursement — had the same discarded-identity, no-audit-log gap. Fixed: now writes an `AuditLog` entry recording actor, charge payment id, booking, payee, amount, currency, and payout status.
**Files:** `src/modules/admin/{actions,settings}.ts`, `src/modules/bookings/actions.ts`.

### Phase 10 — Notifications
**The last core platform module per the blueprint's roadmap** (§17 step 12/13). Builds the `notify()` emission primitive (confirmed in Phase 9's audit to not exist anywhere in the codebase, despite the `Notification`/`NotificationPreference` schema existing since Phase 2), email delivery via Resend behind a gateway-agnostic `EmailProvider` interface, in-app notification list + email preferences UI, and retrofits `notify()` into every domain action the blueprint's notification matrix names.
**`EmailProvider` abstraction (ADR-026):** `src/lib/notifications/{provider,stub-provider,resend-provider,index}.ts` — mirrors ADR-006's `PaymentProvider` pattern exactly. `getEmailProvider()` is feature-flagged via `NOTIFICATIONS_PROVIDER` (`stub` default — logs to console, no credentials needed / `resend` — real sends, requires `RESEND_API_KEY` + `RESEND_FROM_EMAIL`).
**`notify()` primitive:** `src/modules/notifications/notify.ts`. Always writes an IN_APP `Notification` row (always-on unread badge, never preference-gated). Writes an EMAIL row and sends real email only if that notification type's email is enabled — opt-out model, default enabled, except four `CRITICAL_EMAIL_TYPES` (`BOOKING_CONFIRMED`, `BOOKING_CANCELLED`, `PAYMENT_FAILED`, `PASSWORD_CHANGED`) which always email regardless of preference, enforced server-side. Email send is awaited but wrapped in try/catch — a delivery failure is logged, never thrown, so it can't fail or roll back the caller's own action.
**Retrofit call sites (all ten `NotificationType` values wired):**
- `BOOKING_CONFIRMED` — instant-book creation and host-accept (`src/modules/bookings/actions.ts`: `createShortTermBooking`, `confirmBooking`).
- `BOOKING_CANCELLED` — host decline, guest/host/admin cancellation, early lease termination, and payment-failure auto-cancellation (`declineBooking`, `cancelBooking`, `terminateLease` in `bookings/actions.ts`; `syncChargeFailed` in `bookings/payment-sync.ts`).
- `NEW_MESSAGE` — `sendMessage` (`modules/messaging/actions.ts`), notifies every other `ConversationParticipant`.
- `NEW_INQUIRY` — `createInquiry` (`modules/inquiries/actions.ts`), notifies the listing's host.
- `REVIEW_RECEIVED` — both publish-on-match (`createReview`, `modules/reviews/actions.ts`) and publish-on-expiry (`runReviewExpiryJob`, `jobs/review-expiry.ts`) paths.
- `PAYOUT_SENT` — `payoutForPayment` (`bookings/actions.ts`), notifies the payee host on success only.
- `LISTING_APPROVED` / `LISTING_REJECTED` — `approveListing`/`rejectListing` (`modules/admin/actions.ts`), notifies the listing's host.
- `RENT_DUE_REMINDER` — new `runRentDueReminders` function added to `jobs/booking-lifecycle.ts`, fires 3 days ahead of each ACTIVE lease's monthly due date (mirrors `runMonthlyRentCharges`' due-day-of-month math). Also added a `PAYMENT_FAILED` notify to a pre-existing gap in `runMonthlyRentCharges` itself — a failed monthly rent charge previously created a FAILED `Payment` row with no notification at all, since it bypasses the webhook-driven `syncChargeFailed` path entirely.
- `PASSWORD_CHANGED` — `resetPassword` (forgot-password flow, pre-existing) and a newly built authenticated `changePassword` action (`src/actions/auth.ts`) wired to a previously-static, unwired `/account-password` page.
**In-app UI:** `/account-notifications` (new route) — recent-activity list with unread highlighting and mark-read/mark-all-read, plus an email-preferences section listing every toggleable (non-critical) type with a live toggle. Added to the account nav (`(components)/Nav.tsx`).
**Schema changes:** None — `Notification`/`NotificationPreference` existed since Phase 2, unused until this phase.
**Bugs found/fixed:**
1. `src/modules/bookings/__tests__/payout.test.ts` mocked `requireAdmin()` to return a non-UUID actor id (`"admin-test"`), which had silently worked until the Phase 9 Follow-up added a real `AuditLog.create()` call to `payoutForPayment()` — `AuditLog.actorId` is `@db.Uuid`, so the test started failing with a Postgres UUID-parse error. Fixed by using a real UUID and upserting a matching `User` row, consistent with every other test file's convention.
2. `runMonthlyRentCharges` (pre-existing, Phase 5) never notified the guest when a monthly rent charge failed — a real gap independent of this phase's own scope, found while wiring `PAYMENT_FAILED`. Fixed alongside the `RENT_DUE_REMINDER` addition since both touch the same function.
**ADRs:** 026 (`EmailProvider` abstraction, two-row-per-channel dispatch, critical-type email override).
**Files:** `src/lib/notifications/*` (new), `src/modules/notifications/*` (new), `src/app/(account-pages)/account-notifications/*` (new), `src/app/(account-pages)/account-password/page.tsx` (rewritten as a wired client form), `src/actions/auth.ts` (`changePassword` added), `src/lib/validations/auth.ts` (`changePasswordSchema` added), `src/modules/bookings/{actions,payment-sync}.ts`, `src/modules/messaging/actions.ts`, `src/modules/inquiries/actions.ts`, `src/modules/reviews/actions.ts`, `src/modules/admin/actions.ts`, `src/jobs/{booking-lifecycle,review-expiry}.ts`, `(components)/Nav.tsx`.

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

**Core platform feature development is complete as of Phase 10.** All modules named in `docs/architecture/platform-architecture-blueprint.md` §17 are built: auth/authorization, listings, search, bookings, payments (Stripe Connect), messaging, reviews/favorites, rate limiting, admin dashboard, and notifications. Per the client's explicit direction, the project has now transitioned from feature development into release readiness — see **`docs/release-readiness-plan.md`** for the full plan (remaining essential items, infrastructure verification, deployment/security/performance/accessibility/SEO/monitoring/backup checklists, final E2E testing, and the launch checklist, each item marked as a launch blocker or a safe-to-ship-after-launch enhancement).

The blueprint's remaining named phases — Performance Optimization and Final Testing/Production Readiness — are release-readiness activities, not new features, and are folded into the Release Readiness Plan rather than tracked as separate "phases" here.

Note: the blueprint sequences Messaging/Reviews *before* Payments; this project did Payments first (client-approved reordering) — no conflict, just a recorded deviation.

---

## Outstanding Decisions

Business decisions still waiting for client input — do not resolve these unilaterally:

- **Payout timing policy.** `payout()` and `payoutForPayment()` (Phase 6) are fully built and tested but not wired to any automatic trigger. The client explicitly deferred the timing decision (on check-in? on completion? after a dispute window?) as its own future decision, separate from building the mechanism. **Do not wire an automatic trigger without asking first.**

No other unresolved business-rule gaps are currently known. If Admin (dispute-resolution authority limits, moderation escalation policy) surfaces undocumented business rules, stop and ask per standing instruction — do not assume.

---

## Known Issues

Accepted limitations, technical debt, and deferred work — none block the next phase, all are worth a glance before touching adjacent code:

- **Empty scaffold module folders from Phase 1** don't match real implementation locations: `src/modules/booking` (singular, empty) vs. the real `src/modules/bookings` (plural); `src/modules/auth`, `src/modules/users`, `src/modules/search` are empty — that logic actually lives in `src/lib/auth.ts`/`src/actions/auth.ts` and `src/modules/listings/search.ts`. `src/modules/reviews`, `src/modules/favorites`, `src/modules/admin`, and `src/modules/notifications` are now real, implemented modules — no longer empty scaffolds. **Don't create new files in the empty `booking`/`auth`/`search`/`users` folders** — they're stale scaffolding, not the real location.
- **`Conversation.listingId` and `Conversation.inquiryId` are plain columns with no FK/relation** (pre-existing schema design from before this session, not introduced by Phase 7) — populated manually at creation time, never joinable via Prisma `include`. Any query needing listing context from a `Conversation` must batch-fetch `Listing` separately (see `modules/messaging/queries.ts`'s `attachListing` helper for the established pattern).
- **No real-time message delivery.** Messages appear on next navigation/`router.refresh()` only — no WebSockets or polling. Not a bug; no architecture doc requires live delivery for MVP. Flag as a gap if the client asks for it.
- **`StripeConnectProvider.createCharge` uses a hardcoded Stripe test PaymentMethod** (`pm_card_visa`) since no real checkout UI (Stripe Elements + SetupIntent) exists yet — test-mode only, by design, per client direction. Swapping in a real guest-supplied payment method later requires no interface or booking-module change, only the adapter's internal call.
- **Task from Phase 2 still open:** verify Neon migration/seed and Vercel deployment once the client supplies real credentials — see Infrastructure below. Nothing code-side blocks this; it's purely waiting on credentials.
- **`RateLimitHit` pruning is opportunistic, not a sweep job.** Stale rows for a given `key` are deleted only the next time that same key is checked (see `src/lib/rate-limit.ts`) — a key that's never hit again (e.g. an abandoned signup IP) leaves its rows in the table indefinitely. Cheap at current volume (storage only, no correctness impact); revisit if the table grows large enough to matter (ADR-023's "Revisit If").
- **`BtnLikeIcon` (used by `StayCard` across search results, home page sections, and related-listings grids) is still local-only UI state**, not wired to the real `Favorite` model — only the listing detail page's dedicated `FavoriteButton` and the `account-savelists` page are backed by real data. Toggling the heart icon on a search-results card doesn't persist. Out of scope for Phase 8 (which specifically named the listing detail page's save button and the saved-listings page); wiring every `StayCard` instance to `toggleFavorite()`/`isFavorited()` is a small follow-up, not a redesign, whenever it's prioritized.
- **~~Post-login redirect always targets `/account-listings` regardless of role~~ — fixed** (Phase 8 Follow-up). **~~ADMIN landing page was `/account` placeholder~~ — fixed** (Phase 9): ADMIN now lands on `/admin`, the real admin dashboard.
- **The header's `AvatarDropdown` (`src/app/(client-components)/(Header)/AvatarDropdown.tsx`) is not wired to real session state** — no `useSession()` call anywhere in it, despite `AuthSessionProvider` being mounted at the root layout. It renders the same static menu regardless of whether anyone is logged in, and its "Log out" link just navigates to `/login` rather than calling `signOut()`. Pre-existing since before this session (not introduced by Phase 10) — surfaced while deciding where to put an unread-notification badge, deliberately not fixed here since it's a separate, unrelated architectural gap (wiring the whole header to auth state) rather than a notifications-scoped change. **Flagged as a release-readiness blocker** — see `docs/release-readiness-plan.md`.
- **No unread-notification badge in the header**, as a direct consequence of the item above — `/account-notifications` is the only place unread count is currently visible. Once `AvatarDropdown` is wired to real session state, adding a badge is a small follow-up (`getUnreadNotificationCount()` already exists in `modules/notifications/queries.ts`).
- **Email delivery failures are silent** (ADR-026's accepted trade-off) — a failed Resend send is logged server-side only; there's no retry, dead-letter queue, or admin-visible delivery-failure indicator. Acceptable at MVP scale (documented, not an oversight) — revisit per ADR-026's "Revisit If" if it becomes a real problem.
- **The `forgotPassword` flow still only logs the reset token to the console** (`src/actions/auth.ts`, pre-existing `TODO` from before this session) rather than emailing it — this is a distinct gap from `PASSWORD_CHANGED` (Phase 10 wires the *confirmation* notification correctly; the *reset link itself* was never wired to real delivery in any phase, and isn't a `NotificationType` in the schema). **Flagged as a release-readiness blocker** — a production password-reset flow that never sends the link is not functional for a real user.

---

## Infrastructure

| Service | Status | Notes |
|---|---|---|
| **Neon (Postgres)** | ⏳ Not connected | All development/testing this entire project has run against a local Postgres 16 + PostGIS instance in the session container. `DATABASE_URL`/`DATABASE_URL_UNPOOLED` are documented (`docs/setup/environment-variables.md`) but not populated with real Neon values. Schema and migrations are Neon-ready (pooled + direct URL split already in place per ADR from Phase 3 prep) — running `prisma migrate deploy` against real Neon plus a seed-data verification pass is the only remaining step, blocked purely on credentials. |
| **Cloudinary** | ⏳ Code-ready, not configured | Upload/delete integration fully implemented and used throughout listing image flows (Phase 3). No real `CLOUDINARY_*` credentials supplied yet — unsigned upload preset must also be created in the Cloudinary dashboard per the env var doc's setup notes. |
| **Stripe** | ⏳ Code-ready, not configured | Full Connect integration built and tested via dependency injection (Phase 6) — `PAYMENTS_PROVIDER` defaults to `stub` so this has never required real credentials to develop or test against. Needs real `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` (test mode) plus a webhook endpoint registered in the Stripe dashboard pointing at `/api/webhooks/stripe` before it can be exercised against the real API. |
| **Resend (email)** | ⏳ Code-ready, not configured | `EmailProvider` abstraction fully implemented and used throughout the notification pipeline (Phase 10) — `NOTIFICATIONS_PROVIDER` defaults to `stub` so this has never required real credentials to develop or test against. Needs real `RESEND_API_KEY` plus a `RESEND_FROM_EMAIL` on a domain verified in the Resend dashboard before it can send real email. |
| **Vercel** | ⏳ Not deployed | No deployment has been verified yet. `vercel.json` (Cron config for the booking-lifecycle job) is in place. Env vars are documented but not set in a Vercel project. |
| **Auth (NextAuth)** | ✅ Fully implemented | Credentials provider, JWT sessions, bcrypt password hashing, role-based authorization primitives — all working and tested locally. `NEXTAUTH_SECRET` needs a real distinct-per-environment value in production (documented, not yet set). |
| **Environment variables** | ✅ Fully documented, ⏳ not populated | `docs/setup/environment-variables.md` is the canonical reference — every variable the app needs, where to obtain it, and whether it's required for Development vs. Production. Local `.env` (gitignored) currently holds only local-Postgres + dev-only values (`CRON_SECRET` set to a local test value, `PAYMENTS_PROVIDER` unset/defaults to stub). |

**Bottom line:** the application is 100% functional and fully tested end-to-end without any real third-party credentials, by design (stub payment provider, local Postgres, no Cloudinary calls required outside actual image upload testing). Supplying real credentials is a configuration step, not an implementation dependency — nothing in the remaining roadmap is blocked by it.

---

## Next Phase

**There is no next feature phase.** Core platform functionality is complete as of Phase 10 (Notifications). Per the client's explicit direction, work now proceeds according to **`docs/release-readiness-plan.md`** — remaining essential features (the two flagged in Known Issues above: header/session wiring, real password-reset email delivery), production infrastructure verification, deployment checklist, security verification, performance optimization, accessibility review, SEO review, monitoring/observability, backup/recovery, final end-to-end testing, and the launch checklist — each item marked as a launch blocker or a safe-to-ship-after-launch enhancement.

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
- Domain/business logic: `src/modules/<domain>/{actions.ts,queries.ts}` (`admin`, `bookings`, `listings`, `inquiries`, `messaging`, `payments`, `reviews`, `favorites`, `notifications`).
- Gateway abstractions: `src/lib/payments/` (`provider.ts` = interface, `stub-provider.ts`/`stripe-provider.ts` = adapters, `index.ts` = the only place `getPaymentProvider()` is exported from); `src/lib/notifications/` (same shape — `provider.ts`/`stub-provider.ts`/`resend-provider.ts`/`index.ts`, `getEmailProvider()`), plus `templates.ts` for the email copy per `NotificationType`.
- Notifications: `src/modules/notifications/notify.ts` is the **only** writer of `Notification` rows — any new domain action that should notify a user calls `notify(userId, type, payload)`, never `prisma.notification.create()` directly. See ADR-026 before adding a new `NotificationType` or changing critical-vs-toggleable classification.
- Cross-cutting config/constants: `src/lib/pricing-policy.ts` (fees, refund tiers — never hardcode a money-affecting constant elsewhere).
- Rate limiting: `src/lib/rate-limit.ts` — `checkRateLimit(key, config)` against the DB-backed `RateLimitHit` model (ADR-023). `RATE_LIMITS` exports the four configured limits (signup, inquiry, message, review). Call it as the very first statement after `requireAuth()` (or, for signup, before any DB write) in any new user-facing write action — don't ship a new public mutation endpoint without asking whether it needs one.
- Scheduled work: `src/jobs/`, triggered via `src/app/api/jobs/*` route handlers (bearer-token-gated).
- Architecture source of truth, in order of authority for a conflict: `docs/architecture/architecture-decision-record.md` (ADRs, what was actually decided and why) > `domain-model-specification.md` (entity-level detail) > `platform-architecture-blueprint.md` (system-level shape and roadmap) > `pre-implementation-review.md` (historical — gaps already folded into the other three).

**Working agreement (from the client, in effect for all future phases):** validate every module through genuine end-to-end testing (not just typecheck/build), report real bugs found during that testing, stop and ask before assuming any business rule not already covered by the ADRs/specs — but proceed with documentation (not a blocking question) for smaller, clearly-scoped implementation choices. Update this file at the end of every phase, before reporting completion to the client.
