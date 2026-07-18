# Project Status

**This is the canonical, single source of truth for implementation progress.** Read this file first in any new session before touching code or asking the client about status. **A previous version of this file fell significantly behind the actual codebase** (see §10, Critical Review, finding C7) — roughly 44 commits and a full day of active development had shipped without a single update. This revision reconstructs that gap from git history and direct code verification and is current as of the commit below. **Do not let that happen again**: update this file before reporting any phase/milestone complete, per the working agreement in §7.

**Last updated:** 2026-07-18, end of a release-hardening/cleanup pass (credential doc scrub, orphaned `/studio` Sanity Studio route removed — closes finding C4 below — test-db safety audit, new `docs/production-checklist.md`). See the bottom of this file's §2 for the full entry.

---

## 1. Current Project State

- **Current branch:** `claude/potomac-db-migrations-ubo0vt`, fast-forward-merged into `main` (the repo's default branch) after every commit this session — the two are identical.
- **Latest commit:** `26291dc` — "Release hardening pass: scrub credentials from docs, remove orphaned Sanity Studio, harden test-DB safety, add production checklist" (plus one further fix on top of it, not yet its own commit at the time of this sentence — see below).
- **Working tree:** one uncommitted fix at the time of this writing: a real bug found in `26291dc`'s own new `vitest.config.ts` test-database guard (see §10, finding C5's updated text) — will be committed and pushed alongside this documentation update.
- **Build status:** ✅ Clean, re-verified after `26291dc`. Standing up a disposable local Postgres 16 + PostGIS + pgcrypto database, running all 11 migrations against it from scratch, and building against that all succeeded with no errors. The orphaned `/studio` route is confirmed gone from the build output, along with the `jsdom`/`bufferutil`/`canvas` module-not-found warnings it used to drag in. Same sandbox-only `NEXTAUTH_URL` leading-space caveat as before (not a code defect — see prior verification).
- **Test status:** ✅ Clean, and this time genuinely verified end-to-end through the *new* safety mechanism, not around it. `npx tsc --noEmit`: zero errors. `npm test` (Vitest): **101/101 passing across 16 files**, run via a real `.env.test` pointing at a disposable local database — which only worked correctly after fixing the precedence bug described in finding C5. Before that fix, `.env.test`'s existence silently failed to override this sandbox's ambient (production) `DATABASE_URL`, meaning the guard would have reported success while still targeting production.
- **Overall completion:** All core marketplace functionality described in `docs/architecture/platform-architecture-blueprint.md` is implemented, tested, and has been live in production since before this session began. **The project is in the release/deployment stage, not feature development.** Concretely: auth/authorization, listings, search, bookings, Stripe Connect payments, messaging, reviews/favorites, rate limiting, admin dashboard, notifications, a full admin-editable CMS (replacing the originally-embedded Sanity Studio), an admin-curated City taxonomy backed by the full US Census Gazetteer dataset, and a real embedded Stripe Elements checkout are all built and working. What remains is real-credential infrastructure provisioning (Stripe live/webhook config, Resend), and the verification/hardening items in `docs/release-readiness-plan.md` — plus the genuine, previously-undocumented issues surfaced in §10 below, the most serious of which (hardcoded, source-controlled admin credentials live in production) should be treated as more urgent than a normal release-readiness checklist item.

---

## 2. Completed Work

This section is organized chronologically. Phases 1 through 10 and the milestones through **Mobile UX Pass** were already accurately documented in the previous version of this file and are preserved below essentially unchanged — they represent real, verified work. Everything after that point (§2.12 onward) was reconstructed for this update: some of it (§2.15 onward) this session performed and verified directly; the rest (§2.12–§2.14) shipped across roughly 44 commits and a full day of work by other sessions/agents with no corresponding documentation, and is summarized here from commit history and direct code inspection rather than first-hand session narration — see §10, finding C7.

### 2.1 Phase 1 — Chisfis Cleanup and Project Restructuring
Dead-code/dependency removal (Line Awesome font, dead `api/hello/` routes, a leaked Maps API key), `modules/`-by-domain folder scaffolding created (several scaffold folders remained empty pending later phases — since filled in, see Known Issues history).

### 2.2 Phase 2 — Core Infrastructure: Database, Auth, Authorization
Full Prisma schema authored from the Domain Model Specification (all entities, indexes, `CHECK` constraints, partial unique indexes) with connection pooling from the start. NextAuth v4 wired (credentials provider, JWT sessions, bcrypt). Role model implemented as `UserRole {CUSTOMER, HOST, ADMIN}` with GUEST as the implicit unauthenticated tier (ADR-017). `requireAuth/requireRole/requireOwnership/requireAdmin` authorization primitives in `src/lib/auth.ts`.
**ADRs:** 001–004, 008–010, 012, 017–019.

### 2.3 Phase 3 — Property Listing Module
Full listing CRUD, Cloudinary image upload (unsigned client-side, signed server-side delete), draft/publish/pause/archive lifecycle with `CHECK`-constraint-driven completeness validation, owner-only authorization. Auto-host-onboarding: any `CUSTOMER` becomes `HOST` on first listing creation. Listing extensibility model established: reference tables for catalog-like toggles (amenities), typed columns for core fields, one narrow `metadata Json?` escape hatch for presentational extras (ADR-020).
**Files:** `src/modules/listings/{actions,queries,types,search}.ts`, `src/app/add-listing/*`, `src/app/(account-pages)/account-listings/*`.

### 2.4 Phase 4 — Search & Discovery
`searchListings()` as the single search query boundary (ADR-013): URL is the source of truth for all filter/sort state, `rentalType` is a required top-level facet. Full-text search via generated `tsvector` + GIN index; geo radius/distance search via PostGIS `geography(Point)` + GIST index (ADR-014); cursor-based `(sortKey, id)` keyset pagination (ADR-010).
**Files:** `src/modules/listings/search.ts`, `src/lib/validations/search.ts`, `src/app/(stay-listings)/*`, `src/app/(client-components)/(HeroSearchForm*)/*`.

### 2.5 Phase 5 — Booking Engine
Complete booking lifecycle for both rental types against a `PaymentProvider` stub adapter: creation, atomic availability enforcement (transactional per-night `Availability` insert against a unique constraint — ADR-011), idempotent creation (client-supplied UUID), a single centralized `canTransition()` status-transition authority (ADR-003), cancellation with policy-driven refund tiers, long-term security deposits, a date-driven lifecycle job exposed via a `CRON_SECRET`-gated route handler.
**Business constants** (centralized in `src/lib/pricing-policy.ts`): guest service fee 10% (short-term only); short-term cancellation refund tiers (FLEXIBLE/MODERATE/STRICT); long-term early-termination deposit refund tiers (STANDARD/STRICT).
**Files:** `src/modules/bookings/*`, `src/lib/pricing-policy.ts`, `src/lib/payments/{provider,stub-provider}.ts`, `src/jobs/booking-lifecycle.ts`.

