# Architecture Decision Record (ADR)

**Status:** Frozen alongside the Platform Architecture Blueprint and Domain Model Specification. This is the historical record of *why* the architecture looks the way it does — the other two documents state the decisions; this one preserves the reasoning, the alternatives that lost, and the conditions under which a decision should be revisited. When implementation raises a question already answered here, the answer is here — don't re-derive it.

Each entry follows: Decision · Reasoning · Alternatives Considered · Why Rejected · Trade-offs Accepted · Revisit If.

---

## ADR-001: Single Vertical — Property Rentals Only

**Decision:** The platform supports residential and commercial property rentals only. No cars, experiences, flights, or other Chisfis-template verticals.

**Reasoning:** The original Chisfis technical assessment found that supporting five listing verticals (Stay/Car/Experience/Flight/RealEstate) was the direct cause of nearly all type and component duplication in the template (four parallel `DataType` interfaces, four near-identical card components, no shared abstraction). Narrowing scope removes the duplication at its root instead of managing it.

**Alternatives Considered:** Keep all Chisfis verticals and build a generic multi-vertical listing engine.

**Why Rejected:** No confirmed business need for non-property verticals. A generic engine flexible enough for cars *and* real estate *and* experiences would need to abstract over fundamentally different domains (VIN numbers vs. square footage vs. group size) — pure speculative generality with no current requirement driving it.

**Trade-offs Accepted:** If the business ever expands into a genuinely different vertical (e.g. equipment rental), that's a new listing type requiring new modeling work, not a flag flip — this was accepted deliberately over pre-building a generic engine for verticals that don't exist yet.

**Revisit If:** A second, genuinely different vertical becomes a confirmed business requirement — at that point, re-evaluate whether `Listing`'s `rentalType` pattern (ADR-002) extends to a third discriminator value or whether the new vertical needs its own model entirely.

---

## ADR-002: Unified `Listing` Model with `rentalType`-Conditional Fields

**Decision:** One `Listing` table serves both short-term and long-term rentals via a `rentalType` enum (`SHORT_TERM` | `LONG_TERM`) plus two groups of conditionally-required/forbidden fields on the same row, validated by a Zod discriminated union at the application layer and a DB `CHECK` constraint as a safety net.

**Reasoning:** Client's explicit instruction: build a single, unified Property Listing model; avoid premature abstraction or polymorphic designs for transaction types not being implemented. Shared fields (title, description, images, amenities, address) genuinely are identical across both rental types — only pricing/terms differ.

**Alternatives Considered:**
1. Separate `ShortTermListing`/`LongTermListing` tables (or a shared base with per-type detail tables).
2. A fully generic/polymorphic `Listing` with a JSON `attributes` blob for type-specific fields.

**Why Rejected:**
1. Reintroduces a join on every listing read/write for no query benefit, and drifts toward the table-per-type inheritance pattern explicitly ruled out by the client.
2. A JSON attributes blob loses schema validation, type safety, and indexability on the very fields (`nightlyPrice`, `monthlyRent`) that need to be filtered and sorted on in search — the worst of both worlds for a field set that's actually small and well-known (not truly dynamic/user-defined).

**Trade-offs Accepted:** Every row has ~13 nullable columns that are irrelevant to it (short-term columns are null on long-term listings and vice versa) — a normalization purist's objection, accepted because the alternative costs more in practice than it saves. More significantly: nothing at the database level stops application code from reading a long-term-only field on a short-term listing (it'll just be `null`, silently) — this is real, accepted technical debt, mitigated by requiring a TypeScript discriminated union (not the raw Prisma flat type) at every point business logic branches on `rentalType`.

**Revisit If:** The nullable-column count grows uncomfortably large (a third rental type would roughly double it), or a field genuinely needs per-row dynamic shape (not just "one of two known sets") — at that point, per-type detail tables become the better trade.

---

## ADR-003: Unified `Booking` Model, Same Pattern as `Listing`

**Decision:** One `Booking` entity covers both a short-term reservation and a long-term lease, with `rentalType` snapshotted from the listing at creation and the same conditional-field pattern as ADR-002.

**Reasoning:** Consistency with ADR-002's rationale — the shared lifecycle scaffolding (Pending → Confirmed → Cancelled, payment linkage, guest/host relationship) is identical regardless of rental type; only the date semantics and a handful of fields (nights vs. lease term, nightly rate vs. monthly rent) differ.

**Alternatives Considered:** Separate `Booking` and `Lease` entities, sharing a common base via inheritance or a shared interface only.

**Why Rejected:** Would duplicate the payment-linkage, cancellation, and dispute-handling logic across two entities, or require the exact polymorphic base the client ruled out for `Listing`. `rentalType` is snapshotted (not a live FK-derived value) specifically so a later listing edit can never retroactively change an existing booking's rules — this was a deliberate design choice, not an oversight.

**Trade-offs Accepted:** Same discriminated-union discipline requirement as ADR-002. Status enum has type-specific valid subsets (`CHECKED_IN` only makes sense for short-term, `ACTIVE`/`TERMINATED_EARLY` only for long-term) enforced by application logic, not the schema — a state-machine bug here is a correctness risk, mitigated by centralizing all transitions through one `canTransition(current, next, rentalType)` function, never ad hoc status writes scattered across modules.

**Revisit If:** Same trigger as ADR-002.

---

## ADR-004: Short-Term + Long-Term Rental Support, Confirmed Scope

**Decision:** The platform supports exactly two transaction types — short-term (nightly/weekly, availability calendar) and long-term (monthly/annual lease, recurring rent) — and no others (no property sales, no commercial-lease-specific terms beyond what long-term already covers).

**Reasoning:** Direct client decision after an explicit clarifying question, made because guessing the business model would have meant rebuilding the Booking/Payment/pricing model rather than refining it.

**Alternatives Considered:** Single rental type only (short-term or long-term, not both); full multi-model support including sales and commercial leasing.

**Why Rejected:** Single-type was rejected by the client directly — both are genuine business requirements. Full multi-model (including sales/commercial) was explicitly ruled out by the client as premature — "do not build generic support for... business models we are not implementing."

**Trade-offs Accepted:** See ADR-002/003 — this decision is what makes the conditional-field pattern necessary in the first place, rather than a simple single-purpose `Listing`/`Booking`.

**Revisit If:** Property sales or commercial leasing become confirmed requirements — re-open ADR-002/003's "revisit if" conditions at the same time, since a third transaction type is exactly the point where the flat conditional-field pattern stops paying for itself.

---

## ADR-005: Stripe Connect — Separate Charges and Transfers (Not Destination Charges)

**Decision:** Guest payments are charged to the platform's own Stripe balance; the platform explicitly initiates a `transfer`/`payout` to the host's connected account on a configurable schedule, rather than using Stripe's destination-charge model (atomic split at charge time).

**Reasoning:** Found during the pre-implementation review that this decision had never actually been made explicit, despite the `PaymentProvider` interface already implying it (a standalone `payout()` method only makes sense in this model). Destination charges move funds to the connected account immediately and cannot be held — incompatible with any buyer-protection policy (e.g., "hold payout until check-in," or holding long-term rent through a dispute window).

**Alternatives Considered:** Stripe destination charges (`transfer_data.destination` + `application_fee_amount` on the PaymentIntent).

**Why Rejected:** Simpler to implement, but structurally cannot support delayed/held payouts — the funds are gone from the platform's control the instant the charge succeeds. Since payout-timing flexibility is a stated design goal (referenced in the Booking Lifecycle's cancellation/refund handling), this was disqualifying, not just a minor trade-off.

**Trade-offs Accepted:** More integration code than destination charges (explicit transfer calls, tracking platform balance, handling transfer failures) in exchange for payout-timing control. The platform temporarily holds guest funds in its own Stripe balance, which carries slightly more operational responsibility (e.g., ensuring available balance before initiating transfers) than the hands-off destination-charge model.

**Revisit If:** The business decides payout timing never needs to be held/delayed for any policy reason — at that point destination charges would be a legitimate simplification. Unlikely given marketplace buyer-protection norms, but recorded as a real alternative, not a strawman.

---

## ADR-006: `PaymentProvider` Abstraction Interface

**Decision:** All booking/payment business logic calls a `PaymentProvider` interface (`createCharge`, `refund`, `createPayeeAccount`, `payout`, `verifyWebhookSignature`, `parseWebhookEvent`) with a normalized `metadata` contract; concrete gateways are adapters behind it. Only the Stripe Connect adapter is built at MVP — Paystack/Flutterwave remain named in the `Payment.provider` enum but are not implemented until a real requirement exists.

**Reasoning:** Explicit client requirement: booking/payment logic must not be tightly coupled to one gateway, so providers like Paystack or Flutterwave can be added later "with minimal changes."

**Alternatives Considered:** Call the Stripe SDK directly from booking/payment business logic; build all three adapters (Stripe, Paystack, Flutterwave) now.

**Why Rejected:** Direct SDK calls would violate the client's explicit requirement and make a future second provider a rewrite, not an addition. Building three adapters now against one confirmed provider is speculative effort with no current payoff — pure YAGNI violation in the other direction.

