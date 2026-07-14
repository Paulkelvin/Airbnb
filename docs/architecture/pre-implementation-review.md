# Pre-Implementation Architecture Review

**Status:** Final review pass before the architecture freeze. This is an adversarial read of the Blueprint and Domain Model Specification — the objective was to find real problems, not confirm existing decisions. Findings are tagged **CRITICAL** (fix in the docs before writing code — cheap now, expensive after), **MEDIUM** (should fix now, low cost, moderate risk if skipped), or **LOW** (correctly deferred, documented here so it isn't re-litigated).

**Outcome, stated up front:** 13 concrete findings below. All CRITICAL and MEDIUM findings have already been applied as edits to the Domain Model Specification and Blueprint (not just recommended) — see the diff summary at the end of each section. The residual items are genuine accepted technical debt, not oversights, and are listed in §12 with their mitigation. Confidence score and freeze recommendation: §12.

---

## 1. Challenging the Assumptions

Going decision by decision, honestly:

| Decision | Simplest solution? | Verdict |
|---|---|---|
| One `Listing`/`Booking` table with `rentalType`-conditional fields | Yes — the alternative (per-type tables) is more "proper" OOP but adds a join to every operation for no query benefit at this scale. **Correct call.** | Keep |
| `PaymentProvider` interface with Stripe/Paystack/Flutterwave named in the enum | The **interface** is right-sized. Naming three providers in an enum is harmless, but if the plan were to actually *build* three adapters now, that would be overengineering — you have one confirmed provider (Stripe Connect) and two speculative ones. | **Build only the interface + Stripe adapter now.** Keep the enum open (it costs nothing) but do not write `PaystackProvider`/`FlutterwaveProvider` until a real requirement exists. This was implicit in the docs but not stated — now explicit in the Implementation Roadmap (§10). |
| Sparse `Availability` table (only non-default rows) | Yes, clearly simpler than a dense per-date-per-listing table. | Keep |
| `NotificationPreference` at (user, type, channel) granularity | This is more configurability than an MVP needs — every new notification `type` requires a preference row/UI entry. | **Minor overengineering.** Recommend shipping MVP with two coarse toggles (`transactionalEmail: boolean`, `marketingEmail: boolean`) and deferring per-type granularity until users actually ask for it. Transactional notifications (booking confirmed, payment failed) should never be suppressible regardless. *(Low cost to change later — not blocking freeze, noted as a should-simplify.)* |
| No dedicated search engine at MVP | Right call — Postgres full-text + indexes genuinely is enough for the stated volumes. | Keep |
| No `HostProfile`, no `Payout` entity | Correct application of YAGNI — both are additive to introduce later. | Keep |
| Offset/limit pagination "at MVP scale" | **This is underengineering, not appropriately deferred.** Offset pagination on a growing `Listing`/`Booking` table degrades non-linearly (`OFFSET N` scans and discards N rows), and — critically — switching pagination strategy later is an API *contract* change for every consumer (URL params change shape), not an internal refactor. Cursor pagination costs almost nothing to build correctly on day one (one indexed sort key: `(createdAt, id)` or `(price, id)`) and avoids a breaking change later. | **CRITICAL — changed to cursor-based pagination from the start.** See §7. |
| Availability check described as "enforced server-side" for bookings | This sentence is true but incomplete — it doesn't say *how* concurrent requests are prevented from both succeeding. See §4. | **CRITICAL — mechanism made explicit.** |

**Technical debt knowingly accepted (stated honestly, not hidden):** the `rentalType`-conditional-field design trades compile-time safety for a simpler schema. Nothing stops application code from accidentally reading `leaseStartDate` on a `SHORT_TERM` booking (it'll just be `null`) — the database won't catch that, only a `CHECK` constraint on write, not on read. **Mitigation:** at the TypeScript layer, model `Booking` as a discriminated union (`{ rentalType: 'SHORT_TERM', checkInDate: Date, ... } | { rentalType: 'LONG_TERM', leaseStartDate: Date, ... }`) derived from the Prisma type, not the raw Prisma-generated flat type, everywhere business logic branches on `rentalType`. This is a code-level discipline requirement, not a schema change — flagging it here so it's a known rule before implementation, not a bug discovered later.

---

## 2. Database Review

**Normalization:** generally sound. `Address` is correctly split from `Listing` (1:1, not embedded). `Amenity`/`PropertyType` are correctly normalized taxonomies. Two intentional denormalizations (`Booking.hostId`, `Review.listingId`) are documented with rationale — both are legitimate query-convenience denormalizations, not accidental duplication.

**Redundant fields:** `currency` appears on `Listing`, `Booking`, and `Payment`. This looks redundant but isn't — each is a snapshot at a different point in time (listing's current currency vs. what the guest actually agreed to vs. what was actually charged), consistent with the snapshot pattern already used for price fields. **No change — reviewed and justified.**

**Missing indexes found:**
- `Payment.payerUserId` and `Payment.payeeUserId` had no indexes — needed for "my payment history" (guest) and "my earnings" (host) dashboard queries, both high-frequency reads. **Fixed.**
- `Booking` had `hostId` and `status` as separate single-column indexes but the host dashboard's actual query shape is "my active bookings, ordered by check-in" — a composite `(hostId, status, checkInDate)` serves that directly instead of relying on the planner to bitmap-AND two indexes. **Fixed.**

**Expensive relationship found:** none of the N:1/1:N relationships are individually expensive. The one query pattern worth flagging: `Listing.avgRating`/`reviewCount` recompute on every `Review` write. At the per-listing scale this is fine (dozens–hundreds of reviews per listing, not thousands), but it must be a **transactional recompute** (`SELECT`-then-`UPDATE` inside the same transaction as the `Review` insert, or a `SELECT ... FOR UPDATE` on the `Listing` row) to avoid a lost-update race when two reviews land on the same listing concurrently. This is a concurrency-correctness note for the implementation, not a schema change.

**Migration risk:** low. No entity has been shipped yet, so there's no live-migration risk at this stage — the risk profile changes once `rentalType`-conditional columns are populated in production (adding a new required field later means a backfill migration across potentially millions of rows). Worth stating as a forward-looking risk, not a current one.

**Schema simplification opportunities:** none found beyond what's already been applied — the schema is already fairly lean for what it needs to do. I looked for over-normalization (unnecessary join tables) and didn't find any; `ListingAmenity` and `ConversationParticipant` are genuine many-to-many relationships that need a join table.

**Fixes applied to the Domain Model Specification:**
1. Added `Payment.relatedPaymentId` (nullable self-FK) — a `REFUND` row previously had no way to reference which `CHARGE` row it refunds, other than inferring from amount/date. Now explicit and indexed.
2. Added `CHARGEBACK` to `Payment.type` — Stripe (and any processor) sends dispute/chargeback events distinct from a platform-initiated refund; the schema had no way to represent one.
3. Added `Listing.cancellationPolicy` (short-term: `FLEXIBLE`/`MODERATE`/`STRICT`) and `Listing.earlyTerminationPolicy` (long-term: `STANDARD`/`STRICT`) — **both were referenced in the Blueprint's Booking Lifecycle prose ("refund amount is policy-driven... a property of the listing") but were never actually added to the Listing field table.** This is a real spec inconsistency the review caught — the two documents disagreed with each other.
4. Added indexes per above.

---

## 3. Search & Performance at Scale

| Scale | Verdict |
|---|---|
| Hundreds of listings | Trivial. Any reasonable query works. |
| Thousands | Trivial with the indexes already specified. |
| Hundreds of thousands | **Fine for relational filtering (price/bedrooms/amenities/dates), starts to strain for relevance-ranked full-text + geo combined.** This is where the documented "graduate to Meilisearch/Typesense" trigger should actually fire — the Blueprint said "when it outgrows Postgres" with no concrete threshold. **Fixed:** added a concrete trigger (p95 search latency > 300ms, or > ~50k active listings in a single dense metro area) rather than a vague feeling. |
| Millions | Needs the dedicated search engine from the row above; the relational tables themselves (Postgres, correctly indexed) handle millions of rows fine — the bottleneck at this scale is search *relevance/ranking*, not raw storage or simple filtering. |

**Two corrections to the existing plan:**

1. **Geo search groundwork should happen now, not later.** The Blueprint listed PostGIS as "a candidate, not required at MVP." That's right for *building radius queries* — but enabling the PostGIS extension and storing `latitude`/`longitude` as a `geography(Point)` column (rather than two plain decimals) costs nothing today and avoids a backfill migration across a million-row `Address` table later, since "near me" search is a core discovery pattern for a rental platform, not a nice-to-have. **Fixed** — Address now specifies a `geography(Point, 4326)` column from day one; the radius *query* itself is still deferred, only the storage shape changed.
2. **`tsvector` needs a GIN index, stated explicitly** — the original doc said "full-text (tsvector) index" without specifying index type. A `tsvector` column is useless for search performance without a GIN (or GiST) index specifically; a default B-tree index doesn't support the match operators full-text search needs. **Fixed** — spelled out as GIN explicitly.

**Caching gaps found:** the Blueprint mentions ISR and Redis but never states the *invalidation* trigger. **Fixed** — added: listing writes (`modules/listings/actions.ts`) must call `revalidateTag('listing:{id}')` on publish/update/pause, otherwise ISR-cached detail pages silently serve stale data indefinitely.

---

## 4. Booking & Availability — Race Conditions

This is where the sharpest issue in the whole design was found.

**The gap:** both documents state overlap/availability checks are "enforced server-side," but neither states *how* two simultaneous booking requests for the same dates are prevented from both succeeding. A naive "check availability, then insert booking" is a textbook TOCTOU (time-of-check-to-time-of-use) race — two requests can both pass the check before either commits.

**CRITICAL fix applied:** the mechanism is now explicit in the Domain Model Specification (§2.9):
> Booking creation for `SHORT_TERM` must run inside a single database transaction that attempts to `INSERT` one `Availability` row (`status = BOOKED`) per night of the stay. The existing `unique(listingId, date)` constraint on `Availability` is the atomicity guarantee — if any night is already taken, the insert violates the constraint, the entire transaction rolls back, and the booking attempt fails cleanly with "dates no longer available." This is not an optional optimization; it is the only correct way to prevent double-booking under concurrent requests, since a separate check-then-insert is inherently racy.

The schema already had the right pieces (sparse rows + a unique constraint) — this fix just makes explicit that *this* is the concurrency-safety mechanism, not an incidental detail.

**Second race condition found and fixed (long-term):** nothing prevented two tenants from both reaching `CONFIRMED` on the same long-term listing. **Fixed** — added a partial unique index: `unique(listingId) WHERE rentalType = 'LONG_TERM' AND status IN ('CONFIRMED', 'ACTIVE')`. This encodes a business-rule assumption worth stating explicitly: **multiple `PENDING` applications are allowed for the same long-term listing (a landlord fielding several applicants is normal), but only one can reach `CONFIRMED`/`ACTIVE` at a time.** If that assumption is wrong, tell me now — it's a one-line index change either way, but it should be a decision, not a default.

**Third gap found: no idempotency key on booking creation.** A double-click on "Book Now," or a client retry after a network timeout, can currently create two bookings (and two charges) for the same intent. **Fixed** — the booking-creation server action must accept a client-generated idempotency key (UUID), store it, and return the existing booking on a duplicate key rather than creating a second one. Documented as an implementation requirement in the Booking entity's validation notes.

**Cancellation handling:** sound in design (server-computed refund, policy-driven — now that the policy fields actually exist on `Listing`, see §2). No further issues found.

**Calendar performance:** the sparse-table design means calendar reads scale with actual bookings, not date × listing — no concerns even at high listing counts.

---

## 5. Payment Architecture — Stripe Connect Review

The client confirmed: US-based, Stripe Connect first and primary. This section validates the abstraction against Stripe Connect specifically, not just in the abstract.

**Gap found — the charge/payout model was never actually decided.** The interface has both `createCharge()` and a separate `payout()` method, which implies the **"separate charges and transfers"** model (guest pays into the platform's own Stripe balance; platform explicitly initiates a transfer to the host later). But nothing in either document rules out Stripe's **destination charge** model (funds split and moved to the connected account atomically at charge time), which would make an explicit `payout()` call largely redundant — Stripe would handle it.

These are genuinely different integrations with different consequences:
- **Destination charges**: simpler to implement, but the platform *cannot* hold funds and release them later (e.g., "hold payout until check-in" as guest protection) — the connected account gets the money immediately.
- **Separate charges + transfers**: more code, but gives the platform control over payout timing — necessary if you ever want to hold a short-term payout until check-in, or hold long-term rent until a dispute window closes.

**Decision made and documented:** go with **separate charges and transfers**. It's the only model compatible with a configurable payout-timing policy, it's what the existing `payout()` method in the interface already implies, and it's the standard pattern for marketplaces that want any buyer-protection window. This has been added explicitly to the Blueprint's Payment Architecture section — it was implied but never stated.

**Stripe Connect account type — also never specified, now decided:** recommend **Stripe Express** accounts for hosts. Rationale: Stripe-hosted onboarding (Account Links/Embedded Components) means the platform never stores or handles KYC data (SSN, DOB, bank details) — this is a real strength of the current design (no `HostProfile` KYC fields, just an opaque `payoutAccountRef`) and Express is the account type that matches that intent most cleanly (faster/simpler onboarding than Standard, less platform liability than Custom). Documented in the Blueprint.

**Webhook robustness — three concrete gaps found and fixed:**
1. `Payment.providerTransactionRef` being unique gives idempotency for the *row*, but the doc never stated that the **handler's side effects** (notification sends, status transitions) also need duplicate-delivery protection — Stripe explicitly does not guarantee exactly-once delivery. **Fixed**: webhook handler must check for an existing `Payment` with that `providerTransactionRef` and `status = SUCCEEDED` and short-circuit (return 200, do nothing) before re-running any side effect.
2. Stripe does not guarantee webhook delivery order. A state machine driven naively by "whatever event arrived" can process a stale event after a newer one. **Fixed**: noted that webhook handlers should treat events as "a fact happened," not "apply this diff" — i.e., re-derive booking/payment status from the *current* state of the referenced object where ambiguity is possible, rather than blindly trusting event ordering.
3. **Chargebacks/disputes were entirely unhandled** — `charge.dispute.created` is a distinct event from a platform-initiated refund and nothing in `Payment.type` represented it. **Fixed** — `CHARGEBACK` added to the enum (§2 above); a disputed charge should also flag the related `Booking` for admin review, not silently continue its normal lifecycle.

**Abstraction leak found:** `createCharge(amount, currency, payerRef, metadata)` — an unconstrained `metadata` bag risks calling code passing Stripe-shaped assumptions into what's supposed to be a provider-agnostic interface. **Fixed** — the interface now defines a normalized metadata contract (`{ bookingId, paymentType }`) as part of its own type, rather than "whatever shape the caller wants," so a future Paystack/Flutterwave adapter isn't secretly expecting Stripe-specific keys.

**Overall verdict on the abstraction:** structurally sound and genuinely swappable — no method name or parameter leaks a Stripe concept (no `paymentIntentId`, no `applicationFeeAmount`). With the fixes above, confident a second adapter could be added without touching `modules/booking` or `modules/payments` business logic, only `lib/payments/`.

---

## 6. Security Review

| Area | Finding | Status |
|---|---|---|
| Authentication | NextAuth relocation to the correct App Router path already planned (prior audit). Password-reset flow was never mentioned in either document. | **Added** — forgot-password flow (token-based, single-use, time-limited, rate-limited) is now listed as required in Auth phase scope. |
| Authorization | `lib/auth.ts` centralization is the right call, but nothing enforced that every Server Action actually calls it. | **Fixed** — Blueprint now states the pattern explicitly: `requireRole()`/`requireOwnership()` guard calls must be the first line of every mutating Server Action, not optional. |
| Audit logging | `AuditLog` was scoped to admin actions only. For a platform moving money, security-relevant *user* actions (failed logins, password changes, payout-account changes) matter too for fraud investigation. | **Fixed** — `AuditLog`'s documented scope broadened to include sensitive security events, not only admin actions; `actorId` already nullable, no schema change needed, just scope clarification. |
| Abuse/spam prevention | Mentioned once in passing ("rate limiting on public endpoints") with no concrete mechanism or list of protected endpoints. | **Fixed** — named the specific endpoints needing protection (signup, `Inquiry` creation, `Message` creation, `Review` submission) and the mechanism (Redis-backed sliding-window limiter, `lib/rate-limit.ts`, called from the same guard pattern as authorization). |
| File upload security | `Image.url` existed with no stated validation path. Untrusted file upload is a real attack surface (malicious file masquerading as image, oversized files, EXIF GPS leakage). | **Fixed** — documented required pattern: presigned direct-to-S3 upload URLs (never proxy raw file bytes through the Next.js server), server-side content-type/size validation before issuing the presigned URL, and EXIF stripping during the async resize step (already planned) — both for storage hygiene and to avoid leaking a host's precise GPS location beyond what they intended to disclose. |
| Payment security | PCI scope claim (SAQ-A via hosted Elements) is sound *if* actually followed. | **Fixed** — added an explicit rule to the Blueprint: a raw card-number `<input>` must never be built, full stop — this is precisely Chisfis's original defect, and it needs to be a stated rule, not an assumption, given a template with that exact anti-pattern already exists in the repo history. |
| API/Server Action security | Next.js Server Actions have built-in origin-checking (CSRF-equivalent) — worth confirming rather than assuming, and they have no built-in rate limiting, which ties back to the abuse-prevention gap above. | Noted, ties to the fix above. |
| Sensitive data | No SSNs/bank details are ever stored locally (Stripe-hosted onboarding handles KYC) — this is a genuine strength, confirmed correct, no change needed. | Confirmed, no gap |

---

## 7. API (Server Action) Review

**Structure:** the module-boundary rule (§13 of the Blueprint) is sound — no changes needed.

**Gap found — no standardized error contract.** Nothing specifies what a Server Action returns on an *expected* failure (validation error, "dates no longer available," "insufficient permissions") versus an *unexpected* one (DB connection lost). Throwing for both means expected, common failures produce Next.js's generic error boundary — bad UX for something as routine as "someone else booked those dates first." **Fixed** — standardized on a `Result<T>` return shape (`{ success: true, data } | { success: false, error: { code, message, fieldErrors? } }`) for all expected-failure paths; only genuinely unexpected errors should throw and hit the error boundary. Added to Blueprint §13.

**Pagination:** already addressed in §1/§3 — cursor-based from day one, not offset.

**Filtering/sorting:** the URL-param design is sound, no changes.

**Versioning:** correctly deferred — no public API exists yet to version.

---

## 8. Folder Structure Review

The `app/` (thin routing) + `modules/` (domain logic) + `components/ui` + `lib/` split holds up well and is standard practice for App Router at this project size. One real gap found:

**Missing: no home for background/scheduled jobs.** Both documents reference "a scheduled job" repeatedly — flipping `CheckedIn`→`Completed`, generating monthly rent charges, expiring the review double-blind window, expiring stale `Inquiry` rows — but no folder in the proposed structure owns this concern. **Fixed** — added a top-level `src/jobs/` directory to the Blueprint's folder tree, one file per scheduled task, each calling into the relevant module's actions (never containing business logic itself) — keeps the "modules own their logic" rule intact while giving recurring work an explicit home instead of it accidentally accreting somewhere in `modules/booking`.

**Secondary gap:** no testing convention was stated anywhere. Given money and booking-state-machine logic is the highest-risk code in this system, recommend co-located `*.test.ts` files per module (not a separate mirrored `__tests__/` tree) — added as a note, not enforced by folder structure itself, so it's a documented convention rather than a schema-level concern.

`prisma/schema.prisma` as a single file is fine at 15 entities — not a real concern at this size, correctly left as-is.

---

## 9. Chisfis Cleanup Plan

Already thoroughly specified in Blueprint §16 (reused/rewritten/removed lists) and the original technical assessment. Reviewed for completeness — found it accurate and didn't duplicate it here. Two refinements:

1. **Sequencing**: dependency removal and dead-code deletion (Line Awesome font, dead `api/hello/` files, the leaked Maps API key) should happen at the *start* of the cleanup phase, before any new module scaffolding begins — new code should never be written importing something already flagged for deletion. This is now the explicit first sub-step of Roadmap Phase 1 (§10).
2. **Minor addition**: `react-hooks-global-state` (used only for the dark-mode toggle) could be replaced by the simpler, purpose-built `next-themes` package — low priority, not blocking, noted as a nice-to-have during cleanup rather than a required change.

---

## 10. Implementation Roadmap — Reviewed and Re-sequenced

Your proposed 15-phase order is fundamentally sound (foundation → auth → core domain → search → transactional flow → payments → admin → polish). Five concrete sequencing risks found:

| # | Issue | Fix |
|---|---|---|
| 1 | **Search (6) is scheduled before Availability (7)**, but availability-aware date filtering is a core part of search per the Domain Model Spec (§3) — building search first means either building it incomplete or building it twice. | **Swap order: Availability management before Search.** |
| 2 | **Rental workflows (8, i.e. real Booking creation) precede Payments (11)**, but a booking's `Pending`→`Confirmed` transition is inherently payment-coupled in this design — you can't fully build/test the booking state machine without *some* payment step. | Build phase 8 against a `MockPaymentProvider` (a test-double adapter that fakes success/failure) — validates the state machine AND dog-foods the `PaymentProvider` abstraction early, before phase 11 swaps in the real `StripeConnectProvider`. This is a net win, not just a workaround: it's the cheapest possible proof that the abstraction is real. |
| 3 | **Notifications (13) come very late**, but booking confirmation, new-message, and review-received notifications are referenced by phases 8–10. | Build a minimal `notify()` primitive (writes a `Notification` row, no email delivery yet) alongside Auth (phase 3) as shared infrastructure; defer only email templates/delivery polish and the preferences UI to phase 13. |
| 4 | **"Performance optimization" as phase 14** risks being read as "add the indexes we skipped." | Clarified: all indexes and denormalization decisions in the Domain Model Spec belong in the Prisma schema at **phase 2**, not phase 14. Phase 14 is load-testing and query tuning under real traffic patterns, not a catch-up phase for correctness-relevant indexes. |
| 5 | **Connection pooling for serverless Postgres access is currently framed as a "later" scalability concern** (Blueprint §15), but a serverless Next.js deployment without pooling exhausts Postgres's connection limit at a *far* lower concurrency than the "1M listings" scale this section is nominally about — likely at low thousands of concurrent users, not millions of listings. | **Moved into phase 2** — PgBouncer, Prisma Accelerate, or the hosting provider's built-in pooling (e.g. Neon/Supabase) must be part of the initial database setup, not a later addition. |

**Revised phase order** (changes from your list bolded):

1. Chisfis cleanup and project restructuring (dependency/dead-code removal first, per §9)
2. Prisma schema and PostgreSQL database (**with connection pooling and all indexes from the Domain Model Spec included now, not deferred**)
3. Authentication and role system (**+ minimal `notify()` primitive as shared infra**)
4. Property listing CRUD
5. Image upload and media management
6. **Availability management** *(moved up)*
7. **Search and filtering** *(moved down, now built against real availability data)*
8. Short-term and long-term rental workflows (**against a `MockPaymentProvider`**)
9. Messaging
10. Reviews and favorites
11. Stripe Connect payments and payouts (**swap `MockPaymentProvider` → `StripeConnectProvider`**, separate-charges-and-transfers model, Express accounts)
12. Admin dashboard
13. Notifications (email delivery + preferences UI — the primitive already exists from phase 3)
14. Performance optimization (load testing/tuning, not a correctness catch-up)
15. Final testing and production readiness

---

## 11. Future Scalability — 100,000 Users, 1,000,000 Listings

At this scale, walking through each layer honestly:

- **Relational storage**: not a bottleneck. Postgres handles hundreds of millions of correctly-indexed rows without architectural changes. 1M listings × ~15 images ≈ 15M `Image` rows, entirely reasonable.
- **The actual first bottleneck: database connections**, not listing count (see Roadmap fix #5 above) — this is the one item pulled forward from "later" to "now" because the numbers don't support deferring it.
- **Search relevance/ranking**: the real 1M-listing bottleneck. The documented Postgres→dedicated-search-engine migration path (behind `searchListings()`) is the correct answer — nothing new to add here beyond the concrete trigger threshold already specified in §3.
- **Geo search**: addressed in §3 (store as `geography(Point)` now, build radius queries when needed) — this is specifically a "plan now, build later" item, not "plan and build later," because the storage shape is the part that's expensive to retrofit.
- **Media storage**: ~1M listings × 15 images × ~500KB ≈ 7.5TB — trivial for S3-class storage; CDN egress cost is a finance conversation, not an architecture risk.
- **Background job throughput**: at 1M+ long-term leases, the monthly rent-charge job needs to process a large batch reliably (idempotent, resumable, alerting on partial failure) — this is an operational maturity concern for whichever job runner is chosen (§8's new `jobs/` home), not a schema concern. Worth a monitoring/alerting investment when phase 11 (payments) ships, not before.

**Plan now vs. later, summarized:**
| Plan now | Plan later |
|---|---|
| Connection pooling (phase 2) | Dedicated search engine migration (triggered by the §3 threshold) |
| Geo storage shape (`geography` column) | Actual radius query implementation |
| All indexes in the initial schema | Read replicas (only once read load actually demands it) |
| Cursor pagination | CDN cost optimization |
| Background job home (`jobs/`) | Job-runner sophistication (retries/alerting can start simple, harden later) |

---

## 12. Final Architecture Review

**Would definitely keep:**
- The unified `Listing`/`Booking` model with `rentalType`-conditional fields — still the right call after adversarial review.
- The `PaymentProvider` abstraction shape — validated against Stripe Connect specifically, holds up with the fixes in §5.
- URL-driven search state, module-boundary rule, role-based route groups, sparse `Availability` table.
- The decision to *not* build `HostProfile`/`Payout`/multiple listing-type tables — genuine YAGNI applied correctly.

**Redesigned before implementation (all applied as edits, see per-section summaries above):**
- Missing `cancellationPolicy`/`earlyTerminationPolicy` fields (spec inconsistency between the two docs).
- Missing `Payment.relatedPaymentId` and `CHARGEBACK` type.
- Unstated booking-concurrency mechanism (now explicit).
- Missing long-term one-active-booking-per-listing constraint.
- Missing booking-creation idempotency key.
- Undecided charges-vs-transfers payment model (now decided: separate charges + transfers).
- Undecided Stripe Connect account type (now decided: Express).
- Offset pagination (now cursor-based).
- Missing background-jobs folder.
- Missing Server Action error contract.
- Under-specified webhook robustness (duplicate delivery, ordering, chargebacks).
- Under-specified rate-limiting/file-upload/audit-log security scope.
- Connection pooling deferred to "later" when it shouldn't be.

**Can safely wait (documented, not forgotten):**
- Dedicated search engine (Postgres is genuinely sufficient until the stated threshold).
- Geo radius query implementation (storage shape is ready; the query isn't needed yet).
- Read replicas.
- Per-notification-type preference granularity (ship coarser toggles first).
- Payout batching / dedicated `Payout` entity.
- `HostProfile` split.
- Itemized security-deposit deduction records.
- Multiple `PaymentProvider` adapters beyond Stripe.

**Risks that still exist even after every fix above (accepted, not solved by architecture alone):**
1. Recurring long-term rent charging is only as reliable as the job runner executing it on schedule — needs monitoring/alerting from the day it ships, not just correct code.
2. The `rentalType`-conditional-field design still requires ongoing developer discipline (discriminated-union typing at the application layer) to avoid cross-type field-access bugs — mitigated, not eliminated, by convention.
3. Stripe Express onboarding completion/drop-off is a product risk, not an architecture one — no schema fixes that.
4. Trust & safety (fraudulent listings, fake bookings) requires ongoing operational moderation; the admin tooling enables this but doesn't automate it away.
5. The double-blind review window and other time-based state transitions all depend on the same job-runner reliability as risk #1 — worth treating job-runner observability as a first-class concern once phase 3 introduces it, not an afterthought.

**Overall confidence score: 8/10.**

Not a 10 — a genuinely adversarial pass found 13 concrete, real issues, several with actual correctness implications (the double-booking race condition mechanism and the missing cancellation-policy field chief among them). That's the expected, healthy outcome of this kind of review, not a failure of the prior work — finding nothing would have been more concerning than finding this. Not lower than 8, either: nothing found required a structural redesign — every fix was an addition (a field, an index, an explicit mechanism, a documented decision) layered onto a design that was already fundamentally sound. The two source documents have been updated in place with every CRITICAL and MEDIUM fix above; nothing here is a recommendation still waiting to be applied.

**Is the architecture ready for production implementation? Yes**, with the fixes in this document already applied to the Blueprint and Domain Model Specification. Recommend proceeding to freeze per §13 of your request.

---

## 13. Freeze Declaration

As of this review, the **Platform Architecture Blueprint** and **Domain Model Specification** (both updated with the fixes above) are the project's frozen source of truth. From this point forward:

- No new architecture documents unless implementation surfaces a genuine design gap — not a preference change.
- Every implementation decision is checked against these two documents, not re-derived.
- Deviations discovered during implementation get resolved as a targeted update to the relevant document (with rationale, same as every entry in the Design Decisions Log), not a silent code-level workaround.
- Implementation proceeds module by module, in the revised 15-phase order from §10, starting with Chisfis cleanup and project restructuring.