### 2.6 Phase 6 — Stripe Connect Integration
Real `StripeConnectProvider` behind the unchanged `PaymentProvider` interface: PaymentIntent create/confirm, refunds, Express account creation + onboarding Account Links, live account status, Transfers (separate charges and transfers, ADR-005), webhook signature verification + event normalization. Feature-flagged via `PAYMENTS_PROVIDER` (`stub` default / `stripe`). Admin-callable `payoutForPayment()` built and tested but **deliberately not wired to the booking lifecycle** — payout timing remains an explicit Outstanding Decision (§7).
**Bugs found/fixed:** `chargeBookingTx` no longer wrongly rolls back a booking for a `PENDING` (not yet settled) charge; refund/chargeback `Payment` rows now set `relatedPaymentId`; `Booking.status` can reach `DISPUTED` from `CONFIRMED`/`CHECKED_IN`, not only post-completion.
**ADRs:** 021.
**Files:** `src/lib/payments/{stripe-provider,index}.ts`, `src/modules/payments/*`, `src/app/api/webhooks/stripe/route.ts`, `src/app/(account-pages)/account-billing/*`.

### 2.7 Phase 7 — Messaging
`Conversation`/`Message`/`ConversationParticipant` wired up. Two conversation-creation triggers: eager for inquiries, lazy for bookings. Host's reply in an inquiry-anchored thread auto-marks that inquiry `RESPONDED`. `ADMIN` dispute-resolution read access as a dedicated, always-audit-logged function.
**Bugs found/fixed:** `MessageThread` copied server-fetched messages into local `useState` that never re-synced after `router.refresh()` — fixed by rendering the prop directly.
**ADRs:** 022.
**Files:** `src/modules/messaging/*`, `src/app/(account-pages)/account-messages/*`, `src/lib/validations/messaging.ts`.

### 2.8 Phase 8 — Reviews and Favorites
Two-sided, double-blind reviews (`Review.direction`, `isVisible=false` on submission, published on both-sides-exist OR a 14-day expiry window, via `src/jobs/review-expiry.ts`). `Listing.avgRating`/`reviewCount` recomputed only on an actual visibility transition. `Favorite` toggle wired end-to-end on the listing detail page and `account-savelists`. Host can post one public response per guest→host review.
**Architectural gap found and closed:** rate limiting was required on four endpoints (signup, Inquiry, Message, Review) but three had shipped with none — retrofitted into all four (`RateLimitHit` model + `src/lib/rate-limit.ts`, sliding window). Redis/Upstash remains the named, not-yet-triggered graduation path (ADR-023).
**Documentation reconciled:** review eligibility rule — `COMPLETED` or `TERMINATED_EARLY` — blueprint corrected to match the domain-model spec (ADR-024).
**Files:** `src/modules/reviews/{actions,queries,rating}.ts`, `src/modules/favorites/{actions,queries}.ts`, `src/lib/rate-limit.ts`, `src/lib/validations/review.ts`, `src/jobs/review-expiry.ts`, `prisma/migrations/20260715174500_add_rate_limit_hit/`.

### 2.9 Phase 8 Follow-up — Role-Aware Post-Login Redirect
Replaced a hardcoded post-login redirect to `/account-listings` with `getDefaultDashboardPath(roles)` (`src/lib/dashboard-path.ts`): role-priority `ADMIN > HOST > CUSTOMER`, routing to `/account-bookings`, `/account-listings`, or `/account` respectively.
**Files:** `src/lib/dashboard-path.ts`, `src/app/login/page.tsx`, `src/app/signup/page.tsx`.

### 2.10 Phase 9 — Admin Dashboard
Complete admin dashboard, gated by `ADMIN` role check in the layout. All admin actions audit-logged via `AuditLog` and gated by `requireAdmin()`.
User management (suspend/unsuspend/verify), listing moderation (approve/reject/unpublish, conditional on the `listingModerationEnabled` platform setting — **see §2.15 for a default-behavior change made this session**), booking/dispute oversight, taxonomy CRUD (`PropertyType`/`Amenity`), platform settings (key-value `PlatformSetting` model), audit log viewer, platform overview stats.
**Schema:** `PlatformSetting` model added; `AuditLog.targetId` changed from `@db.Uuid` to plain `String` (polymorphic field — ADR-025).
**Bugs found/fixed:** `AuditLog.targetId` type mismatch; `metadata` cast for Prisma's `InputJsonValue`; wrong Prisma field names in a couple of admin queries (`position` not `order`, `checkInDate`/`checkOutDate` not `checkIn`/`checkOut`).
**ADRs:** 025.
**Files:** `src/modules/admin/{actions,queries,settings}.ts`, `src/app/admin/*`, `prisma/migrations/20260716140000_add_platform_setting/`, `prisma/migrations/20260716150000_audit_log_targetid_text/`.

### 2.11 Phase 9 Follow-up — Security Audit and Hardening
Verified seven security properties (no `/admin/*` reachable by non-admins; no Server Action bypasses its own authorization; every admin action requires `requireAdmin()`; every privileged action audit-logs; no privilege escalation via a modified request; IDs can't be enumerated; hidden/rejected listings aren't reachable without permission).
**Gaps found and fixed:** a stray `"use server"` on `src/modules/admin/settings.ts` made internal config helpers client-callable — removed; four taxonomy mutations discarded the admin identity and skipped audit logging — fixed; `payoutForPayment()` (a financial disbursement) had the same gap — fixed, now audit-logs actor/amount/currency/status.
**Files:** `src/modules/admin/{actions,settings}.ts`, `src/modules/bookings/actions.ts`.