**Trade-offs Accepted:** The interface must stay deliberately small and gateway-agnostic in its method names and parameter shapes (already a discipline requirement — see the "abstraction leak" fix in the pre-implementation review, where an unconstrained `metadata` bag was tightened to a normalized shape). This constrains how provider-specific features can be exposed — a gateway-specific capability with no equivalent elsewhere either doesn't get used, or forces an interface extension, both deliberate friction to keep the abstraction honest.

**Revisit If:** A second payment provider becomes a real, scheduled requirement — implement its adapter against the existing interface first, and only widen the interface if the new provider genuinely can't be expressed through it (a signal the abstraction was wrong, not just unused).

---

## ADR-007: Stripe Connect Account Type — Express

**Decision:** Hosts onboard via Stripe Express connected accounts.

**Reasoning:** Stripe-hosted onboarding (Account Links / Embedded Components) means the platform never collects or stores KYC data (SSN, DOB, bank account details) itself — this is what makes `User.payoutAccountRef` sufficient as the only payout-related field on `User`, with no separate KYC storage or compliance surface.

**Alternatives Considered:** Stripe Standard (host manages their own full Stripe dashboard/relationship), Stripe Custom (platform fully controls onboarding UI and owns more liability/compliance surface).

**Why Rejected:** Standard is slower to onboard casual hosts and gives the platform less control over the host experience (host effectively has their own independent Stripe relationship). Custom would require the platform to build its own KYC collection UI and take on materially more compliance liability — disproportionate for the current stage.

**Trade-offs Accepted:** Less UI/branding control over the onboarding flow than Custom would allow (Express onboarding is Stripe-hosted, with limited platform customization). Accepted in exchange for materially lower compliance burden and faster time-to-first-host.

**Revisit If:** The platform reaches a scale/maturity where full white-labeled onboarding UX becomes a competitive requirement, and the team is prepared to take on the associated KYC/compliance responsibility of Custom accounts.

---

## ADR-008: PostgreSQL + Prisma

**Decision:** PostgreSQL as the database, Prisma as the ORM.

**Reasoning:** Matches the DB-readiness recommendation from the original Chisfis technical assessment; Next.js App Router (Server Components/Server Actions) pairs naturally with Prisma's generated client; Postgres has first-class support for everything the domain model needs (full-text search via `tsvector`, `CHECK` constraints, partial indexes, PostGIS for geo).

**Alternatives Considered:** MySQL, a document store (MongoDB), Supabase-managed Postgres specifically (vs. self-managed/other-hosted Postgres), a lighter query builder (Drizzle, Kysely) instead of Prisma.

**Why Rejected:** MySQL lacks the same maturity for partial indexes, `CHECK` constraints on complex conditions, and native geo support (PostGIS) that several Domain Model decisions rely on directly (ADR-002's `CHECK` constraint, ADR-011's concurrency mechanism, ADR-014's geo storage). A document store fights against a domain that is genuinely relational (bookings, payments, and reviews all have real foreign-key integrity requirements — the two-sided review uniqueness constraint in particular depends on this). Prisma vs. Drizzle/Kysely was closer, but Prisma's schema-as-source-of-truth model and generated types match the "schema defines the contract" approach used throughout the Domain Model Specification more directly; a lighter query builder becomes more attractive if raw query performance ever becomes a bottleneck Prisma can't tune around.

**Trade-offs Accepted:** Prisma's generated flat types are exactly what ADR-002/003 require discriminated-union wrapping around — an accepted, ongoing discipline cost, not a one-time one.

**Revisit If:** A specific query pattern proves un-tunable through Prisma (rare, but possible for very hot paths at large scale) — the fix there is typically a targeted raw query for that one path, not a wholesale ORM swap.

---

## ADR-009: NextAuth (Auth.js) for Authentication

**Decision:** Keep NextAuth as the authentication library; fix its Chisfis-era misconfiguration (relocate from the Pages Router-style dead file to a proper App Router `route.ts` handler) rather than replace it.

**Reasoning:** Already a dependency with a real, working provider configuration (Google + GitHub OAuth) sitting in the Chisfis codebase — the defect is purely structural (wrong file location/convention), not a fault in the library choice itself.

**Alternatives Considered:** Replace with Lucia, Clerk, or a fully custom session implementation.

**Why Rejected:** No functional deficiency in NextAuth was found that would justify a swap — the existing provider config is reusable once relocated. Clerk introduces a third-party hosted dependency and recurring cost for functionality NextAuth already provides for free; a fully custom implementation is pure reinvention with no stated requirement driving it.

**Trade-offs Accepted:** NextAuth's session/role model needs to be extended for this platform's non-exclusive multi-role `User.roles` design (ADR from Domain Model §2.1) — NextAuth doesn't natively model "roles as a set" out of the box, so this is custom logic layered on top, not a NextAuth built-in.

**Revisit If:** NextAuth's App Router support or session model proves genuinely inadequate for the multi-role requirement once implementation starts — currently assessed as sufficient, not yet proven insufficient.

---

## ADR-010: Cursor-Based Pagination (Not Offset/Limit)

**Decision:** Search and listing endpoints use cursor-based pagination (an indexed sort key, e.g. `(createdAt, id)`) from the start, not offset/limit.

**Reasoning:** Found during the pre-implementation review that the original draft deferred this as an "if volume demands it later" concern — but pagination strategy is part of the URL/API contract. Offset pagination also degrades non-linearly as the table grows (`OFFSET N` scans and discards N rows), unlike cursor pagination.

**Alternatives Considered:** Offset/limit pagination, deferred to cursor-based only once listing volume actually demands it.

**Why Rejected:** Switching pagination strategy later isn't an internal refactor — every URL a client (browser tab, bookmark, shared link) has open uses the old param shape, and cursor pagination's implementation cost on day one is nearly identical to offset's. There's no genuine "simpler now, harder later" trade-off here — cursor is close to free at this stage and offset gets more expensive to leave in place the longer it ships.

**Trade-offs Accepted:** Cursor pagination doesn't support "jump to page 7" UX patterns as naturally as offset does (no direct random access to an arbitrary page number) — acceptable, since infinite-scroll/"load more" is the more common pattern for a listing search results grid anyway.

**Revisit If:** A confirmed product requirement needs numbered-page jump navigation specifically — at that point, a hybrid (cursor internally, with an approximate page-number UI layered on top) is the more likely fix, not a full reversion to offset.

---

## ADR-011: Availability Concurrency Strategy — Transactional Insert Against a Unique Constraint

**Decision:** Short-term booking creation runs inside a single database transaction that attempts to `INSERT` one `Availability` row (`status = BOOKED`) per night of the stay; the existing `unique(listingId, date)` constraint is the atomicity guarantee — a violation aborts the whole transaction and fails the booking cleanly. Long-term booking exclusivity is enforced by a partial unique index (`unique(listingId) WHERE rentalType = 'LONG_TERM' AND status IN ('CONFIRMED','ACTIVE')`).

**Reasoning:** Found during the pre-implementation review that "enforced server-side" was stated without specifying the actual mechanism — a plain "check availability, then insert booking" is a textbook time-of-check-to-time-of-use race condition: two concurrent requests can both pass the check before either commits, double-booking the same dates.

**Alternatives Considered:** Application-level "check then insert" without a DB constraint backstop; a Postgres exclusion constraint using `daterange` overlap (`EXCLUDE USING gist`) instead of per-night rows; pessimistic row-level locking (`SELECT ... FOR UPDATE`) on the listing during booking creation.

**Why Rejected:** Check-then-insert alone is racy by construction, full stop. The `daterange` exclusion constraint is arguably more elegant for pure overlap prevention, but the sparse per-night row design (ADR from Domain Model §2.7) was already chosen for a second reason — per-night price overrides — and switching to range-based exclusion would give up that capability or require maintaining both structures. Row-level locking works but serializes all booking attempts on a listing even for non-conflicting date ranges, which the constraint-based approach avoids (only actually-conflicting inserts fail).

**Trade-offs Accepted:** Requires application code to always insert per-night rows inside a proper transaction and treat a unique-constraint violation as an expected, handleable outcome ("dates unavailable"), not an unexpected database error — a discipline requirement for anyone writing booking-creation code, not automatic.

**Revisit If:** Per-night price overrides are ever removed as a feature, at which point the `daterange` exclusion constraint alternative becomes worth reconsidering purely on overlap-prevention elegance.

---

## ADR-012: Folder Architecture — `modules/` by Domain, `app/` as Thin Routing

**Decision:** `src/app/` contains only routing (role-based route groups: `(guest)/`, `(host)/`, `(admin)/`) with no business logic; `src/modules/` holds one folder per domain (listings, booking, payments, messaging, etc.), each exposing only its `actions.ts`/`queries.ts` as a public surface that other modules must call through rather than reaching into another module's Prisma model directly. A `src/jobs/` folder (added during the pre-implementation review) owns scheduled/background task orchestration.

**Reasoning:** Keeps each domain module independently reasoned-about and makes a future service extraction (e.g., pulling search or payments into its own service) a boundary that already exists in the code, rather than one that has to be carved out under pressure later. Route-group-per-role replaces Chisfis's route-group-per-listing-category pattern, consistent with ADR-001's single-vertical decision (no more need for a routing structure organized around five listing types).

**Alternatives Considered:** Chisfis's original route-group-per-category structure retained; a flatter structure with no `modules/` layer (business logic living directly in `app/` route handlers/components); a fully layered architecture (separate `domain/`, `application/`, `infrastructure/` folders per module, DDD-style).

**Why Rejected:** Category-based routing has no meaning once there's one listing type with a rental-type flag, not five categories. A flat structure with logic in `app/` was rejected because it's exactly the pattern that made Chisfis hard to reason about — no enforced boundary between "what a page does" and "what the domain does." A fully layered DDD structure was considered too heavy for the project's current size — the module-boundary rule already gets most of the benefit (independent reasoning, clear ownership) without the ceremony of enforcing distinct domain/application/infrastructure layers inside every module.

**Trade-offs Accepted:** The module-boundary rule ("never import another module's Prisma model directly") is a convention enforced by discipline and code review, not by the type system or a build-time check — it can be violated silently unless actively watched for.

**Revisit If:** The module count or team size grows to where boundary violations become a recurring real problem — at that point, a lint rule (e.g., dependency-cruiser or similar) enforcing the module-boundary rule mechanically becomes worth the setup cost.

---

## ADR-013: Search Architecture — URL as Source of Truth, Postgres First, `rentalType` as a Primary Facet

**Decision:** All search/filter state lives in URL query parameters, parsed server-side (never client `useState` driving results); `rentalType` is a required top-level parameter that determines which secondary filters render and which query branch runs, both resolving through one `searchListings(params)` function. Postgres (full-text `tsvector` + GIN index, standard B-tree/partial indexes, `geography(Point)` column with GIST index) is the search engine at MVP; a dedicated engine (Meilisearch/Typesense/Algolia) is a documented, not-yet-triggered scale path behind the same function signature.

**Reasoning:** Directly fixes Chisfis's search defect, where every input held isolated local state that never reached the results grid — URL-as-source-of-truth makes search state shareable, bookmarkable, and back-button-safe by construction, not just "connected." Short-term and long-term rentals have fundamentally different search semantics (date range vs. move-in date, per-night vs. per-month price) requiring `rentalType` to gate which filters even apply.

**Alternatives Considered:** Client-side state (React Context or a client store) as the source of truth for search filters, syncing to the URL as a side effect; building on a dedicated search engine from day one instead of Postgres.

**Why Rejected:** Client-state-as-source-of-truth is exactly the inversion that made Chisfis's search decorative — the URL becomes a lossy mirror of "real" state instead of the state itself, and server-rendering/SEO/shareability all suffer. A dedicated search engine from day one is unjustified operational complexity (a service to run, an index to keep in sync) for the stated listing volumes (hundreds to low hundreds-of-thousands) — Postgres is sufficient and the migration path was deliberately kept low-friction (one function boundary) specifically so this isn't a costly deferral.

**Trade-offs Accepted:** Postgres full-text search has weaker relevance ranking and no built-in typo tolerance compared to a dedicated engine — acceptable at current scale, with an explicit, concrete trigger (p95 latency > ~300ms, or > ~50k active listings in one metro area) for when this stops being true, added during the pre-implementation review specifically so "later" has a real definition, not a vague feeling.

**Revisit If:** The stated trigger conditions are hit, or relevance-ranking quality becomes a product complaint before the numeric trigger is reached.

**Implementation Confirmation (Phase 2):** The Phase 2 migration implements the Postgres side of this decision as a `Listing.searchVector` generated `tsvector` column (title weighted `A`, description weighted `B`) with a GIN index — derived entirely from existing `Listing` columns, not a separately-maintained field. This confirms the migration path stays low-friction as designed: swapping to Meilisearch/Typesense/Algolia later means (1) standing up the external index, (2) writing a sync job (on `Listing` create/update/delete) to push documents to it, and (3) changing `searchListings(params)`'s internal implementation to query the external index instead of `Listing.searchVector` — no `Listing` table columns need to move, be renamed, or be dropped, since the generated column is additive and can simply stop being queried (or be dropped later) without touching any other field. The single `searchListings(params)` function boundary from the original decision is what makes this swap contained to one module rather than every call site that currently searches listings.

---

## ADR-014: Geo Storage as `geography(Point)` from Day One (Query Deferred)

**Decision:** `Address.location` is stored as a PostGIS `geography(Point, 4326)` column with a GIST index from the initial schema, even though radius-based ("near me") search queries are not built at MVP.

**Reasoning:** Found during the pre-implementation review that treating geo-indexing as fully deferrable ("not required at MVP") conflated two different costs: enabling the PostGIS extension and choosing the right column type costs nothing today, while backfilling a geo column across what could be a million-row `Address` table later is a real, costly migration. Splitting the decision — storage shape now, query logic later — captures the cheap part immediately and defers only the genuinely deferrable part.

**Alternatives Considered:** Two plain `decimal` columns (`latitude`, `longitude`) with a standard B-tree or bounding-box approach, upgrading to PostGIS only if/when radius search is actually built.

**Why Rejected:** The bounding-box approach on plain decimals is a legitimate MVP shortcut for the *query*, but choosing it also means choosing the storage shape, and changing storage shape later (decimal columns → geography type) on a large, live table is the expensive migration this decision specifically avoids by not being deferred.

**Trade-offs Accepted:** Slightly more setup complexity now (enabling the PostGIS extension, using a geography type the team may not be immediately writing queries against) for a feature not yet built — a small, deliberate front-loading of cost.

**Revisit If:** Never expected to need reversal — this is a "pay the cheap part early" decision, not a provisional one.

---

## ADR-015: Background Job Strategy — Explicit `jobs/` Home, DB-Backed Queue at MVP

**Decision:** Scheduled/recurring work (listing status date-transitions, monthly rent charging, review double-blind window expiry, stale-inquiry expiry) lives in a dedicated `src/jobs/` folder, each file orchestrating calls into the relevant module's existing actions. At MVP, job execution can be as simple as a DB-backed job table; BullMQ+Redis is the documented graduation path once volume/reliability needs exceed that.

**Reasoning:** Found during the pre-implementation review that both other documents referenced "a scheduled job" repeatedly with no folder or module owning the concern — a real structural gap, not a naming preference. Keeping job files as thin orchestrators (not business logic) preserves the ADR-012 module-boundary rule instead of creating a second, inconsistent home for domain logic.

**Alternatives Considered:** Business logic for scheduled transitions living inside the relevant module directly (e.g., `modules/booking` schedules its own rent charges internally); a full external workflow engine (Temporal, or similar) from day one.

**Why Rejected:** Embedding scheduling logic inside each module blurs "what does this module do when called" with "what triggers this module to be called on a schedule" — two different concerns that are easier to reason about (and test) separately. A full workflow engine is significant operational overhead unjustified at current scale and job complexity — none of the jobs listed have the long-running, multi-step-with-compensation complexity that workflow engines exist to solve.

**Trade-offs Accepted:** A DB-backed job table is less robust (retry/backoff, dead-letter handling, observability) than a purpose-built queue — an accepted MVP simplification, explicitly flagged as needing monitoring/alerting attention once the monthly-rent-charging job (ADR-004/005's real-money consequence) actually ships, not before.

**Revisit If:** Job volume, failure-retry sophistication needs, or cross-job orchestration complexity outgrow a simple DB-backed table — BullMQ+Redis is the next step, already named as the graduation path rather than something to be decided fresh later.

---

## ADR-016: Chisfis Reuse Strategy — Visual Layer Kept, Logic Layer Rebuilt

**Decision:** Chisfis's `src/shared/` primitives (buttons, inputs, nav, modal), Tailwind/CSS-variable theming, and several self-contained UI modules (`GallerySlider`, `listing-image-gallery/*`, date-picker customizations) are reused with minimal change. Category-duplicated components (`StayCard`/`CarCard`/`ExperiencesCard`) are rewritten into one generic component; anything with fake/decorative logic (search forms, checkout, booking state) keeps its visual shell but has its logic fully replaced. Non-property verticals, marketing/demo pages, the duplicate icon font, and dead/insecure code (leaked API key, dead NextAuth file, Airbnb-branded copy) are removed outright.

**Reasoning:** The original Chisfis technical assessment established that Chisfis is a front-end-only UI template — its visual layer is professionally built and directly reusable, but virtually none of its "functionality" (search, booking, payment, auth) is real, so treating it as a design-system donor rather than a functional starting point was the accurate read of what it actually is.

**Alternatives Considered:** Build the entire frontend from scratch, ignoring Chisfis entirely; keep Chisfis's category-based architecture and try to adapt it incrementally rather than replacing the logic layer wholesale.

**Why Rejected:** Discarding Chisfis entirely throws away genuinely reusable, already-built UI work (the client's own framing: "use Chisfis only as a starting point... a UI and frontend architecture template, not the final product") for no benefit — the visual layer isn't the part that's wrong. Incrementally adapting the category-based architecture was rejected because the architecture itself (not just the missing logic) doesn't fit a single-vertical, two-rental-type platform — patching it in place would fight the structure at every step rather than replacing the parts that don't fit.

**Trade-offs Accepted:** A meaningful amount of Chisfis code (all non-property routes/components, the entire fake booking/payment/search logic layer) is deleted rather than adapted — more deletion than a lighter-touch customization approach would produce, accepted because keeping non-functional or wrong-shape code "just in case" is the template-baggage outcome this whole restructuring exists to avoid.

**Revisit If:** Not expected to be revisited — this was a one-time foundational assessment, not an ongoing policy each future module needs to re-derive.

---

## ADR-017: Four-Tier Role Model — CUSTOMER as the Base Authenticated Role

**Decision:** `UserRole` is `{CUSTOMER, HOST, ADMIN}`. `GUEST` is *not* a stored enum value — it describes an unauthenticated visitor (no `User` row, no session), which is already representable as "no session" without a database value. Every persisted `User` carries at least `CUSTOMER` in `roles`; a host carries `[CUSTOMER, HOST]` (not `HOST` alone), so host-capable users keep customer capabilities (booking as a guest of another listing, favoriting, messaging, reviewing) without special-casing. `requireRole()` treats `ADMIN` as an automatic pass regardless of which roles were requested.

**Reasoning:** Client clarification: the product's role model is Guest → Customer → Host → Admin, where Guest is an anonymous visitor and Customer is the base authenticated tier (book, favorite, message, review, manage own profile), with Host *inheriting* customer capabilities rather than replacing them. Phase 2's original schema modeled `GUEST` as a stored role (matching the Domain Model Specification's `{GUEST, HOST, ADMIN}` table at the time), which conflated "anonymous visitor" with "authenticated base-tier user" — the client caught this before other modules started depending on the three-role shape.

**Alternatives Considered:**
1. Keep `GUEST` as a stored role, add `CUSTOMER` as a fourth enum value, and treat `GUEST` as a real (if minimal) row for anonymous sessions.
2. Model the hierarchy as a single ordinal role per user (`role: UserRole` singular, ranked) instead of a non-exclusive `roles: UserRole[]` set.

**Why Rejected:** 1. There is nothing to persist for an anonymous visitor — no email, no password, no session row until they authenticate — so a `GUEST` database row would either be a placeholder with no real data or would require inventing an identity for people who by definition haven't created one. The existing "no session ⇒ anonymous" check already covers this for free. 2. A singular ranked role cannot express "host who also books other hosts' listings as themself," which is exactly the inheritance behavior the client described — the non-exclusive array (already the schema's shape per the Domain Model Specification, §2.1) was the right primitive; the fix needed was the *value set* inside it, not the field's cardinality.

**Trade-offs Accepted:** Host onboarding (a future module) must explicitly add `HOST` to an existing `CUSTOMER` user's `roles` array rather than assign a single replacement role — a small discipline requirement on that module's write path, not a schema risk, since `requireRole()`'s `.some()` check already treats `roles` as a set. Admin accounts as currently seeded/created carry only `["ADMIN"]`; if an admin ever needs to also transact as a customer, `CUSTOMER` must be added explicitly (deferred, since no admin-as-customer requirement exists yet).

**Revisit If:** A fifth tier or a genuinely cross-cutting permission (not expressible as "which of these roles do you have") is required — at that point a dedicated permissions/capability table becomes worth the added complexity over the current role-array-plus-`ADMIN`-bypass model.

---

## ADR-018: Prisma Version Pin — 5.22 (Not 7.x), Documented Upgrade Path

**Decision:** Prisma and `@prisma/client` are pinned to the 5.x line (5.22.0) rather than the latest major (7.x) available on npm at implementation time.

**Reasoning:** Prisma 7 removed the `datasource.url` property from the schema file entirely — connection URLs now live in a separate `prisma.config.ts` and are passed to `PrismaClient` via an `adapter` (or `accelerateUrl` for Accelerate), a structural break from the "one `schema.prisma` is the source of truth" model every other Prisma-adjacent decision in this project assumes (ADR-008). More concretely, `@next-auth/prisma-adapter@1.0.7` (the NextAuth v4 Prisma adapter — see ADR-019) is written against the Prisma 4/5-era `PrismaClient` constructor and datasource shape; it has not been updated for Prisma 7's config model, so `prisma generate` failed outright (`P1012`) when first attempted against 7.8.0.

**Alternatives Considered:** Adopt Prisma 7 now and hand-write a `prisma.config.ts` + custom `adapter` wiring to work around the NextAuth adapter incompatibility; pin to Prisma 6.x as a middle ground.

**Why Rejected:** Working around the NextAuth adapter's incompatibility would mean patching or forking a third-party package (`@next-auth/prisma-adapter`) that isn't ours to maintain, for a major-version jump that isn't required by anything in Phase 2's scope — pure premature churn. Prisma 6 was not evaluated in depth once 5.22 was confirmed to satisfy every Phase 2 requirement (all `postgresqlExtensions` preview functionality, raw SQL migration additions, and `prisma db seed` all work identically on 5.22); there was no signal that 6 offered anything Phase 2 needed that 5 didn't.

**Trade-offs Accepted:** Missing two major versions of Prisma improvements (6 and 7) — including whatever performance/DX work landed in the newer query engine — until the upgrade is deliberately scheduled. `npx prisma generate` prints an "update available" notice on every run as a standing reminder this is a deliberate pin, not an oversight.

**Upgrade Path (for when this is revisited):** (1) Confirm `@next-auth/prisma-adapter` (or its replacement — see ADR-019, since a NextAuth v4→v5 upgrade would swap this package for `@auth/prisma-adapter` anyway) has shipped Prisma 7-compatible support. (2) Run `prisma migrate diff` against a scratch database to confirm no migration-history format changes are needed. (3) Introduce `prisma.config.ts` per Prisma 7's datasource model, move `DATABASE_URL` wiring there, and update `src/lib/db.ts`'s `PrismaClient` construction to the adapter-based pattern. (4) Re-run the full migration history against a clean database and diff the resulting schema against production to confirm no drift. (5) Do this as its own isolated change, not bundled with an unrelated feature, given the config-model break touches every environment (dev/CI/prod).

**Revisit If:** `@next-auth/prisma-adapter` (or its Auth.js v5 successor) confirms Prisma 7 compatibility, or a Prisma 5-only bug/limitation is hit that 7 has fixed and no 5.x patch resolves it.

---

## ADR-019: NextAuth v4 (Not Auth.js v5) for This Phase

**Decision:** Authentication uses `next-auth@4.24.14` (the credentials provider, JWT sessions, `@next-auth/prisma-adapter@1.0.7`) rather than Auth.js v5, the current major version of the same project under its renamed package.

**Reasoning:** This supplements ADR-009 (which decided to keep NextAuth over switching to Lucia/Clerk/custom) with the specific major-version question, since "NextAuth" and "Auth.js v5" are no longer quite the same target: v5 changed the top-level API (`auth()` replacing `getServerSession()`), the config file convention (`auth.ts` at the project root, edge-compatible middleware), and moved the Prisma adapter to a new package (`@auth/prisma-adapter`) — enough surface area change that picking v4 vs v5 is a real decision, not an implementation detail of "using NextAuth." v4 is the version already present as a dependency in the codebase pre-Phase-2 (per ADR-009's finding), is fully stable, and its credentials-provider + JWT-session pattern is exactly what Phase 2's requirements call for (no social providers yet, per the client's explicit Phase 2 scope).

**Alternatives Considered:** Adopt Auth.js v5 directly since it's the actively-developed major version and a v4→v5 migration will eventually be necessary regardless.

**Why Rejected:** Not rejected on technical merit — v5 is a reasonable target — but deferred because migrating major versions and building net-new authentication functionality (registration, login, password reset, JWT role claims) in the same change conflates two different kinds of risk. v4 is battle-tested for exactly this credentials-provider/JWT use case; starting Phase 2 on v5 would mean debugging both "is my auth logic correct" and "is this new major version's API behaving as documented" simultaneously, with no Phase 2 requirement (no social providers, no edge-middleware auth) that specifically needs v5's new capabilities.

**Trade-offs Accepted:** `getServerSession(authOptions)` (v4's per-call session-fetch pattern, used throughout `src/lib/auth.ts`) is the pattern that will need to change to `auth()` on a future v5 upgrade — every call site, not just the config file, is affected. This is accepted as a known, bounded future migration rather than a reason to delay Phase 2 further.

**Upgrade Path (for when this is revisited):** (1) Confirm `@auth/prisma-adapter` supports the Prisma version in use at the time (see ADR-018 — if both upgrades are pending, sequence Prisma first since the adapter package changes for both reasons independently). (2) Follow Auth.js's official v4→v5 codemod/migration guide: rename `[...nextauth]/route.ts` config to root-level `auth.ts` exporting `{ handlers, auth, signIn, signOut }`. (3) Replace every `getServerSession(authOptions)` call site in `src/lib/auth.ts` (and any module code built on top of it by then) with `auth()`. (4) Re-verify the JWT callback's custom claims (`id`, `firstName`, `lastName`, `roles`, `avatarUrl`) survive the config migration, since v5's callback signatures changed shape in places. (5) Re-test the full registration → login → session → password-reset flow end-to-end before removing v4.

**Revisit If:** A Phase 2+ requirement specifically needs v5 (edge-runtime middleware auth checks, or a social provider whose v4 integration has known issues) — at that point the migration is scoped and justified rather than speculative.

---

## ADR-020: Listing Extensibility — Reference Tables + Typed Columns, Narrow JSONB Escape Hatch (Not EAV)

**Decision:** New listing attributes are added through three deliberately different mechanisms depending on shape, not one general-purpose mechanism: (1) **catalog-like, multi-select, host-toggleable characteristics** (amenities, and future analogues like view type or accessibility features) follow the existing `Amenity`/`ListingAmenity` reference-table-plus-join-table blueprint — adding a new value is an `INSERT` into the catalog table, not a migration; (2) **core fields used in filtering, sorting, pricing, or validation logic** (bedrooms, `nightlyPrice`, `rentalType`-conditional fields, etc.) stay real typed columns per ADR-002, added via normal migrations when a genuine new business-critical field is confirmed; (3) a single narrow `Listing.metadata Json?` column is the only escape hatch for genuinely long-tail, presentational-only, host-supplied extras that don't yet justify a first-class column or a new catalog table.

**Reasoning:** Client guidance: property listing platforms accumulate new attributes over time (new amenities, property features, metadata), and the module should absorb that without a migration for every addition — but explicitly not via a general Entity-Attribute-Value model, and not by letting ad hoc attribute logic leak into UI components. The three-mechanism split matches each attribute shape to the structure that's actually correct for it, rather than forcing all future attributes through one mechanism that's wrong for most of them: catalog-like toggles need referential integrity and query indexability (`WHERE amenity = 'pool'`), core business fields need type safety and constraint enforcement (ADR-002's `CHECK` constraints depend on real columns), and only the genuine remainder — informational extras nobody filters or sorts on — needs schema flexibility at all.

**Alternatives Considered:**
1. A general `EntityAttribute`/`AttributeValue` EAV model covering all current and future listing attributes uniformly.
2. A single unstructured `Listing.attributes Json` blob with no column reserved specifically for amenities (i.e., folding the existing `Amenity`/`ListingAmenity` pattern into the same generic bag as everything else).
3. No flexibility mechanism at all — every new attribute, including cosmetic/informational ones, goes through a full migration.

**Why Rejected:** 1. EAV was explicitly ruled out by the client and independently disqualifying on its own merits here: it loses foreign-key integrity, makes every attribute query a self-join against a generic value table, defeats Postgres's type system and indexing (every value stored as text or a handful of typed columns on the EAV row), and is the textbook anti-pattern this decision exists to avoid — the amenities catalog already proves a reference table does the same job (fast, zero-migration additions) without any of that cost. 2. Folding amenities into a generic JSON bag would give up exactly what makes amenities work well today — referential integrity (`ListingAmenity.amenityId` FK), indexable filtering (`WHERE amenityId = X`), and category-based grouping (`AmenityCategory` enum) — for no benefit, since the reference-table pattern already solves the "add new values without a migration" problem for this shape of attribute. 3. Rejecting all flexibility would mean a real, if minor, listing-metadata addition (a one-off note, a rarely-queried flag) forces a migration and a `CHECK` constraint conversation every time — disproportionate ceremony for genuinely low-stakes, non-business-critical fields.

**Trade-offs Accepted:** `Listing.metadata` must be governed by explicit discipline to avoid becoming EAV-by-another-name: it is validated by a single versioned Zod schema living in the listings module (not read/written ad hoc from UI components, consistent with ADR-012's module-boundary rule), documented with an explicit allowlist of known keys in one place, and — critically — is presentational/informational only. Any metadata key that starts being used in a `WHERE` clause, a sort, or a validation rule is a signal it should graduate to a real column or catalog table via a normal migration, not stay in `metadata` because that's easier. This graduation discipline is enforced by code review, not the type system — the same category of accepted risk as ADR-012's module-boundary rule.

**Revisit If:** `Listing.metadata` starts accumulating keys that are actually being filtered/sorted/validated on in practice (a sign the boundary is being violated) — at that point, audit its contents and graduate the offending keys to real columns rather than adding query logic against JSON. If an entirely new *class* of catalog-like attribute emerges that doesn't fit the amenity-style binary "has/doesn't have" shape (e.g., something inherently numeric-range or free-text per listing), design its own typed structure rather than defaulting either into `metadata` or into a forced fit of the amenity pattern.

---

## ADR-021: Stripe Connect Integration — Interface Extensions, Idempotency, and Deferred Payout Timing

**Decision:** Four scoped additions beyond what ADR-006/007 and the Domain Model Spec §6 already fixed, made while building the real `StripeConnectProvider` adapter:

1. **`PaymentProvider` gains two methods beyond the spec's original six**: `createOnboardingLink` (Stripe Express onboarding is a two-call process — create the account, then generate a Stripe-hosted Account Link — and there is no way to express "continue onboarding" without it) and `getAccountStatus` (a live `charges_enabled`/`payouts_enabled`/`details_submitted` check; never cached on `User`, preserving ADR-007's "`payoutAccountRef` is the only payout-related field on `User`").
2. **Webhook idempotency follows the Domain Model Spec §2.14 mechanism exactly**: check whether the relevant `Payment` row already reflects the incoming outcome (e.g. already `SUCCEEDED`) and short-circuit — no separate `WebhookEvent` log table was introduced, since the spec's stated mechanism already covers it without new schema.
3. **`Booking.status` can now reach `DISPUTED` from `CONFIRMED`/`CHECKED_IN` (short-term) and `CONFIRMED` (long-term)**, not only from `COMPLETED`/`ACTIVE` as the Domain Model Spec's simplified state diagrams draw it. A chargeback can be filed any time after a charge, not only after a stay completes — the spec's own prose ("a CHARGEBACK flags the related Booking for admin review") describes this independent of lifecycle stage even though the diagram doesn't draw every arrow.
4. **Payout timing is explicitly *not* automated.** `payout()` (a Stripe Transfer, per ADR-005) and an admin-callable `payoutForPayment()` action exist and are fully tested, but nothing in the booking lifecycle calls them — client direction, confirmed when this was raised as an open gap: build the mechanism now, decide the timing policy (on check-in, on completion, after a dispute window, ...) as a separate, later decision.

**Reasoning:** All four were things ADR-006 anticipated in the abstract ("a gateway-specific capability with no equivalent elsewhere... forces an interface extension") or gaps the existing documents were silent on, surfaced only by actually building the adapter. None change money math, fee percentages, or refund policy — those stay exactly as Phase 5 (`src/lib/pricing-policy.ts`) defined them.

**Alternatives Considered:** For (2), a dedicated `WebhookEvent(provider, eventId)` table with a unique constraint, matching how some Stripe integration guides pattern webhook idempotency. For (3), leaving `DISPUTED` reachable only from `COMPLETED`/`ACTIVE` and dropping/logging a chargeback event that arrives against an earlier-stage booking instead of transitioning it. For (4), auto-triggering payout on short-term check-in — ADR-005's own literal example of a buyer-protection window.

**Why Rejected:** (2) The spec already prescribes a specific, sufficient mechanism (Payment-row-status-based dedup) — adding a second, parallel idempotency system would be undocumented complexity solving an already-solved problem, and cuts against the project's stated minimalism (`domain-model-specification.md` §0: "No entities were added beyond what's needed"). (3) Silently dropping a real chargeback because the booking hadn't reached `COMPLETED` yet would mean a real dispute goes unrecorded and unreviewed — worse than widening a table already governed by one central function (`canTransition`). (4) Picking a payout-timing policy unilaterally would be exactly the kind of unconfirmed business-rule assumption the engagement has consistently avoided (see the Phase 5 pricing-tier and Phase 6 payout-timing clarifying questions) — better to ship a correct, tested mechanism and let the client's actual policy decide when it fires.

**Trade-offs Accepted:** No host currently receives money automatically — every payout requires a manual/admin `payoutForPayment()` call until a timing policy is chosen and wired in. `createCharge`'s Stripe implementation stands in with a fixed Stripe test PaymentMethod (`pm_card_visa`) rather than accepting one, since no real checkout UI (Stripe Elements + SetupIntent) exists yet and the interface deliberately has no gateway-specific "payment method" parameter — swapping in a real guest-supplied payment method later requires no interface or booking-module change, only the adapter's internal call.

**Revisit If:** A payout-timing policy is decided — wire it into `src/jobs/booking-lifecycle.ts` (or a new job) calling the existing `payoutForPayment()`, no payment-architecture change needed. If a second payment provider is ever added and can't express `createOnboardingLink`/`getAccountStatus` in its own terms, that's a signal those two methods encoded a Stripe-specific assumption after all, worth revisiting.

---

## ADR-022: Messaging — Two Conversation-Creation Triggers, Admin Access as a Separate Audited Path

**Decision:** `Conversation` creation follows two different triggers depending on its anchor, both consistent with the Domain Model Spec §2.12 lifecycle note ("created on first message"): (1) **inquiry-anchored** — `createInquiry()` creates the `Conversation` and its first `Message` eagerly, in the same transaction as the `Inquiry` row, since the inquiry's own text already *is* that thread's first message; (2) **booking-anchored** — created lazily by `sendMessage({bookingId})` the first time either party actually sends something, never at booking-creation time, so a booking with no messages never accumulates an empty conversation row. A host's reply in an inquiry-anchored thread also auto-transitions that `Inquiry` to `RESPONDED`, removing the need for a separate manual click on the common path (the manual `markInquiryResponded`/`closeInquiry` actions from Phase 5 still exist for the uncommon ones — an out-of-band reply, or closing without replying). The `ADMIN` "read for dispute resolution" permission (Domain Model Spec §2.12) is a dedicated function, `getConversationForAdmin()`, never a silent bypass folded into the normal participant-gated query — every call writes an `AuditLog` row first, and a second admin read gets its own separate row rather than being deduped.

**Reasoning:** The two creation paths reflect a genuine structural difference the spec already draws: an inquiry always *has* an opening message (the inquiry text itself), a booking might never get one. Forcing both through the same lazy-on-first-message path would mean either duplicating the inquiry's text as a second, redundant "first message," or leaving the inquiry's actual content out of the thread entirely. Auto-marking `RESPONDED` is a direct reading of what "responded" means once real messaging exists — is a reasonable UX inference (not a new business rule), not a mandate anywhere in the docs. The separate audited admin path exists because the alternative — baking an `ADMIN`-bypass condition into the same function every other caller uses — makes it one code-review-missed conditional away from being an unlogged bypass; a distinct function name is the same discipline already applied to the Stripe Connect admin escape hatch (`payoutForPayment`) in ADR-021.

**Alternatives Considered:** A single lazy-creation path for both anchors (skip pre-creating the inquiry's conversation, require the host's first reply to "start" it). Baking the `ADMIN` bypass directly into `getConversationById` with an `isAdmin` check.

**Why Rejected:** The single-path alternative would either drop the guest's original inquiry question from the thread history or require inserting it as a synthetic duplicate message — worse in both cases than acknowledging the two anchors are genuinely different. The inline-bypass alternative was rejected for the same reason ADR-021 rejected it for payments: a permission check embedded in a general-purpose function is the kind of thing that silently stops being audited the first time that function gets refactored, whereas a distinctly-named function forces every caller to be deliberate about which path they're using.

**Trade-offs Accepted:** Two different creation code paths for `Conversation` (one in `modules/inquiries/actions.ts`, one in `modules/messaging/actions.ts`) instead of one — acceptable since they're genuinely triggered by different events, not an arbitrary split. No real-time delivery (WebSockets/polling) — messages appear on next navigation/refresh only, consistent with nothing in the architecture docs requiring live delivery for MVP.

**Revisit If:** A third conversation-anchor type is added (e.g., a standalone "contact host" outside any inquiry or booking) — decide then whether it's a third eager-creation path or reuses the lazy booking-style one, rather than assuming either default. If real-time delivery becomes a stated requirement, this is a documented gap to fill, not an oversight to rediscover.

---

## ADR-023: Rate Limiting — DB-Backed Sliding Window at MVP, Retrofitted Across All Four Required Endpoints

**Decision:** A lightweight Postgres-backed sliding-window rate limiter (`RateLimitHit` model, `src/lib/rate-limit.ts`) is wired into all four endpoints the Platform Architecture Blueprint calls for: signup (IP-keyed), Inquiry creation, Message creation, and Review submission (the latter three user-ID-keyed). `RateLimitHit` is deliberately a standalone table with no foreign key to any other model — `key` is an opaque caller-defined string (e.g. `"signup:<ip>"`, `"review:<userId>"`) — so the limiter has zero coupling to what it's protecting. Redis/Upstash is the named, not-yet-triggered graduation path, matching ADR-015's job-queue precedent exactly.

**Reasoning:** Found mid-Phase-8 (Reviews and Favorites) that the blueprint requires rate limiting on four specific write endpoints, but three of them (signup, Inquiry creation, Message creation) had already shipped across Phases 2/5/7 with no limiter at all — a real structural gap, not a naming preference, discovered only because Review submission (this phase's fourth endpoint) forced the question. Raised to the client rather than assumed, since it spanned already-approved phases and introduced a new infrastructure question (DB-backed vs. Redis) not previously decided anywhere.

**Alternatives Considered:**
1. Redis/Upstash-backed limiter now, built alongside the DB-backed job queue's own eventual Redis migration.
2. DB-backed limiter on Review submission only (this phase's endpoint), leaving the three already-shipped endpoints unlimited until a separate remediation pass.
3. No rate limiting at all until a concrete abuse incident justifies the engineering cost.

**Why Rejected:** 1. No Redis/Upstash infrastructure exists anywhere in this project yet — introducing it solely for rate limiting, when a DB-backed limiter is sufficient at current traffic levels (mirrors the exact reasoning ADR-015 already applied to the job queue), would be scope creep unrelated to Phase 8's actual deliverable. 2. Leaving three already-shipped, unauthenticated-reachable endpoints (signup in particular) unlimited while fixing only the newest one would mean knowingly shipping Phase 8 with a documented gap still open — directly contrary to the standing instruction to reconcile discovered inconsistencies immediately rather than deferring them. 3. Signup and message-spam abuse vectors are real and blueprint-mandated, not speculative; deferring indefinitely isn't consistent with the architecture already calling for this.

**Trade-offs Accepted:** A DB-backed sliding window costs one `COUNT` query (plus, on the fast path, a `findFirst` + a two-statement transaction) per rate-limited request — more write load than an in-memory/Redis counter would add, acceptable at current traffic and explicitly the same category of accepted MVP simplification ADR-015 already made for jobs. `RateLimitHit` rows accumulate outside their own window until the next `checkRateLimit` call for that same `key` prunes stale rows (deletion is opportunistic, tied to the next hit on that key, not a separate sweep job) — acceptable since abandoned keys (e.g., an IP that never returns) cost only storage, not correctness.

**Revisit If:** Traffic volume makes the per-request `COUNT`/transaction cost measurable, or multi-instance/serverless deployment makes a shared, sub-millisecond counter genuinely necessary — at that point Redis/Upstash is the named next step, swapped in behind the same `checkRateLimit(key, config)` signature so call sites don't change.

---

## ADR-024: Review Eligibility — `COMPLETED` or `TERMINATED_EARLY`, Reconciling the Blueprint Against the Domain Model Spec

**Decision:** A booking is reviewable once `status` is `COMPLETED` **or** `TERMINATED_EARLY`, enforced server-side in `createReview()`. The Platform Architecture Blueprint §8 (which said "only bookings with `status = Completed`") has been corrected to match; the Domain Model Specification §2.10 ("`bookingId.status` must be `COMPLETED` or `TERMINATED_EARLY`") was already correct and is the rule actually implemented.

**Reasoning:** Found while implementing `createReview()` in Phase 8 that the two source documents disagreed. The project's own documented authority ordering (ADR > domain-model-spec > blueprint > pre-implementation-review, per `docs/project-status.md`'s Developer Notes) already resolves this in favor of the domain-model-spec, and the domain-model-spec's version is also the more defensible business rule on its own terms: a long-term lease terminated early (breach, mutual agreement) still produced a real, reviewable stay — excluding it would mean a tenant who lived somewhere for eight months of a twelve-month lease can never review it, solely because the lease didn't run to its natural end.

**Alternatives Considered:** Follow the blueprint's narrower "`Completed` only" wording and treat `TERMINATED_EARLY` bookings as permanently unreviewable.

**Why Rejected:** Would contradict the domain-model-spec's explicit validation rule (§2.10, which is more specific and was written to cover exactly this case) for no stated business reason — the blueprint's phrasing reads as an MVP-level simplification ("Completed" as shorthand for "the stay/lease is over"), not a deliberate exclusion of terminated-early leases. Silently picking the narrower rule without reconciling the two documents would also have left the discrepancy undocumented for the next engineer or AI session to rediscover.

**Trade-offs Accepted:** None beyond the normal cost of a documentation correction — no code changes were required since `createReview()` was written against the domain-model-spec's rule from the start; only the blueprint's prose and this record needed to catch up.

**Revisit If:** A future rental-type addition introduces a third "ended early" status with genuinely different reviewability semantics (e.g., a status representing fraud/abuse termination where a review shouldn't be allowed) — at that point, the eligibility check should branch on the specific termination reason, not just `status`, which the current schema doesn't yet distinguish.

---

## ADR-025: Admin Dashboard — Conditional Listing Moderation, Key-Value Platform Settings, Polymorphic Audit Targeting

**Decision:** Three scoped design choices for the Phase 9 Admin Dashboard:

1. **Listing moderation is a runtime-toggleable gate, not a permanent workflow change.** `publishListing()` checks `isListingModerationEnabled()` at runtime — when ON and the listing status is `DRAFT` or `REJECTED`, it routes to `PENDING_REVIEW` instead of `PUBLISHED`; when OFF (default), the existing direct-publish behavior is preserved. This means the moderation queue is opt-in infrastructure, not a forced addition to every listing lifecycle.

2. **Platform settings are stored in a key-value `PlatformSetting` model** (primary key = `key: String`, single `value: String` column) rather than a single-row config table with one column per setting. Typed accessors in `src/modules/admin/settings.ts` prevent stringly-typed reads (`isListingModerationEnabled()` returns `boolean`, `getServiceFeePercent()` returns `number`). New settings are added by inserting a row and writing an accessor — no migration required.

3. **`AuditLog.targetId` is `String`, not `@db.Uuid`.** The field is polymorphic — it references the primary key of whichever entity type `targetType` names. Most entities use UUID primary keys, but `PlatformSetting` uses a string key (`"listingModerationEnabled"`, `"serviceFeePercent"`). Constraining the column to UUID would break audit logging for non-UUID-keyed entities.

**Reasoning:** The moderation toggle avoids forcing every listing through a review queue when the platform is small and doesn't need it, while still making the infrastructure instantly available when the client wants it. Key-value settings are the simplest extensible pattern for a small number of platform-wide knobs. The `targetId` type change corrects a schema assumption that all audited entities have UUID primary keys.

**Alternatives Considered:** (1) Hardcode moderation always-on (forces queue overhead on every listing immediately). (2) Single-row config table with typed columns per setting (requires a migration to add each new setting). (3) Keep `targetId` as UUID and hash the PlatformSetting key into a deterministic UUID (preserves UUID-only but makes the audit log unintelligible for non-UUID entities).

**Why Rejected:** (1) Over-constrains the platform before it needs moderation. (2) Adds migration overhead for what should be a runtime-configurable value. (3) Unnecessarily obscures audit records — the whole point of an audit log is human-readable traceability.

**Trade-offs Accepted:** Key-value settings lack schema validation at the database level (any string is valid as a value) — the typed accessors in `settings.ts` are the enforcement layer, not the schema. If the number of settings grows large or they need relational integrity (e.g., a setting that references another entity), this pattern should be revisited.

**Revisit If:** The platform needs structured/nested configuration (feature flags with rollout percentages, per-tenant overrides) — at that point, a dedicated configuration service or a more structured settings model would be warranted.

---

## ADR-026: Notifications — `EmailProvider` Abstraction, Two-Row-Per-Channel Dispatch, Critical-Type Email Override

**Decision:** Four scoped design choices for the Phase 10 Notifications module:

1. **`EmailProvider` interface + stub/Resend adapters, mirroring ADR-006's `PaymentProvider` pattern exactly.** `src/lib/notifications/{provider,stub-provider,resend-provider,index}.ts` — `getEmailProvider()` is feature-flagged via `NOTIFICATIONS_PROVIDER` (`stub` default / `resend`), so the entire notification pipeline (in-app rows, preference gating, all ten retrofit call sites) is testable end-to-end with zero email credentials, same as every other gateway integration in this project.

2. **`notify(userId, type, payload)` writes one `Notification` row per channel actually dispatched**, not one row with a channel list. The IN_APP row is always written (Platform Architecture Blueprint §7: "in-app ... always on") — it is never gated by preference and is what powers the unread badge/list. The EMAIL row is written only if that send path is taken (see #3), and its existence in the table doubles as a delivery log — no separate `EmailLog` model was needed.

3. **`CRITICAL_EMAIL_TYPES` (`BOOKING_CONFIRMED`, `BOOKING_CANCELLED`, `PAYMENT_FAILED`, `PASSWORD_CHANGED`) always email, ignoring `NotificationPreference`.** Every other `NotificationType` defaults to emailing (opt-out: no preference row means enabled) unless the user has explicitly disabled it. This is a direct implementation of the blueprint's own worked example ("opt out of non-critical notifications ... without losing critical ones (e.g. booking confirmation)") — the four types chosen are the security- and transaction-integrity-critical ones a user must not be able to silence, even via a maliciously crafted preference-update request (enforced server-side in `notify()`, not just hidden in the preferences UI).

4. **Email delivery is synchronous-but-isolated, not queued.** Per the blueprint's MVP dispatch guidance ("email sends queued ... so a slow email provider never blocks a user-facing request"), no new DB-backed job-queue table was introduced — that would duplicate `RateLimitHit`'s and the booking-lifecycle job's already-established "DB-backed at MVP, named Redis/queue graduation path" pattern (ADR-015, ADR-023) for infrastructure that doesn't yet need it. Instead, `notify()` awaits the send but wraps it in try/catch: a provider failure is logged and swallowed, never thrown, so it can never fail or roll back the caller's own transaction/action.

**Reasoning:** Every other gateway integration in this project (Stripe, Cloudinary) follows the interface-plus-stub-adapter shape; repeating it for email keeps the codebase's abstraction vocabulary consistent and required no new judgment calls about testability. The two-row-per-channel schema was already fixed (Phase 2, unused until now) and fits this dispatch model without a migration. The critical-type override is the one place `notify()` encodes a business rule rather than pure mechanism — justified because it's explicitly named in the blueprint's own example, not inferred.

**Alternatives Considered:** (1) A single `Notification` row per event with a `channels: NotificationChannel[]` array instead of one row per channel. (2) Opt-in preferences (email disabled by default, user must enable). (3) A real job queue (new `EmailJob` table + a `src/jobs/email-dispatch.ts` cron-polled worker) for email sends.

**Why Rejected:** (1) The schema's `@@id([userId, type, channel])` on `NotificationPreference` and the `channel: NotificationChannel` singular field on `Notification` (both fixed since Phase 2) are structured for one-row-per-channel; fighting that would mean either a schema migration or a denormalized reinterpretation of an existing column, for no behavioral gain. (2) Opt-in would mean most users get zero emails until they take an action they don't know exists — opt-out matches the blueprint's own phrasing ("opt out of") and every mainstream marketplace's default. (3) A real queue is real infrastructure (worker process or cron-polled table, retry/backoff logic, dead-letter handling) for a problem the try/catch isolation already solves at MVP scale — introducing it now would be exactly the kind of "catch-up phase" the blueprint explicitly says Performance Optimization is *not* for, applied one phase too early.

**Trade-offs Accepted:** A failed email send is logged to the server console and otherwise silently dropped — there is no retry, no dead-letter queue, and no admin-visible "this email failed to send" indicator beyond the `Notification` row's existence (which records that a send was *attempted*, not whether it *succeeded*). At current expected volume this is acceptable; the IN_APP row always exists as a fallback so the user isn't left with zero record of the event even if email delivery silently fails.

**Revisit If:** Email volume or reliability requirements grow to the point where silent delivery failures become a real business problem (e.g., booking confirmation emails going unnoticed-missing) — at that point, promote to the named queue pattern (ADR-015/ADR-023's graduation path) with real retry/backoff and a delivery-status field on `Notification` or a dedicated `EmailLog` model.

---

## ADR-027: Release Hardening — Security Headers, Rate Limiting Extension, Password-Reset Delivery, File-Convention SEO Metadata

**Decision:** Five scoped decisions for the release-readiness milestone (`docs/release-readiness-plan.md` §1, §4, §7), all code-only — no external credentials required:

1. **Password-reset email sends through the existing `EmailProvider`, not through `notify()`.** `forgotPassword()` (`src/actions/auth.ts`) now calls `getEmailProvider().send()` directly with a dedicated `renderPasswordResetEmail()` template (`src/lib/notifications/templates.ts`), instead of `console.log`-ing the raw token. It deliberately bypasses `notify()`/the `Notification` table — a password-reset link is a security-sensitive one-time credential, not an event a user should see re-listed in their in-app notification history (same reasoning ADR-026 used to keep `PASSWORD_CHANGED` as a `notify()` call while treating the reset *link* itself differently). A send failure is logged and swallowed, matching ADR-026's accepted trade-off, so a delivery hiccup can't change the endpoint's response shape and leak account existence.

2. **Login gets a two-key DB-backed rate limiter, extending ADR-023's pattern rather than replacing it.** `RATE_LIMITS.LOGIN_IP` (20/15min) and `RATE_LIMITS.LOGIN_EMAIL` (5/15min) are checked together inside the NextAuth credentials provider's `authorize()` (`src/lib/auth-options.ts`); either being exceeded throws `Error("RATE_LIMITED")`, which NextAuth's credentials flow propagates verbatim as `result.error` to a `redirect:false` `signIn()` call, letting `/login`'s client code show a distinct message. Two keys (not one) because an IP-only limit misses distributed credential stuffing against one target account, and an email-only limit misses one attacker spraying many accounts from one source. `forgotPassword()` gets its own new `RATE_LIMITS.FORGOT_PASSWORD` (5/hour, IP-keyed) preset, closing the last of the blueprint's rate-limit-relevant public endpoints that had none.

3. **A real baseline CSP plus standard security headers, applied globally via `next.config.js`'s `headers()`.** Sources are scoped to what the app actually loads today: Cloudinary/Pexels/Unsplash images, the Google Maps iframe embed plus `google-map-react`'s script/tile requests, and `js.stripe.com`/`api.stripe.com` pre-wired for when real Stripe Elements replaces the current test-card stand-in. `'unsafe-eval'` is included in `script-src` only when `NODE_ENV !== "production"` (Next's webpack HMR needs it locally; the production bundle does not) — this is the one place CSP strictness differs by environment. `HSTS`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and a conservative `Permissions-Policy` are applied unconditionally.

4. **A shared `getSiteUrl()` helper (`src/lib/site-url.ts`) is now the one place the app's own absolute origin is computed**, reused by the password-reset link, `metadataBase`, `sitemap.ts`, and `robots.ts` — replacing a private duplicate that had grown up ad hoc in `modules/payments/actions.ts`. It reuses `NEXTAUTH_URL` (already required to exactly match the app's own origin per `docs/setup/environment-variables.md`) rather than introducing a second "what's my domain" variable, falling back to `VERCEL_URL` then `localhost:3000`.

5. **`sitemap.ts`, `robots.ts`, and `opengraph-image.tsx` replace static files, using Next.js 13's file-convention metadata routes instead of hand-maintained static assets in `public/`.** `public/robots.txt` (which hardcoded a placeholder domain and predated the admin dashboard) is removed in favor of `src/app/robots.ts`, generated from `getSiteUrl()` and now also disallowing `/admin*`. `sitemap.ts` lists static marketing routes plus every `PUBLISHED` listing via a new lightweight `getPublishedListingSlugsForSitemap()` query (`modules/listings/queries.ts` — slug + `updatedAt` only, not the full `listingInclude` shape `getPublishedListings()` returns, since a sitemap has no use for image/amenity data). `opengraph-image.tsx` generates a branded default OG image at request time via `next/server`'s `ImageResponse` (edge runtime) — no binary asset from the client was needed to close the "no `og:image` anywhere" blocker.

**Reasoning:** Every decision here either extends an already-established pattern (ADR-023's rate limiter, ADR-026's `EmailProvider`) or fills a gap the release-readiness plan named explicitly, rather than introducing new abstractions. None required a schema migration or a new gateway integration.

**Alternatives Considered:** (1) Nonce-based CSP instead of `'unsafe-inline'` for script/style. (2) A single combined IP+email rate-limit key for login instead of two independent checks. (3) Keeping `public/robots.txt`/a hardcoded `og:image` static asset and just fixing the domain string.

**Why Rejected:** (1) A nonce-based CSP requires per-request nonce plumbing through Next's App Router rendering pipeline and every inline style Tailwind/Headless UI produce — a real, larger effort appropriate for a dedicated hardening pass, not this milestone's minimum bar of "a real CSP exists and is scoped to actual sources." (2) A combined key under-protects against exactly the two attack shapes described in decision #2 above — the two-key design directly addresses both without added infrastructure (same `checkRateLimit()` call site, just twice). (3) A static `og:image` binary can't be authored in-session without a design tool or client-supplied asset, and a hardcoded domain string in `robots.txt` was exactly the bug being fixed — a generated, environment-aware version costs nothing extra and can't drift.

**Trade-offs Accepted:** CSP's `'unsafe-inline'` for `script-src`/`style-src` is a known gap (documented above, not an oversight) — a nonce-based policy is the natural follow-up if a stricter CSP is ever required (e.g., for a compliance requirement). The default OG image is site-wide, not per-listing — per-listing dynamic OG images (using a listing's title/photo) remain a named, not-yet-built enhancement (`docs/release-readiness-plan.md` §7).

**Revisit If:** A compliance or security requirement demands a stricter, nonce-based CSP; or per-listing OG images become a priority for social-share conversion once real listing photos and traffic exist.

---

## ADR-028: First Deployment Fixes — Prisma Client Generation on Vercel, Build-Time-DB-Independent Sitemap

**Decision:** Two fixes surfaced by the project's actual first Vercel deployment attempt (`docs/release-readiness-plan.md` §3), both code-only:

1. **`"postinstall": "prisma generate"` added to `package.json`'s `scripts`.** The first real Vercel build failed outright — `PrismaClientInitializationError` at `/api/auth/[...nextauth]`'s page-data-collection step, because Vercel's cached-`node_modules` install path skips whatever implicit `prisma generate` a fresh `npm install` would otherwise trigger, per Prisma's own documented Vercel gotcha (pris.ly/d/vercel-build). A `postinstall` script is the standard, Prisma-recommended fix: it runs after every install regardless of cache state, so the generated client can never silently go stale.

2. **`src/app/sitemap.ts` marked `export const dynamic = "force-dynamic"`.** The same first deployment's build then failed a second way, later in the same build: `sitemap.ts` (ADR-027 #5) queries `Listing` via Prisma with no route-segment config, so Next's App Router attempted to statically prerender `/sitemap.xml` *at build time* — and a build must never depend on the database being reachable. Verified locally by dropping the local Postgres connection entirely and confirming `next build` now succeeds end-to-end (`/sitemap.xml` regenerates per-request instead). `export const revalidate` alone was tried first and rejected (see below) — App Router still performs an initial static-generation pass for an ISR-configured route at build time, which reproduces the exact same failure.

**Reasoning:** Both bugs are real production-blocking defects, not hypothetical — they were found by the actual deployment failing, not by inspection. Neither requires reasoning about business logic or module boundaries; both are standard, narrowly-scoped Next.js/Prisma/Vercel platform-integration fixes.

**Alternatives Considered:** (1) For the sitemap, `export const revalidate = 3600` (ISR) instead of `force-dynamic`. (2) Running `prisma generate` manually as a one-off Vercel "Build Command" override in project settings instead of a `postinstall` script.

**Why Rejected:** (1) Confirmed by testing (see Decision #2) that `revalidate` does not avoid the build-time static-generation attempt for a route-handler-style special file (`sitemap.ts`) the way it might for a page — only `force-dynamic` does. A sitemap is crawled infrequently by bots, not by users on a hot path, so per-request generation with no caching has no meaningful cost. (2) A Vercel dashboard build-command override is invisible to anyone reading the repository, breaks for any other environment that runs `npm install`/`yarn install` directly (e.g. a future CI pipeline), and isn't captured by this documentation discipline — the `postinstall` script is portable and self-documenting.

**Trade-offs Accepted:** `/sitemap.xml` now does a live database query on every crawl request instead of being served as a pre-built static file — acceptable given crawl frequency is low and the query (`getPublishedListingSlugsForSitemap()`, slug + `updatedAt` only) is cheap. If sitemap-request volume or database load ever becomes a real concern, revisit with a genuine ISR/ on-demand-revalidation setup that doesn't require build-time DB access (e.g. revalidating via a webhook when a listing is published, rather than a time interval).

**Revisit If:** Sitemap crawl volume grows enough to matter for database load — add on-demand revalidation triggered from `publishListing()`/`approveListing()` instead of `force-dynamic`.

---

## Index of Decisions

| ADR | Decision |
|---|---|
| 001 | Single vertical: property rentals only |
| 002 | Unified `Listing` model, `rentalType`-conditional fields |
| 003 | Unified `Booking` model, same pattern |
| 004 | Short-term + long-term rental support, confirmed scope |
| 005 | Stripe Connect — separate charges and transfers |
| 006 | `PaymentProvider` abstraction interface |
| 007 | Stripe Connect account type — Express |
| 008 | PostgreSQL + Prisma |
| 009 | NextAuth (Auth.js) |
| 010 | Cursor-based pagination |
| 011 | Availability concurrency strategy |
| 012 | Folder architecture — `modules/` by domain |
| 013 | Search architecture — URL as source of truth |
| 014 | Geo storage as `geography(Point)` from day one |
| 015 | Background job strategy — `jobs/` folder, DB-backed at MVP |
| 016 | Chisfis reuse strategy — visual layer kept, logic rebuilt |
| 017 | Four-tier role model — `CUSTOMER` as base authenticated role |
| 018 | Prisma version pin — 5.22, documented upgrade path to 7.x |
| 019 | NextAuth v4 (not Auth.js v5) for this phase |
| 020 | Listing extensibility — reference tables + typed columns, narrow JSONB, not EAV |
| 021 | Stripe Connect integration — interface extensions, idempotency, deferred payout timing |
| 022 | Messaging — two conversation-creation triggers, admin access as a separate audited path |
| 023 | Rate limiting — DB-backed sliding window at MVP, retrofitted across all four required endpoints |
| 024 | Review eligibility — `COMPLETED` or `TERMINATED_EARLY`, reconciling the blueprint against the domain model spec |
| 025 | Admin dashboard — conditional listing moderation, key-value platform settings, polymorphic audit targeting |
| 026 | Notifications — `EmailProvider` abstraction, two-row-per-channel dispatch, critical-type email override |
| 027 | Release hardening — security headers, rate limiting extension, password-reset delivery, file-convention SEO metadata |
| 028 | First deployment fixes — Prisma Client generation on Vercel, build-time-DB-independent sitemap |