### 2.12 Phase 10 — Notifications
The last core platform module per the blueprint. `notify()` emission primitive, email delivery via Resend behind a gateway-agnostic `EmailProvider` interface (ADR-026, mirrors ADR-006's `PaymentProvider`), in-app notification list + email preferences UI, retrofitted into every domain action the blueprint names (`BOOKING_CONFIRMED`, `BOOKING_CANCELLED`, `NEW_MESSAGE`, `NEW_INQUIRY`, `REVIEW_RECEIVED`, `PAYOUT_SENT`, `LISTING_APPROVED`/`LISTING_REJECTED`, `RENT_DUE_REMINDER`, `PASSWORD_CHANGED`). Always writes an in-app row; emails on an opt-out model except four `CRITICAL_EMAIL_TYPES` that always email.
**Files:** `src/lib/notifications/*`, `src/modules/notifications/*`, `src/app/(account-pages)/account-notifications/*`, `src/actions/auth.ts` (`changePassword` added).

### 2.13 Release Hardening Milestone
Closed every launch-blocking gap that didn't need a real credential: real password-reset email delivery (was `console.log`-only) plus the `/forgot-password`/`/reset-password` UI pages that hadn't existed at all; header session-awareness (`AvatarDropdown` now calls `useSession()`/`signOut()`); login + forgot-password rate limiting; baseline security headers + CSP in `next.config.js`; `metadataBase`, `sitemap.ts`, `robots.ts`, `opengraph-image.tsx`.
**ADRs:** 027.

### 2.14 First Deployment Fixes
The first real Vercel deployment attempt failed twice: missing `"postinstall": "prisma generate"` (Vercel's cached-install path skips Prisma's implicit generate step), and `sitemap.ts` querying the DB at build time (fixed with `export const dynamic = "force-dynamic"`). Both are real, deployment-blocking bugs found by actually deploying, not by inspection.
**ADRs:** 028.

### 2.15 Mobile UX Pass
Client bug report against the live deployment surfaced: a listing-page crash (root-caused to Neon migrations never having been run against the real database at that point — since resolved, see §4), invisible carousel arrows (stale Line Awesome icon references — replaced with Heroicons/hand-drawn SVGs), a scroll-jumping swipe carousel (missing `preventScrollOnSwipe`), three independently hardcoded Feb-2023 date picker defaults, and — the most serious finding — **mobile users could not book at all**, because the real `BookingWidget` was desktop-only and mobile instead showed a hardcoded-fake-price component wired to an orphaned demo checkout page. Fixed with a real `MobileBookingBar` reusing the same `BookingWidget` in a bottom sheet.
**ADRs:** 029.

---

### 2.16 Undocumented Work, Reconstructed From Git History (2026-07-16 evening through 2026-07-17 morning)

**The previous version of this file stopped updating after the Mobile UX Pass entry above**, even though development continued for roughly a full day and ~44 more commits across several further sessions/agents before this reconstruction. The following is assembled from commit messages and direct code inspection, not first-hand session narration — treat it as a reliable changelog of *what shipped*, but with less certainty about *why* specific implementation choices were made than the phases above (which is itself flagged as a documentation-process failure — see §10, finding C7).

- **Homepage and UI overhaul** (`359b020`, `1a1db56`, `e493eae`, `1338176`, `d7ddafa`, `71c1286`): card/logo/transition polish, an iOS zoom fix, a real "Featured places to stay" section with a bleed-style destination carousel and full `StayCard` grid (this closes the "no Featured places to stay section" gap the Mobile UX Pass had explicitly flagged as an unstarted, client-named UI gap), dark-mode toggle and mobile-nav transition fixes, FAQ and blog sections added to the home page.
- **Admin dashboard redesign** (`0212513`, `3396ace`, `58f84db`, `a8c7e99`): persistent sidebar nav, a shared UI kit, full-width layout, avatar upload, error boundaries, a fix for a CSP rule that was silently blocking uploads.
- **Publish-flow and upload improvements** (`d01e40d`): replaced a vague listing-publish error with an actionable completion checklist; flexible check-in/out; upload size limits; client-side image compression.
- **Site chrome and listing management** (`e4150be`): removed marketing-site chrome from admin pages, added real listing deletion, fixed auth-aware nav rendering.
- **First Sanity CMS integration pass** (`dbbfa1b`, `647dfcb`, `5098edc`, `908fc50`, `ae47dca`, `f7bbb65`): initial Sanity wiring for the blog, a React-18-compatibility removal and later restoration of the embedded Sanity Studio at `/studio`, a signup-link fix, city-filter href fixes, mobile-nav auth-state fixes, header/footer/contact-page copy updates. **This is the CMS integration that a later session (§2.18) replaced with a custom in-admin editor** after explicit client pushback against being routed to Sanity's own UI — see that entry.
- **Dependency and admin fixes** (`87c9b84`, `e5dee7c`, `22002ac`): resolved the moderate-severity `npm audit` findings that existed at the time (the count has since risen again — see §10, finding C8); fixed a duplicate `useSession` import; admin logout, sticky header, a "You" badge, admin search, admin-account creation, and amenity-category fixes.
- **Build fix and a comprehensive site audit** (`2f2ccf8`, `942930f`, `26ad5a4`, `078cfc9`): a Heroicon-name build break and mobile-bottom-nav regression fixed; a broad pass fixing bugs, SEO, dark-mode issues, and conversion-path UX across the site; a login-page redesign; **a real security fix** — `callbackUrl` is now validated before redirecting, closing an open-redirect vulnerability.
- **Listing photo/booking fixes and Sanity Studio rework** (`272198f`, `f75cc8b`, `018676b`, `4f73a4a`, `c5a6d4e`, `3ff9239`): drag-and-drop photo reordering; the last raw `<img>` tags replaced with `next/image`; admin listing-creation, booking-calendar, and stat-label fixes; a footer-overlap fix; the Sanity Studio route rebuilt on `next-sanity`'s `NextStudio` wrapper; the booking form hidden on unpublished listings for non-owners; the "warped date picker" root-caused to a missing `react-datepicker` base stylesheet import and fixed.

**Two previously-flagged Known Issues were closed somewhere in this window** without an explicit "fixed" note at the time: the header's `NotifyDropdown` is now wired to a real `/api/notifications/recent` endpoint (was static demo data), and `BtnLikeIcon` (used across `StayCard` search-result/home-page instances) now calls the real `toggleFavorite()` action (was local-only UI state). Both confirmed by direct code read during this update, not assumed from commit messages alone.

---

### 2.17 This Session — Cloudinary, Payments, Calendar/Date UX (this session's own directly-verified work)

- **Cloudinary-native image delivery:** a per-component `loader` prop (`cloudinaryLoader`, `src/lib/cloudinary-image-loader.ts`) applied across every listing-image `<Image>` instance, instead of routing through Next's own `/next/image` optimizer — confirmed via source inspection that a *global* custom loader would have hard-404'd the optimizer route entirely (`imagesConfig.loader !== "default"` triggers a `render404` in `next-server`), so this had to be scoped per-component.
- **Calendar UX:** dynamic hint text ("Now pick your check-out date" vs. the initial instruction) added to all three hero search date pickers; dark-mode `react-datepicker` overrides.
- **Real payment collection:** embedded Stripe Elements (`PaymentElement` + `confirmPayment`) at instant-book checkout — `createPaymentIntent`/`verifyPaymentIntent` added to the `PaymentProvider` interface, a two-phase booking-widget UI (price → "Continue to payment" → card form), server-side amount re-verification before charging. Scoped deliberately to only the flow where a guest is present in real time; `createCharge`'s hardcoded test-card stand-in is unchanged and still used for host-approval charging, security deposits, and monthly rent (no guest present at charge time for those).
- **Not verified against a real Stripe account** — this sandbox's network policy blocks the same class of external calls it blocks for other providers; ships with that caveat explicit in the commit message.

### 2.18 This Session — Custom In-Admin CMS, Replacing the Embedded Sanity Studio
**Direct client correction:** *"You still haven't built that cms editor in the app on my admin page, it keeps taking me to sanity. I don't want that!"* — the embedded `/studio` route (§2.16) routed admins to Sanity's own UI, which is explicitly not what was asked for. Built an entirely separate, bespoke admin UI under `/admin/content/*` (posts, pages, categories/authors, FAQ, About page), none of it reusing any Sanity Studio component: a dedicated write client (`src/modules/cms/sanity-admin-client.ts`, `useCdn: false` so admin edits aren't CDN-stale), admin-scoped queries/actions with `requireAdmin()` gating and `revalidatePath` on save, and a small plain-text-to-Portable-Text bridge (`src/modules/cms/portable-text.ts`) since no rich-text editor exists yet.
**AdminNav updated** to point "Content" at `/admin/content`, not `/studio`. **The old `/studio` route itself was not deleted** — see §10, finding C4.

### 2.19 This Session — Migrate Static Site Content Into Sanity
**Client direction:** *"look at the website content that are not the business operational part already in database and put [it] in sanity... I'm migrating all content to sanity except for the business operation ones [that are] in db"* — this is now the standing architectural rule (§7). Diagnosed why `/admin/content` showed all-zero counts despite visible site content: About/FAQ/Terms/Privacy were still running on pre-Sanity hardcoded fallback data, never migrated. New Sanity schemas (`faq`, `aboutPage` — the latter a singleton enforced by a fixed document ID, not a Sanity-side constraint), each public page rewritten to fetch-from-Sanity-first with a fallback to the original hardcoded content, and new admin editors for both.

### 2.20 This Session — Admin-Curated City Taxonomy (Full US Census Coverage)
**Client direction, after an exploratory discussion of the tradeoffs:** admin-managed City taxonomy so "Top cities to explore" only reflects cities the admin has actually curated, while hosts can still type any city they want on their listing.
- New `City` model (hand-authored migration — this sandbox cannot reach Neon over raw Postgres, so the migration SQL was written by hand matching an existing table's exact conventions rather than generated by `prisma migrate dev`, then applied by Vercel's own build environment via `prisma migrate deploy`, which does have real Neon connectivity).
- **First seeded with ~180 hand-typed cities, then replaced same-session with the full US Census Bureau 2024 Gazetteer Places file** — ~32,109 unique (city, state) pairs after stripping Census's legal/statistical suffixes (`city`/`town`/`village`/`CDP`/`borough`/etc.) — free, public domain, no API key, no ongoing dependency. This was a direct response to the client asking "is there like a free api... that can cover every damn city."
- Scaling this from 180 to 32,000+ rows required three follow-up changes in the same session: `/admin/cities` switched from client-side filtering of a fully-loaded list to server-side debounced search; the listing wizard's city combobox switched from an eagerly-loaded full list to an on-demand `searchActiveCities()` server action; `getTopCities`/`getTopCityCategories` switched from loading every active City row into memory to only checking the handful of distinct city names that actually appear in published listings.
- Seeding is bulk (`createMany` with `skipDuplicates: true`, chunked), not one-row-at-a-time, and wired into `vercel-build` so it self-populates on the next deploy without needing direct DB access.

### 2.21 This Session — Blog Post Migration Into Sanity
The 6 hardcoded demo blog posts (title/excerpt summaries in `src/data/blogPosts.ts`, full bodies embedded in `src/app/blog/[slug]/page.tsx`'s `fallbackPosts` object) migrated into real Sanity `post` documents — a bespoke converter translated the site's `**Heading**` markdown convention into the `### Heading` convention the existing plain-text-to-Portable-Text bridge expects, a default "The Potomac Team" author and per-post category documents were created, and each post's cover image was fetched and uploaded as a real Sanity asset. Verified via a direct Sanity API read after seeding (not assumed). The one-time migration script was deleted after running, per this project's established "scratch script, not committed" convention for this kind of one-off data migration.

### 2.22 This Session — UX Fixes From Direct Client Feedback (Mobile Screenshots)
A batch of small, concrete fixes from client-supplied mobile screenshots and direct observations:
- **Mobile footer nav** (`Explore`/`Wishlists`/`Log in`/`Menu`) no longer hides on scroll-down and reappears on scroll-up — removed the scroll-direction show/hide JS entirely, now permanently `fixed bottom-0` (client's own words: *"I was talking about the bar with menu login/account, explore… dummy"* — an initial misdiagnosis, corrected once clarified).
- **Mobile search modal** now auto-advances from the date-range step to the guest-count step the instant a full check-in/check-out range is picked, instead of leaving the calendar open re-showing the same "pick a range" instruction — same auto-advance pattern the location step already used.
- **The listing page's own reserve calendar** gets the same dynamic "now pick your check-out date" hint the homepage search already had (it previously had no hint at all), and the hint disappears once both dates are set instead of repeating the initial instruction.
- **"Top cities to explore" subheading** rewritten from a one-line fragment ("The cities guests love most") to a fuller sentence.
- **Listing moderation now defaults to on.** `isListingModerationEnabled()` previously defaulted to `false` (auto-publish) when no `PlatformSetting` row existed; flipped so every new listing requires admin approval unless an admin explicitly opts out in `/admin/settings` — direct client instruction: *"the admin should please review every published listing."*

### 2.23 This Session — Release Hardening and Cleanup Pass (Pre-Feature-Work)
**Client direction:** a hardening/cleanup pass before any new feature work, explicitly *not* rotating the demo login (a private copy is held outside the repo) and *not* refactoring working architecture. Scope and results:
- **Credential exposure (finding C1) — docs scrubbed, not rotated.** The literal demo admin/host email+password values were removed from every doc/comment/example file that had them (`docs/project-status.md`, `docs/release-readiness-plan.md`); `prisma/seed.ts` itself is unchanged (still the source of truth for the actual login) but now carries a header comment documenting the tradeoff and the recommended long-term fix (env-var-driven seed credentials, or gating demo-account creation the way `seed-dev-data.ts` already gates itself). Rotation is explicitly deferred, per client instruction — a live risk, not a resolved one.
- **A second, unrelated leaked credential found and removed:** `.env.local.example` (committed since the original Chisfis template import, `bf406eb`, never referenced by the README's actual setup instructions) contained a real-looking Cloudinary cloud name/API key/API secret belonging to the template's original author, not this project. Deleted outright — `.env.example` already documents the real variable names with empty placeholders.
- **Orphaned Sanity Studio removed (finding C4) — see §10 for detail.**
- **Test database safety (finding C5) audited** — see §10 for what changed and what's still a manual/operational gap (a real separate Neon branch or local Postgres for tests, which no automated pass can provision).
- **`npm audit` vulnerability count fixed from 21 down to 2 (finding C8)** — see §10 for the root cause (a Yarn-only `resolutions` block that silently never applied under npm) and fix.
- **Two confirmed-orphaned template files deleted:** `src/components/ModalSelectDate.tsx`, `src/app/(listing-detail)/SectionDateRange.tsx` — both already flagged in this file's own Known Issues as safe to delete, both re-confirmed unreferenced anywhere in `src/` before removal. (`src/app/checkout/*`, also named in that same old flag, no longer existed — already removed by an earlier, undocumented change.)
- **`styled-components` removed as an obsolete dependency** — a Chisfis-template leftover, never actually imported anywhere in `src/` (this project styles with Tailwind CSS), yet still declared as a real dependency with `next.config.js`'s SWC `compiler.styledComponents` option enabled for it. It was also the source of the `react-native` peer-dependency warning `npm install` kept surfacing. Both removed; build/typecheck reconfirmed clean afterward.
- **New `docs/production-checklist.md`** — a practical, checkbox-driven launch runbook covering infra provisioning, verification steps, and secret rotation, distinct from `release-readiness-plan.md`'s longer-form audit narrative.
- **Verification:** `tsc --noEmit` clean, `next build` clean (57 routes), `npm audit`/`yarn audit` both down to the 2 Next.js-only findings, both lockfiles (`package-lock.json`, `yarn.lock`) regenerated and consistent with each other.
- **No new features, no refactors of working code, no framework version bumps** — scope was held to exactly what the client asked for.

---

## 3. Current Stack

| Layer | Choice |
|---|---|
| Framework | Next.js **13.5.11** (App Router, Server Actions, `typedRoutes`) — see §10, finding C2: significantly behind current, carries unpatched CVEs |
| Language | TypeScript 5.0.4 (target `es5`, strict mode) |
| UI | React 18.2, Tailwind CSS 3.3 |
| Database | PostgreSQL 16 + PostGIS + pgcrypto, via Prisma **5.22** (pinned — see ADR-018), hosted on **Neon** |
| Auth | NextAuth v4.24 (`@next-auth/prisma-adapter`), JWT sessions, bcrypt — see ADR-019 |
| Validation | Zod 4.4 |
| Payments | Stripe SDK 22.3, Stripe Connect Express, separate-charges-and-transfers model (ADR-005), plus embedded Stripe Elements (`@stripe/react-stripe-js`, `@stripe/stripe-js`) for real-time instant-book card collection (§2.17) |
| Content / CMS | **Sanity** (`@sanity/client`, `next-sanity`, `@sanity/image-url`, `@portabletext/react`) for blog posts, standalone pages, FAQ, and the About page — edited through a custom in-admin editor (§2.18), *not* Sanity's own Studio UI (the `/studio` route and the `sanity`/`@sanity/vision` packages that only it needed were removed in the 2026-07-18 hardening pass — see §2.23, closes finding C4) |
| Media | Cloudinary 2.10 (unsigned client upload, signed server-side delete, per-component `loader` for on-the-fly transforms — §2.17) |
| Location data | US Census Bureau 2024 Gazetteer Places file (`prisma/data/usCitiesSeed.json`, ~32,000 rows) — free, public domain, one-time import, no ongoing API dependency (§2.20) |
| Notifications | Resend (`resend` npm package), `EmailProvider` abstraction (ADR-026), feature-flagged (`NOTIFICATIONS_PROVIDER`, stub default) |
| Testing | Vitest 4.1 (unit/integration, DI-mocked adapters); Playwright (E2E, installed/uninstalled per session — never a persistent devDependency) |
| Deployment | Vercel — connected, deployed, live |

---

## 4. Infrastructure Status

| Service | Status | Notes |
|---|---|---|
| **Neon (Postgres)** | ✅ **Completed and configured** | Real `DATABASE_URL` (pooled) / `DATABASE_URL_UNPOOLED` (direct) set in Vercel. All 11 migrations applied via `prisma migrate deploy`, run automatically by `vercel-build`. `postgis`/`pgcrypto` extensions enabled. Reference data (15 property types, 49 amenities) and a demo host/admin/15 demo listings are seeded — **see §10, finding C1: the demo accounts use hardcoded, source-controlled credentials and this needs urgent attention, independent of everything else in this table being "done."** |
| **Cloudinary** | ✅ **Completed and configured** | Fully implemented (unsigned client upload, signed server-side delete, per-component transform loader) and confirmed working in production — real listing photos flow through it today. `res.cloudinary.com` is in `next.config.js`'s `images.remotePatterns` and the CSP's `img-src`. |
| **Stripe** | ⏳ **Provisioned but not fully verified** | Full Connect integration built and tested via dependency injection — `PAYMENTS_PROVIDER` defaults to `stub` so none of this has ever *required* real credentials to develop against. The embedded Stripe Elements checkout (§2.17) exists in code but **has never been exercised against a real Stripe account from any session** (sandbox network policy blocks it) — this is the single most important remaining pre-launch verification, not just a credential-provisioning checkbox. Webhook endpoint registration against the real deployed URL is also unverified. |
| **Resend (email)** | ⏳ **Intentionally deferred** | `EmailProvider` abstraction fully implemented and used throughout the notification pipeline (password reset, booking confirmations, etc.) — `NOTIFICATIONS_PROVIDER` defaults to `stub` (logs to console) so this has never required real credentials to develop or test against. Deferred deliberately: sending real transactional email is a go-live decision (needs a verified sending domain), not a development dependency — nothing is blocked waiting on it. |
| **Sanity** | ✅ **Completed and configured** | Real project ID/dataset/API token in use (confirmed via direct writes this session — post/category/author/city-adjacent content created and read back successfully). CDN disabled for admin writes (`useCdn: false`) so edits are never CDN-stale. **Not yet documented in `docs/setup/environment-variables.md`** — fixed as part of this update (§5). |
| **Vercel** | ✅ **Completed and configured** | Repo connected, building and deploying successfully against `main`. `vercel-build` runs `prisma migrate deploy && tsx prisma/seed-cities.ts && next build` on every deploy. **Note the change from what was previously documented: this no longer includes `prisma db seed`** — see §10, finding C3. `vercel.json`'s two Cron entries (booking-lifecycle, review-expiry) are in place; whether they're actually firing on schedule in the live environment has not been independently re-confirmed this pass. |
| **Auth (NextAuth)** | ✅ Completed and configured | Credentials provider, JWT sessions, bcrypt, role-based authorization — all working. `NEXTAUTH_SECRET` needs confirming as a real, distinct-per-environment value (not the local dev placeholder). |
| **Environment variables** | ✅ Documented (this update adds the missing Sanity section) | See §5. |

**Bottom line:** every piece of *code* the platform needs is written, and the application has run 100% functionally end-to-end without real third-party credentials since early in the project, by design. What's left is genuinely a mix of (a) routine credential provisioning (Resend, Stripe live/webhook config) and (b) the C1–C8 findings in §10, which are not "infrastructure to provision" — they're real issues that need a decision and, in C1's case, urgent action.

---

## 5. Environment Variables

The canonical detailed reference remains `docs/setup/environment-variables.md` (updated alongside this file to add the Sanity section that was missing from it — see §10, finding C6). This table is the complete, current list.

| Variable | Used for | Status |
|---|---|---|
| `DATABASE_URL` | Prisma runtime queries (pooled) | **Required — configured** |
| `DATABASE_URL_UNPOOLED` | Prisma Migrate (direct, bypasses PgBouncer) | **Required — configured** |
| `NEXTAUTH_URL` | Must exactly match the app's own origin; also reused as the app's canonical absolute-URL source (`src/lib/site-url.ts`) for email links, `metadataBase`, sitemap, robots | **Required — configured** (confirm no leading/trailing whitespace in the real Vercel value — see §1) |
| `NEXTAUTH_SECRET` | Signs/encrypts session JWTs | **Required — confirm it's a real, distinct-per-environment value, not the dev placeholder** |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Server-side SDK config, signed deletes | **Required — configured** |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` / `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | Client-side unsigned upload | **Required — configured** |
| `PAYMENTS_PROVIDER` | Feature flag: `stub` (default) or `stripe` | Optional |
| `STRIPE_SECRET_KEY` | Server-side Stripe Connect calls | **Required for real payments — deferred**, see §4 |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Gates whether the embedded Stripe Elements card form renders at instant-book | **Required for real payments — deferred** |
| `STRIPE_WEBHOOK_SECRET` | Verifies `/api/webhooks/stripe` signatures | **Required for real payments — deferred** |
| `NOTIFICATIONS_PROVIDER` | Feature flag: `stub` (default) or `resend` | Optional |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Real transactional email sends | **Deferred — intentional, see §9** |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Listing map embeds | Enhancement — degrades map embeds only if unset |
| `CRON_SECRET` | Bearer-auth for `/api/jobs/*`, auto-attached by Vercel Cron | **Required — configured** |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Sanity client config (public + admin clients) | **Required — configured** (⚠ was undocumented — see §10, finding C6) |
| `NEXT_PUBLIC_SANITY_DATASET` | Sanity dataset name (defaults to `"production"` if unset) | **Required — configured** |
| `SANITY_API_TOKEN` | Write access for the admin CMS client (`useCdn: false`) | **Required — configured** |
| `SANITY_REVALIDATE_SECRET` | Verifies `/api/sanity/revalidate` webhook requests | **Required — configured** |
| `VERCEL_URL` / `VERCEL_ENV` / `NODE_ENV` | Provided automatically by the platform | No action needed |

---

## 6. Known Issues

Only genuine, currently-unresolved items. Anything closed during this update's verification pass (NotifyDropdown, BtnLikeIcon, the "Featured places to stay" section, the open-redirect fix, header session-awareness, password-reset delivery, mobile booking) has been removed rather than struck through — see §2 for what closed them and when.

**Functional issues**
- **`Conversation.listingId`/`inquiryId` are plain columns with no FK/relation** — pre-existing schema design, populated manually, never joinable via Prisma `include`. Any query needing listing context from a `Conversation` must batch-fetch separately (see `modules/messaging/queries.ts`'s `attachListing` helper).
- **No real-time message delivery** — polling/`router.refresh()` only, no WebSockets. Acceptable for MVP; no architecture doc requires it.
- **`StripeConnectProvider.createCharge` uses a hardcoded Stripe test PaymentMethod** (`pm_card_visa`) for host-approval charging, security deposits, and monthly rent — by design, since no guest is present in real time for those flows to collect a real card. The instant-book flow (§2.17) is the one path with real card collection.
- **Empty scaffold module folders remain from Phase 1:** `src/modules/booking` (singular, empty — real code is in `src/modules/bookings`), `src/modules/auth`, `src/modules/search`, `src/modules/users`. Don't create new files there. (Left in place during the 2026-07-18 hardening pass — deleting empty placeholder folders was judged not worth touching; they're inert.)
- **`src/components/ModalSelectDate.tsx` and `src/app/(listing-detail)/SectionDateRange.tsx` — deleted 2026-07-18.** Confirmed genuinely unreferenced (no imports anywhere in `src/`) and removed as flagged. `src/app/checkout/{page,PageMain}.tsx` no longer exists either — already gone by the time of this pass, this entry was stale.
- **`RateLimitHit` pruning is opportunistic**, not a sweep job — a key that's never hit again leaves its rows indefinitely. Cheap at current volume.
- **Email delivery failures are silent** (logged server-side only, no retry/dead-letter queue) — accepted trade-off (ADR-026), revisit if it becomes a real problem once Resend is live.

**Infrastructure / operational issues** (see §10 for full detail — these are the same findings, cross-referenced here per the requested Known-Issues structure)
- **C1 — hardcoded demo admin/host credentials, live in production** (CRITICAL).
- **C2 — Next.js 13.5.11 carries multiple unpatched high-severity CVEs**; upgrade is a major-version jump, not a patch (HIGH).
- **C3 — `vercel-build` no longer auto-seeds reference/demo data** on a fresh deploy (MEDIUM).
- **C5 — no dedicated test/staging database**; the project's own integration-test suite would run directly against production data if executed from a machine with full Neon connectivity (MEDIUM). **Partially mitigated 2026-07-18** — the test runner now refuses to run against anything it can identify as production (a genuine bug in that guard's first cut — it silently failed to actually redirect the connection when `DATABASE_URL` was already ambient-set, which is exactly this project's own sandbox setup — was found and fixed the same day, see §10 C5), but provisioning an actual separate database is still an open manual step.
- **C8 — RESOLVED 2026-07-18, except for the Next.js-specific subset already tracked as C2.** `npm audit` was 21 vulnerabilities (12 moderate, 9 high). Root cause: `package.json`'s `resolutions` field (Yarn-only) was pinning several vulnerable transitive packages, but the project also ships a `package-lock.json` and its README instructs `npm install` — npm ignores `resolutions` entirely, so those pins never applied for npm users. Fixed by adding an equivalent `overrides` block (npm's version of the same feature) and pinning the remaining flagged transitives (`flatted`, `js-cookie`, `minimatch`, `picomatch`, `semver`) in both `resolutions` and `overrides` so the two lockfiles stay equivalent. Down to 2 vulnerabilities (1 moderate, 1 high) under `npm audit`, both nested inside Next.js's own dependency tree (`next`'s vendored `postcss`) and only fixable by the Next 13→16 major upgrade already tracked as C2 — not a new, separately-actionable item.

**Future enhancements** (safe to defer, not blockers)
- Payout timing remains manual-only — see §7, Outstanding Decisions.
- No header-adjacent enhancement backlog beyond what's already in `docs/release-readiness-plan.md` §1.

---

## 7. Developer Handoff

Written for a senior engineer picking this up cold, months from now, with no access to any prior chat transcript.

**Where to start:**
1. Read this file in full, then `docs/release-readiness-plan.md`.
2. Read §10 below and treat finding **C1 as your literal first action** — rotate/remove the hardcoded demo admin and host credentials before doing anything else. They are sitting in `prisma/seed.ts`, in source control, and have almost certainly been run against the live production database.
3. Confirm real Stripe test-mode credentials and actually exercise the embedded Elements checkout end-to-end — this is the one major system in the entire codebase that has never been run against a real instance of its own third-party dependency.
4. From there, work through `docs/release-readiness-plan.md`'s checklist in order.

**Do not refactor without an architectural review first:**
- **The module-boundary convention (ADR-012).** A module's `actions.ts`/`queries.ts` is its only public surface — never reach into another module's Prisma model directly.
- **The `PaymentProvider`/`EmailProvider` gateway abstractions** (ADR-006/ADR-026 pattern) — every external payment or email call goes through these interfaces. Don't add a direct `stripe.*` or `resend.*` call anywhere outside `src/lib/payments/`/`src/lib/notifications/`.
- **The content-split rule** (this session's standing instruction, not yet formalized as an ADR — see finding C9): *all static/marketing/informational content lives in Sanity; all operational business data (listings, bookings, users, payments, and taxonomy tied directly to bookings like `PropertyType`/`Amenity`/`City`) stays in Postgres.* Don't move business-operational data into Sanity, and don't add new hardcoded marketing copy to `src/` when a Sanity-backed page already exists for that content type.
- **`Payment.amount` is integer cents; `Listing`/`Booking` pricing fields are `Decimal(10,2)` exact dollars** — never mix the two without going through `dollarsToCents()`/`roundToCents()` (`src/lib/pricing-policy.ts`). Prisma `Decimal` objects are always truthy even at zero — never `if (someDecimalField)` as a non-zero check.
- **The City taxonomy is intentionally two-tier**, not a strict foreign key: `Address.city` stays a free-text string (a host can type anything), while the `City` table is a separate, admin-curated taxonomy that only gates what's searchable in the listing wizard's combobox and what's eligible for "Top cities to explore." Don't tighten this into an actual FK relationship without confirming that's actually wanted — it would break the explicit "hosts can list anywhere" requirement.
- **Don't wire an automatic payout trigger** (`payoutForPayment()`) without asking first — this is a live Outstanding Decision below, not an oversight.

**Architectural constraints worth preserving:**
- No `middleware.ts` exists, and authorization is enforced per-Server-Action/per-page via `requireAuth()`/`requireAdmin()`/`requireOwnership()` rather than centrally. This was deliberately audited (Phase 9 Follow-up) and is, incidentally, why this app isn't exposed to the well-known Next.js middleware-bypass CVE class the way a middleware-gated app would be (see finding C2). Don't introduce a `middleware.ts` for auth without re-running that same audit against it.
- The two-step raw-SQL-then-Prisma-hydrate search pattern (`searchListings()`) is deliberate — keeps the raw SQL surface small and auditable. Don't inline more raw SQL elsewhere without a good reason.
- Rate limiting is DB-backed (`RateLimitHit` + `src/lib/rate-limit.ts`), not Redis — a known, accepted MVP-scale choice (ADR-023) with a named graduation path if volume ever demands it.

**Outstanding Decisions (business, not technical — do not resolve unilaterally):**
- **Payout timing policy.** `payout()`/`payoutForPayment()` are fully built and tested but not wired to any automatic trigger. Timing (on check-in? on completion? after a dispute window?) was explicitly deferred as the client's own future decision.
- **Full WCAG 2.1 AA compliance** — is it a launch blocker given ADA legal exposure for a US consumer marketplace, or a post-launch enhancement? Flagged in `docs/release-readiness-plan.md` §6, never answered.
- **Data export/deletion tooling** for GDPR-style requests — depends on target launch market/compliance scope, never confirmed.

**Testing convention:** Vitest for anything benefiting from dependency injection or regression coverage — mocks only the auth gate and `next/cache`'s `revalidatePath`, runs everything else against a real database. Playwright for actual UI/flow verification, always temporary per session (`npm install -D playwright --no-save`, never committed as a devDependency). **This session additionally confirmed:** if your environment can't reach a database over raw Postgres (as this sandbox couldn't reach the configured Neon instance), stand up a disposable local Postgres with `postgis`+`pgcrypto` extensions, run `prisma migrate deploy` against it, and test there instead of assuming a connection failure means a code regression.

**Working agreement:** validate every change through genuine end-to-end testing, not just typecheck/build. Report real bugs found during that testing. Stop and ask before assuming any business rule not already covered by the ADRs/specs. **Update this file before reporting any phase or milestone complete** — the gap this update had to close (§10, finding C7) was entirely avoidable.

---

## 8. Readiness Assessment

These three are genuinely different questions, and the honest answer is different for each:

- **Feature complete: Yes.** Every module named in the platform architecture blueprint is built, and every UI gap the client has flagged in real usage (mobile booking, calendar UX, city coverage, CMS control, content migration) has been addressed. There is no known missing *feature*.
- **Release ready: Not quite — close, with one urgent item.** The codebase itself builds cleanly, tests cleanly (101/101, independently re-verified this session against a real database), and every launch-blocking item that didn't need an external credential was already closed before this update. But finding **C1 (hardcoded live admin credentials) must be resolved before anyone would responsibly call this "ready to release"** — it's not a checklist gap, it's an open door. Once that's closed and the Stripe Elements checkout has been run against a real Stripe test account at least once (it never has), this would be release ready.
- **Production ready: No, and the gap is deliberate, not a failure.** Nothing in `docs/release-readiness-plan.md`'s Monitoring (§8), Backup/Recovery (§9), Load Testing (§5), or Accessibility (§6) sections has been done — no error tracking, no uptime monitoring, no confirmed Neon backup/restore procedure, no load test, no screen-reader pass. This was always the plan (the blueprint explicitly separates "feature complete" from "production hardened"), not a surprise. A real launch without at least error tracking and a confirmed backup/restore procedure would be operating blind.

**In short:** feature-complete and nearly release-ready, blocked from "release ready" by one urgent credential/security item and one significant unverified integration (Stripe Elements against a real account), and still a deliberate distance from "production ready" pending the monitoring/backup/load-testing work that was always scoped for after feature completion.

---

## 9. Future Roadmap

**Launch blockers** (must resolve before a real, paying-customer launch):
1. **Resolve finding C1** — hardcoded demo admin/host credentials. **Client has explicitly deferred rotation** (2026-07-18) — a private copy of the current login is held outside this repo and the demo workflow should keep working unchanged for now — but the passwords still need rotating (or the accounts deciding whether they belong in production at all) before a real launch. Don't rotate unilaterally; this is the client's call on timing.
2. Real Stripe test-mode credentials provisioned and the embedded Elements checkout exercised end-to-end at least once against them — including the webhook path against the real deployed URL.
3. `NEXTAUTH_SECRET` confirmed as a real, distinct-per-environment value.
4. Everything already tagged **BLOCKER** in `docs/release-readiness-plan.md` that hasn't been checked off — security headers/rate limiting are done; load testing, accessibility, monitoring, and backup/recovery are not.

**Post-launch improvements** (safe to ship after launch, real value, not urgent):
- Address findings C2 (Next.js major-version upgrade — real effort, not urgent given the mitigating no-`middleware.ts` fact, but shouldn't sit forever), C3 (decide whether `vercel-build` should re-include reference-data seeding, or document the manual step explicitly), C5 (provision a real, separate test/staging database branch — the 2026-07-18 pass added a guard against tests hitting production, not an actual second database).
- Structured application logging, business-metrics dashboard, per-listing structured data (`schema.org` JSON-LD), automated E2E in CI.

**Nice-to-have / explicitly deferred, with reasons:**
- **Resend (real email) is intentionally deferred.** The `EmailProvider` abstraction is fully built and the whole notification pipeline works today against the stub (console-logging) provider — nothing in feature development was ever blocked by this. Turning it on is a go-live decision (needs a verified sending domain) the client hasn't made yet, not a technical gap.
- **Final production Stripe configuration (live-mode keys) is intentionally deferred** until a deliberate go-live decision — test-mode verification (roadmap item 2 above) comes first regardless.
- **Automatic payout-trigger wiring is intentionally deferred** — see Outstanding Decisions in §7; this is the client's call, not a technical blocker.
- Canonical URL tags/breadcrumbs, per-listing dynamic OG images, formal penetration testing, disaster-recovery runbook — all reasonable, all genuinely post-launch.

---

## 10. Critical Review

This is an adversarial pass performed for this update, not a restatement of the sections above. Findings are ranked by severity.

**C1 — CRITICAL — Hardcoded, source-controlled admin and host credentials, almost certainly live in the production database.**
`prisma/seed.ts` creates a demo admin account (full `ADMIN` role) and a demo host account (`HOST` role) with plaintext passwords committed directly in the repository — see that file for the actual values, which are intentionally not reproduced in this or any other document as of this pass. This script is the one that seeded the 15 demo property listings visible on the live site (confirmed: its `listingsData` matches cities/listings this session cross-referenced against real production `Address` rows while building the City taxonomy), which means it has been run against the real Neon database. **Anyone with read access to this repository — a collaborator, a leaked clone, a public GitHub repo — can log into the live production admin dashboard today with full administrative privileges**, using credentials sitting in plain text in version control. This was not caught by the Phase 9 security audit because that audit verified *authorization logic* (no privilege escalation via a modified request, etc.) — it never audited *what accounts already exist with what credentials*.

**Client decision (2026-07-18, release hardening pass):** the credentials are **not being rotated yet** — the client holds a private copy of the current demo login outside this repository and wants the existing demo workflow to keep working unchanged for now. What this pass *did* do: removed the literal credential values from every doc/comment/example file that had them, and added a header comment on `prisma/seed.ts` recommending the long-term fix (move these to environment variables with generated-per-environment defaults, or gate demo-account creation out of any script that ever runs against production). Rotation itself, and the broader "should this script ever run against prod" decision, remain open — see the Future Roadmap item below.

**C2 — HIGH — Next.js 13.5.11 carries multiple unpatched high-severity CVEs; the fix is a major-version migration, not a patch.**
`npm audit` flags the pinned Next.js version against a long list of advisories, including SSRF in Server Actions (CVSS 7.5), SSRF via WebSocket upgrades (CVSS 8.6), an authorization-bypass vulnerability (CVSS 7.5), several distinct denial-of-service-via-Server-Components CVEs (CVSS 7.5 each), and HTTP request smuggling in rewrites. The available fix jumps to Next 16.2.10 — three major versions ahead, `isSemVerMajor: true`, real App Router migration work, not a drop-in bump. **Mitigating factor, genuinely worth weighing against the severity:** this app has no `middleware.ts` file at all, and every authorization check is enforced per-Server-Action/per-page via `requireAuth()`/`requireAdmin()` (re-confirmed this session, not just cited from the old Phase 9 audit) — so the specific, widely-exploited-in-the-wild Next.js CVE class (the `x-middleware-subrequest` header bypass, which only matters if authorization is enforced *in* middleware) doesn't apply here the way it would to a middleware-gated app. The DoS and SSRF CVEs, however, are framework-level and apply regardless of that architectural choice. This deserves a scheduled upgrade project, not indefinite deferral.

**C3 — MEDIUM — `vercel-build` no longer seeds reference/demo data automatically; documentation previously claimed it did.**
The current script is `prisma migrate deploy && tsx prisma/seed-cities.ts && next build`. Earlier documentation (now corrected) claimed it ran `prisma migrate deploy && prisma db seed && next build`. This appears to have changed at some point during the undocumented commit gap (§2.16) — this update's investigation could not determine whether that was a deliberate choice (e.g., to avoid re-running `seed.ts`'s demo-listing upserts on every deploy) or an accidental regression, because no session narration exists for that window. Practical consequence: if the production database were ever recreated from scratch, redeploying alone would **not** restore property types, amenities, or (see C1) the demo host/admin/listings — a manual `npm run db:seed` would be required, and this isn't documented as a disaster-recovery step anywhere. Recommend a deliberate decision (re-add it, or explicitly document the manual step) rather than leaving it as an unexplained gap.

**C4 — RESOLVED 2026-07-18.** The orphaned `/studio` Sanity Studio route (`src/app/studio/[[...tool]]/page.tsx` + layout), the root `sanity.config.ts` that only it consumed, and the Studio-only `src/lib/sanity/schemas/*` (only ever imported by that config) were deleted in the release-hardening pass — see §2.23. The `sanity`/`@sanity/vision` packages, needed only by the Studio, were dropped from `package.json`; `@sanity/client`, `@sanity/image-url`, and `next-sanity` (used for the `groq` tag by both the public read queries and the admin CMS actions) remain. `next.config.js`'s CSP header exclusion for `/studio` was removed along with it — security headers now apply to every route. Verified via a full `next build` (57 routes, down from 58) and `tsc --noEmit`, both clean.

**C5 — PARTIALLY RESOLVED 2026-07-18.** A code-level guard was added to `vitest.config.ts`: `npm test` now refuses to start unless a dedicated `.env.test` exists, or `ALLOW_TESTS_AGAINST_DOTENV=1` is explicitly set after manually confirming the ambient `DATABASE_URL` isn't production (the error message prints the resolved host specifically to make that check possible). **A real bug in that guard's first version was found and fixed during this same pass's own verification**: its env-file loader used the standard "don't clobber an already-set variable" convention uniformly, which meant that in exactly the environment finding C5 describes — `DATABASE_URL` set ambiently (Vercel, CI, and this project's own sandbox sessions all provide it this way) — creating `.env.test` stopped the guard from throwing but did *not* actually redirect the connection: tests would have silently kept running against the ambient (production) database while looking safe. Fixed by having `.env.test` specifically (not the `.env` fallback) force-override any ambient value, since redirecting the target database is the entire point of that file. Verified by creating a real `.env.test` pointing at a disposable local Postgres, confirming the guard now actually connects there (not the ambient Neon host), and re-running the full suite through it: 101/101 passing. **Still open:** no separate Neon branch or CI-provisioned test database actually exists yet — this is a safety net against running tests unsafely, not a replacement for provisioning one.

**C6 — LOW, documentation-only, fixed as part of this update.** `docs/setup/environment-variables.md` didn't mention Sanity at all (`NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `SANITY_API_TOKEN`, `SANITY_REVALIDATE_SECRET`) despite Sanity being fully load-bearing for blog/About/FAQ/Terms/Privacy content and the entire admin CMS. Added.

**C7 — Process finding, not a code issue, but the most consequential thing found in this review.** This file — the project's designated single source of truth — had fallen behind by roughly 44 commits and a full day of active development before this update, including real shipped work (an admin dashboard redesign, an entire first pass at Sanity CMS integration that a later session then replaced, a genuine open-redirect security fix, an `npm audit` remediation pass, and the "Featured places to stay" home page section that this same file had previously listed as an *unstarted* known gap). Whatever process gap allowed that — multiple sessions/agents working without a shared discipline of updating this file — is a bigger risk to project continuity than any single technical finding above. The "update this file before reporting completion" working agreement (§7) needs to actually be enforced, not just stated.

**C8 — RESOLVED 2026-07-18.** Was 21 vulnerabilities (12 moderate, 9 high), driven mostly by Sanity's dependency tree (`@sanity/uuid`/`@sanity/preview-url-secret` pulling in a vulnerable `uuid` range) plus several other transitives. Root cause found: `package.json`'s `resolutions` block (a Yarn-only feature) was pinning safe versions of these, but the project also has a committed `package-lock.json` and an npm-based install path (the README says `npm install`) — npm silently ignores `resolutions`, so none of those pins ever took effect for npm users, meaning the actual vulnerability exposure depended entirely on which package manager happened to run last. Fixed by adding a matching `overrides` block (npm's equivalent mechanism) with the same pins, plus a few more (`flatted`, `js-cookie`, `minimatch`, `picomatch`, `semver`) that `npm audit fix` surfaced once the resolutions/overrides mismatch was closed. Both `package-lock.json` and `yarn.lock` regenerated and now agree. Down to 2 vulnerabilities (1 moderate, 1 high), both inside Next.js's own vendored dependency tree and only fixable by the major-version upgrade already tracked as C2 — verified via a clean `npm audit`/`yarn audit` pass, a clean `tsc --noEmit`, and a clean `next build` (57 routes) after the change.

**C9 — Documentation debt, not a defect.** Several real architectural decisions made this session and in the reconstructed window (§2.16–§2.22) have no corresponding ADR entry — the content-split rule (Sanity vs. Postgres, §7), the City taxonomy's two-tier free-text/curated-taxonomy design, the embedded-Stripe-Elements checkout's scope boundary (instant-book only), and the custom-CMS-over-Sanity-Studio decision are all real, deliberate architectural choices that exist only in commit messages and this file, not in `docs/architecture/architecture-decision-record.md` where the project's own stated order of documentation authority says they belong. Not fixed as part of this update (out of the explicitly-scoped files for this pass — see the instruction this update was performed under) — flagged for a follow-up documentation pass.

**What's genuinely healthy, so this section isn't one-sided:** all 11 migrations apply cleanly to a freshly created database; the full test suite passes 101/101 when run against a reachable database; the production build completes cleanly with 58 routes; the CSP in `next.config.js` is already correctly scoped for both Stripe and Sanity (no drift found there, despite both being added after the CSP was originally written); the Phase 9 authorization audit's core guarantees (no `middleware.ts`, every Server Action self-gates, no client-callable internal config helpers) were spot-checked again this session against the newest code (City taxonomy actions, CMS actions) and still hold. The codebase's actual logic is in good shape — every finding above is operational, credential, or dependency-currency in nature, not a core-logic defect.
