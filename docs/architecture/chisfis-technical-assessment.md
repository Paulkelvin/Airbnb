# Chisfis Template — Technical Assessment

**Purpose:** Baseline architectural review of the Chisfis Envato template (imported at commit `bf406eb`) before beginning customization into a generic, scalable listing platform. This is the reference document for future architectural decisions — do not re-derive these findings; update this file if reality diverges as the codebase evolves.

**Scope note:** Chisfis is a **front-end-only UI template**. Nearly every "feature" (search, filters, booking, payment, auth) is a convincing static UI shell with no backend wiring. Treat all of Sections 1–14 as "what exists today," not "what works."

---

## 1. Project Overview

**Core stack:**
| | Version |
|---|---|
| Next.js | `^13.4.3` (App Router, `experimental.appDir: true`, `experimental.typedRoutes: true` — not actually used) |
| React / React-DOM | `^18.2.0` |
| TypeScript | `5.0.4` (strict mode on) |
| Tailwind CSS | `^3.3.2` + `@tailwindcss/forms`, `@tailwindcss/typography`, `@tailwindcss/aspect-ratio` |

**Dependencies by category:**

| Category | Library | Critical? |
|---|---|---|
| UI primitives | `@headlessui/react`, `@heroicons/react` | Keep |
| Icons (2nd system) | Line Awesome font (`src/fonts/`) | **Redundant** — duplicates Heroicons, pick one |
| Styling | `sass`, `autoprefixer`, `postcss` | Keep (build pipeline) |
| Date picker | `react-datepicker` + `@types/react-datepicker` | Keep — core to booking |
| Range slider | `rc-slider` | Keep — used for price filter (currently unwired) |
| Maps | `google-map-react` + `@types/google-map-react` | Keep if maps stay in scope; swappable |
| Animation | `framer-motion` | Keep, generic |
| Auth | `next-auth ^4.23.1` | Keep, but **misconfigured/dead** (see §8) |
| Global state | `react-hooks-global-state` | Keep — only used for dark mode, lightweight |
| Utility | `lodash`, `react-use`, `react-use-keypress`, `react-swipeable` | Keep, generic |
| Build boundary | `client-only`, `server-only` | Keep |

**Not present:** no form/validation library (`react-hook-form`, `zod`, `formik`), no data-fetching library (`SWR`, `React Query`), no state library (`Redux`, `Zustand`), no ORM/DB client. These are all gaps to fill, not things to remove.

**Config notes:**
- `next.config.js` allows image domains `images.pexels.com`, `images.unsplash.com`, **`a0.muscache.com` (Airbnb's own CDN)**, `www.gstatic.com` — remove the Airbnb domain.
- `tailwind.config.js` theme colors (`primary`/`secondary`/`neutral`) are driven by CSS variables in `__theme_colors.scss`, so re-theming is a CSS-variable edit, not a Tailwind rewrite — good foundation to keep.
- `tsconfig.json`: strict mode on, path alias `@/*` → `./src/*`.

---

## 2. Folder Structure

| Folder | Purpose | Assessment |
|---|---|---|
| `src/app/` | Next 13 App Router — all routes, route groups, layouts, and (misplaced) API handlers | Keep structure, prune demo routes |
| `src/components/` | ~60 files: listing cards, homepage section blocks, listing-support widgets (gallery, ratings, badges), date-picker renderers | Heavy variant duplication — consolidation target |
| `src/shared/` | ~31 files: primitive UI (Button family, Input/Select/Textarea, Avatar, Badge, Nav, Modal, dark-mode switch, socials, logo) | Good separation of intent from `components/`, but has internal duplicates too |
| `src/data/` | Mock data + domain types: `types.ts`, `listings.ts`, `taxonomies.ts`, `navigation.ts`, `authors.ts`, `posts.ts`, `jsons/*.json` | This *is* the current "API layer" — all static, build-time only |
| `src/hooks/` | 2 files: `useNcId` (React `useId` wrapper), `useOutsideAlerter` (click-outside) | Minimal, keep both |
| `src/utils/` | Formatting, viewport-detection, animation variants, Tailwind class lookup, dark-mode global-state hook | Keep; some overlap (`isInViewport` vs `isInViewPortIntersectionObserver`) |
| `src/routers/` | Single file aliasing Next's `Route` type — vestige of unused `typedRoutes` experiment | Low value, can fold into `types/` or delete |
| `src/contains/` | Misspelled dir; `contants.ts` exports only `avatarColors`; also holds `fakeData.ts` (not deeply audited) | Rename/merge into a real `constants/` folder |
| `src/fonts/` | Bundled Line Awesome icon font files | Remove once icon system is consolidated to Heroicons |
| `src/images/` | Static template imagery (avatars, car photos, logos, marketing art) | Mostly Airbnb/template-demo images — replace wholesale |
| `src/styles/` | SCSS: theme colors (CSS vars), theme fonts (unused/orphaned), custom utility classes, date-picker restyle, header blur | Keep `__theme_colors.scss` pattern; verify `__theme_font.scss` usage before deleting |

**Folders the user asked about that don't exist:** `contexts/`, `services/`, `types/` (as a dedicated top-level folder), `assets/`. Types are scattered across `data/types.ts`, `routers/types.ts`, `app/type.d.ts`. There is no context/provider layer and no services/API-client layer at all — everything is a static import.

---

## 3. Routing

All routes are **file-based and static** — almost nothing is dynamic despite this being a listing platform. Full map:

| URL | Purpose | Dynamic? |
|---|---|---|
| `/`, `/home-2`, `/home-3` | Three homepage variants (marketing) | Static |
| `/listing-stay`, `/listing-stay-map` | Stay grid (list / list+map) | Static |
| `/listing-stay-detail` | **One single hardcoded** stay detail page | **Static — no `[id]`** |
| `/listing-car`, `/listing-car-map`, `/listing-car-detail` | Car equivalents | Static, same flaw |
| `/listing-experiences`, `/listing-experiences-map`, `/listing-experiences-detail` | Experience equivalents | Static, same flaw |
| `/listing-real-estate`, `/listing-real-estate-map` | Real estate grid | Static — **no detail page exists at all** |
| `/listing-flights` | Flight search hero page | Static |
| `/add-listing/[[...stepIndex]]` | 10-step wizard, steps switched by index | Optional catch-all, but steps don't share data |
| `/account`, `/account-billing`, `/account-password`, `/account-savelists` | Account dashboard | Static, no auth guard |
| `/author` | Single demo author profile | Static — no `[authorId]` |
| `/blog`, `/blog/[...slug]` | Blog list + post | Dynamic slug, but content mostly hardcoded regardless |
| `/about`, `/contact`, `/subscription` | Marketing pages | Static, irrelevant to a listing platform |
| `/login`, `/signup` | Auth UI, non-functional | Static |
| `/checkout`, `/pay-done` | Booking flow tail | Static |
| `/api/hello` | Stub `"Hello, Next.js!"` route | n/a |
| `/api/hello/auth/[...nextauth].ts` | Dead NextAuth config (Pages Router convention in an App Router tree) | **Unreachable** |

**Critical structural finding:** every `StayCard`/`CarCard`/`ExperiencesCard` links to the *same static detail URL* regardless of which listing was clicked. Detail pages render fully hardcoded content, not the clicked listing's data. This is the single highest-priority routing fix.

**Recommend removing outright:** `about`, `blog` (+ `[...slug]`), `author`, `subscription`, `home-2`/`home-3` (keep one homepage), `contact` (rebuild, don't keep as-is).

---

## 4. Listing Architecture

**Types** (`src/data/types.ts`): no unified `Listing` type. Four independently duplicated interfaces — `StayDataType`, `ExperiencesDataType`, `CarDataType` — sharing ~15 fields (`id, author, date, href, title, featuredImage, commentCount, viewCount, address, reviewStart, reviewCount, like, galleryImgs, price, listingCategory, saleOff?, isAds, map`), differing only in a few category-specific fields (beds/baths for Stay; seats/gearshift for Car). **No `RealEstateDataType` or `FlightDataType` exists** — those verticals reuse generic grid components with no typed model at all.

**Mock data source** (`src/data/listings.ts`): static JSON (`__stayListing.json`, `__carsListing.json`, `__experiencesListing.json`) imported and `.map()`'d at module load into `DEMO_STAY_LISTINGS`, `DEMO_CAR_LISTINGS`, `DEMO_EXPERIENCES_LISTINGS`, cross-joined to `DEMO_AUTHORS` and category taxonomies. Fully build-time; no fetch, no DB. **Bug found:** `DEMO_CAR_LISTINGS` derives its category from `DEMO_EXPERIENCES_CATEGORIES` (copy-paste error — no car taxonomy exists).

**Cards**: `StayCard`, `CarCard`, `ExperiencesCard` (+ `StayCard2`, horizontal `*CardH` variants) are independent, near-duplicate components — each re-implements its own gallery slider, like button, sale badge, rating display, and `Link` wrapper rather than sharing a base. Genuine consolidation target.

**Detail pages**: do **not** read from mock data or route params — content (title, price, host, amenities, reviews) is 100% hardcoded inline JSX per category, with only images/amenity lists pulled from a local `constant.ts`. There is currently no working single-listing view.

---

## 5. Search System

**Verdict: UI only, zero real logic.** Confirmed by direct code reading, not inference:

- `StaySearchForm` composes `LocationInput`, `StayDatesRangeInput`, `GuestsInput` — no `onSubmit`, no aggregated state. The "search" button is a static `<Link href="/listing-stay-map">`.
- Each input holds its own **isolated local `useState`**, never propagated to a parent, URL, or API. `GuestsInput` even computes a `newValue` object it never uses (dead code).
- `TabFilters` (categories, price slider, amenities, rules) takes **zero props**, has no `onFilterChange` callback — its Apply/Clear buttons only close the popover, never commit a filter.
- `SectionGridFilterCard` renders `DEMO_STAY_LISTINGS.slice(0, 8)` unconditionally — filters and grid are structurally incapable of talking to each other.
- No `useSearchParams`/`router.push` with query strings anywhere in the search path (the only `useSearchParams` usage in the app is an unrelated photo-gallery modal state).
- No sorting UI or logic exists anywhere.

This is the most important gap to close for an MVP — the entire search/filter/sort layer needs to be built essentially from scratch, reusing only the visual components.

---

## 6. Booking Flow

Traced end-to-end; every step is disconnected from the next:

| Step | Finding |
|---|---|
| Listing detail pricing | Hardcoded strings (`$119/night`, `$357`, `$199`) that are **internally inconsistent** — not computed from nights × rate |
| Availability | `SectionDateRange` calendar has no blocked/booked dates; any date is selectable |
| Reserve button | Static `<Link href="/checkout">` — no listing ID, dates, or price passed through |
| Checkout | New independent `useState` for dates (reset to hardcoded defaults), a **second, differently-inconsistent** hardcoded price block (`$57`/`$199` mismatch vs. detail page) |
| Payment | "Paypal"/"Credit card" tabs are styling only — credit card input has `defaultValue="111 112 222 999"`; no Stripe/PayPal SDK, no fetch/API call anywhere in `checkout/` |
| Confirmation (`/pay-done`) | Fully static page (`"Booking code #222-333-111"`, fixed date/total) — reachable directly by URL with no real booking behind it |

**Nothing here is functional.** Availability, pricing, cart/session state across pages, and payment all need to be built new; only the visual scaffolding (date picker, price breakdown layout, payment tab UI) is reusable.

---

## 7. Dashboard

All account pages share `(account-pages)/layout.tsx` — tab nav via `usePathname`, **no auth guard** (reachable while logged out).

| Page | Purpose | Real logic? | Recommendation |
|---|---|---|---|
| `/account` | Edit profile form | None — hardcoded `defaultValue`s, no `onSubmit`, avatar upload has no handler | **Modify** — keep layout, wire real form + API |
| `/account-billing` | "Payments & payouts" | None — just a paragraph (containing literal Airbnb-branded copy) + one dead button | **Modify/Remove** — copy is Airbnb-specific and must go regardless |
| `/account-password` | Change password | None — no validation, no submit handler | **Modify** — keep layout, add real validation + API |
| `/account-savelists` | Saved listings by category tabs | Static mock data pull from `DEMO_*_LISTINGS`, no persistence, no unsave action | **Modify** — good pattern, needs real favorites backend; drop extra verticals if scope narrows to one listing type |

---

## 8. Authentication

**Not implemented**, despite `next-auth ^4.23.1` being installed with a real provider config.

- `src/app/api/hello/auth/[...nextauth].ts` contains a genuine `GithubProvider` + `GoogleProvider` config — but it's named/placed using the **Pages Router convention inside an App Router tree**. Only literal `route.ts` files exporting `GET`/`POST` are recognized under `src/app/api/`, so **this handler is dead code, unreachable at any URL.**
- `/login`, `/signup` are plain `<form action="#">` shells with dead social buttons (`href="#"`) — no `signIn()` call, no client validation.
- Repo-wide grep for `useSession`, `getServerSession`, `signIn(`, `signOut(`, `isAuthenticated` returns **zero matches**. No page checks session state.

**To fix:** relocate/rewrite the NextAuth config to `src/app/api/auth/[...nextauth]/route.ts` (or migrate to Auth.js v5 App Router handlers), wire `login`/`signup` to `signIn()`, and gate `/account*` behind a session check.

---

## 9. Forms

| Form | State/validation | Functional? |
|---|---|---|
| Add-Listing wizard (10 steps) | Each step is a standalone uncontrolled component — no shared state/context across steps, no `useState` even within a step. "Publish listing" just links back to step 1. | **No** — needs a wizard state layer built from scratch |
| Contact | Plain `<form action="#">`, no `onSubmit` | No |
| Reviews | `CommentListing` is **display-only**; always renders 4 identical hardcoded "Cody Fisher" reviews with a fixed 5-star rating regardless of actual score | No submission form exists at all |
| Checkout | See §6 | No |
| Profile/Settings | See §7 | No |

**No validation library present anywhere** (`react-hook-form`/`zod`/`formik` all absent). All inputs are plain, unvalidated HTML.

**Security flag:** `PageAddListing2` (map step) has a **Google Maps API key hardcoded and committed in source** (`AIzaSyAGVJfZMAKYfZ71nzL_v5i3LjTTWnCYwTY`). Rotate this key and move to an env var immediately — treat as leaked regardless of what we do next.

---

## 10. State Management

- **No Context API usage anywhere** (`grep -r "createContext"` / `"useContext"` → zero matches, no `contexts/` folder).
- **No Redux/Zustand/React Query/SWR/Jotai/Recoil.**
- One global-state exception: `react-hooks-global-state` powers a single boolean (`isDarkmode`) consumed by both dark-mode switch components, mirrored to `localStorage`.
- Everything else is **local `useState`/`useEffect` per component** — every modal, dropdown, and form manages its own state in isolation, with no cross-component or cross-page data flow (confirmed concretely by the booking flow in §6, where state resets between listing detail → checkout).

---

## 11. API Layer

**None, beyond one stub.** `src/app/api/hello/route.ts` returns a static `"Hello, Next.js!"` string. There are no services, repositories, or fetch utilities anywhere in `src/`. All "data" is static TypeScript/JSON imported at build time (`src/data/`). This needs to be built from zero.

---

## 12. Database Readiness

Nothing currently blocks adding a DB layer, and nothing currently uses one — this is a **greenfield addition**, not a migration:

- App Router already supports Server Components/Server Actions for direct DB access without a separate API layer if desired.
- `src/data/types.ts` interfaces are a reasonable starting point for a Prisma schema, but need to be **unified into one `Listing` model with category-specific fields** (JSON column or separate related tables) rather than kept as 3–4 parallel interfaces — see §19.
- Required work: add Prisma (or chosen ORM) + Postgres/Supabase, define schema (`Listing`, `User`, `Booking`, `Review`, `Category`), replace every `DEMO_*` import with a real query (server component fetch or route handler), and replace `next-auth`'s dead config with a working adapter (Prisma adapter pairs naturally with NextAuth).
- No architectural obstacle — the mock-data layer is cleanly isolated in `src/data/`, so swapping it for real queries touches a bounded, identifiable set of call sites.

---

## 13. Reusable Components

**src/shared/ (primitives — high reuse value, mostly keep as-is):**

| Component | Keep? | Note |
|---|---|---|
| `Button`, `ButtonPrimary/Secondary/Third` | Keep | Legitimate variant pattern (1 base + style wrappers) |
| `ButtonCircle`, `ButtonClose` | Keep, consider folding into `Button` family for consistency | Currently standalone, divergent implementation |
| `Input`, `Textarea`, `Select`, `Checkbox` | Keep | Clean forwardRef wrappers, no duplication |
| `Avatar`, `Badge` | Keep | |
| `Tag` | Keep, but note overlap with `Badge` (taxonomy-specific vs generic) | |
| `Heading` / `Heading2` | **Consolidate** — two incompatible APIs for the same role | |
| `Nav`/`NavItem`, `Navigation/*`, `MenuBar` | Keep | Solid nav primitive set |
| `Logo`, `LogoSvg`, `LogoSvgLight` | Keep, will need asset replacement | |
| `NcModal` | Keep | Clean render-prop modal |
| `NcPlayIcon` / `NcPlayIcon2` | **Consolidate** | Style-variant duplicate |
| `SwitchDarkMode` / `SwitchDarkMode2` | **Consolidate** — confirmed identical underlying hook, 2 UIs | |
| `SocialsList` / `SocialsList1` / `SocialsShare` | **Consolidate** — 3 overlapping components | |
| `NextPrev`, `Pagination` | Keep | |

**src/components/ (higher variance, expect heavier pruning):**
- Listing cards (`StayCard*`, `CarCard*`, `ExperiencesCard*`, `FlightCard`, `PropertyCardH`) — **consolidate onto one generic `ListingCard` + variant/category props** once the listing type is unified (§4, §19).
- Category cards (`CardCategory1/3/4/5/6`, `CardCategoryBox1`) — 6 style variants of one concept; pick 1–2, delete the rest.
- Section blocks (`SectionHero*`, `SectionHowItWork`, `SectionOurFeatures`, `SectionClientSay`, etc.) — one each, no internal duplication, but many are Airbnb-marketing-flavored content to rewrite, not structurally reusable.
- `StartRating` / `FiveStartIconForRate`, `PostCardMeta` / `PostCardMetaV2`, `shared/NextPrev` vs `components/PrevBtn`+`NextBtn` — **consolidate**, same overlap pattern as `shared/`.
- `GallerySlider`, date-picker renderers, `listing-image-gallery/*` — keep, genuinely reusable and self-contained.

---

## 14. Design System

- **Colors**: `primary`/`secondary`/`neutral` 50–900 scales driven by CSS custom properties in `__theme_colors.scss` — re-themeable without touching Tailwind config. Good foundation, keep the pattern.
- **Typography**: `@tailwindcss/typography` plugin; `__theme_font.scss` defines `@font-face` for Inter/Poppins but is **not imported anywhere** (orphaned) — verify before deleting, template likely uses system/Tailwind default font stack instead.
- **Spacing/breakpoints**: default Tailwind scale, no overrides.
- **Icons**: **two parallel systems** — Heroicons (React components) and Line Awesome (bundled font, `la-*` classes). Consolidate to Heroicons and drop the font (removes an entire `src/fonts/` directory and a CSS import).
- **Cards/Buttons/Modals/Forms**: see §13 — patterns are consistent within `shared/`, proliferate in `components/`.
- **Drawers**: `MenuBar`/`NavMobile` (Headless UI `Dialog`) is the only drawer pattern; no separate table component exists anywhere in the codebase (no admin/data-table UI — will need to be added for any future admin views).

---

## 15. Performance

- **Icon duplication**: shipping both Heroicons and a full custom font (5 font-file formats × 3 weights) for icons is pure waste — resolve per §14.
- **Unused SCSS**: `__theme_font.scss` appears orphaned — confirm and delete.
- **Component proliferation**: `CardCategory1/3/4/5/6` and similar variant explosion increases bundle surface and maintenance cost with no functional benefit once only 1–2 are actually used on the rebuilt site.
- **Static images**: `src/images/` is large and template-demo-specific (avatars, stock car photos, Mastercard brand PDFs(!) accidentally included) — full replacement, not optimization, is the right move.
- **No memoization concerns observed** yet (no evidence of expensive re-renders in the audited files), but the eventual real search/filter implementation should be built with debounced input + memoized filtering from day one rather than retrofitted.
- **`reactStrictMode: false`** in `next.config.js` — recommend flipping to `true` once starting real development, to surface effect/state bugs early.

---

## 16. Things We Should Remove

- `a0.muscache.com` from `next.config.js` image domains (Airbnb's CDN).
- Marketing/demo-only routes: `about`, `blog` (+ `[...slug]`), `author`, `subscription`, duplicate homepages `home-2`/`home-3` (pick one).
- Airbnb-branded copy: `/account-billing` page text ("Airbnb releases payouts…") and any other literal brand mentions found during implementation.
- Line Awesome icon font (`src/fonts/`) once consolidated to Heroicons.
- `src/routers/types.ts` (vestige of unused `typedRoutes` experiment) — fold into a real `types/` folder or delete.
- `src/app/api/hello/` (both the stub route and the dead NextAuth file) — replace with a real `src/app/api/auth/[...nextauth]/route.ts`.
- The hardcoded Google Maps API key in `PageAddListing2` — rotate and move to env var **immediately**, independent of any other work.
- Demo/mock data (`src/data/jsons/*.json`, `DEMO_*` arrays) once replaced by real DB-backed data — but keep as fixtures for local dev/tests if useful.
- Component duplicates flagged in §13/§14 (`SwitchDarkMode2`, `NcPlayIcon2`, `SocialsList1`, `Heading2`, redundant Card variants) after consolidating to one implementation each.
- Non-functional Flight/Car verticals if the product scope narrows to a single listing type (recommend deciding this explicitly — see §19).

---

## 17. Things We Should Keep

- App Router structure, route-group organization pattern, and the `@/*` path alias.
- Tailwind + CSS-variable theming pattern (`__theme_colors.scss`) — de-branding is a token edit, not a rebuild.
- `src/shared/` primitive component layer (Button family, Input/Select/Textarea/Checkbox, Nav, Modal) — genuinely reusable, framework-agnostic.
- `framer-motion`, `@headlessui/react`, `@heroicons/react`, `react-datepicker`, `rc-slider`, `google-map-react` — all generic, no Airbnb coupling.
- `next-auth` as the auth library (needs relocation/reconfiguration, not replacement).
- `GallerySlider`, `listing-image-gallery/*`, date-picker customization components — self-contained, reusable UI.
- The visual/UX scaffolding of the booking flow (date range picker, price breakdown layout, payment tab UI, step-wizard layout) — reuse the shell, replace the logic.
- `useNcId`, `useOutsideAlerter`, and the `src/utils/` formatting helpers.
- Strict TypeScript config.

---

## 18. Refactoring Plan (Phased)

| Phase | Objective | Files affected | Effort | Risks |
|---|---|---|---|---|
| **0. Security & cleanup triage** | Rotate leaked Google Maps key, move to env var; remove Airbnb CDN domain and branded copy; delete dead `api/hello` files | `next.config.js`, `PageAddListing2.tsx`, `.env.local`, `account-billing/page.tsx`, `api/hello/*` | Small (hours) | None — pure cleanup, do first regardless of later decisions |
| **1. Scope decision** | Decide single-vertical vs multi-vertical listing platform (recommend narrowing — see §19) before building the data model | N/A (decision, not code) | Small | Wrong call here multiplies rework in every later phase |
| **2. Domain model unification** | Collapse `StayDataType`/`CarDataType`/`ExperiencesDataType` into one `Listing` type (+ category-specific attributes), define `Booking`, `User`, `Review` types | `src/data/types.ts` → new `src/types/` | Medium | Touches every component consuming these types — do before DB work |
| **3. Database + API layer** | Add Prisma + Postgres (or Supabase), define schema, build server actions/route handlers replacing `DEMO_*` static imports | New `prisma/`, `src/lib/`, `src/app/api/**` | Large | Biggest single phase; get schema right before wiring UI |
| **4. Dynamic routing** | Add `[slug]`/`[id]` listing detail routes reading real data; remove hardcoded per-category detail pages | `src/app/(listing-detail)/**` | Medium | Must land after Phase 3 (needs real data to route against) |
| **5. Search & filters** | Wire `LocationInput`/date/guests to shared state + URL query params; connect `TabFilters` to actual grid filtering; add sorting | `(client-components)/(HeroSearchForm)/**`, `TabFilters.tsx`, `SectionGridFilterCard.tsx` | Medium–Large | Core UX risk if done superficially — build server-side filtering, not client-side over full dataset |
| **6. Booking & payment** | Real availability (blocked dates), real price calculation, session/cart state across listing→checkout, Stripe integration, real confirmation page | `checkout/**`, `(listing-detail)/SectionDateRange.tsx`, `pay-done/page.tsx` | Large | Payment correctness/security — test thoroughly, consider Stripe Checkout to offload PCI scope |
| **7. Auth** | Relocate NextAuth to proper App Router handler, wire `login`/`signup`, gate `/account*` | `api/auth/[...nextauth]/route.ts`, `login/page.tsx`, `signup/page.tsx`, `(account-pages)/layout.tsx` | Medium | Session/DB adapter coordination with Phase 3 |
| **8. Dashboard wiring** | Real profile/password forms with `react-hook-form` + `zod`, real favorites persistence | `(account-pages)/**` | Medium | Low risk, mostly additive |
| **9. Add-Listing wizard** | Shared wizard state (context or form-library), real submission to DB | `add-listing/**` | Medium–Large | Needs Phase 3 schema finalized first |
| **10. Component consolidation** | Merge duplicate components flagged in §13/§14, remove Line Awesome, prune Card variants | `src/shared/**`, `src/components/**` | Small–Medium | Do incrementally alongside other phases, not as a separate big-bang refactor (per your "no cosmetic refactoring" rule — only consolidate when a phase above already touches that component) |

---

## 19. Architecture Recommendations

1. **Narrow the vertical scope before Phase 2.** The duplication in types (§4) and cards (§13) exists because the template tries to support Stay + Car + Experience + Real Estate + Flight simultaneously. A "scalable listing platform" doesn't require keeping all five — recommend picking one primary listing type (or a small deliberate set) and deleting the rest, rather than building a unified abstraction across all five speculatively. This single decision removes more duplication than any component refactor.

2. **One `Listing` domain model, not four.** Use a single `Listing` type/table with shared core fields (title, price, images, location, host, rating) plus a `category`-scoped attributes structure (JSON column, or a related `ListingAttributes` table) for category-specific fields (bedrooms vs. seats). This directly replaces §4's duplicated interfaces and §13's duplicated cards with one `ListingCard` component parameterized by category.

3. **Move data access to Server Components/Server Actions**, not a client-fetched REST layer, given App Router is already in place. This avoids building a traditional API layer (§11) unless external clients (mobile app, etc.) are a real near-term requirement — don't build a general REST API speculatively.

4. **Introduce a `src/types/` folder** for domain types (`Listing`, `Booking`, `User`, `Review`) separate from component prop types, replacing the scattered `data/types.ts` / `routers/types.ts` / `app/type.d.ts` pattern.

5. **Add one piece of real cross-page state for the booking flow** (selected dates/guests/listing carried from detail page → checkout). A URL-query-param approach (search params) is likely sufficient and avoids introducing a new state library — only reach for Zustand/Context if the query-param approach proves insufficient during Phase 6.

6. **Add `zod` + `react-hook-form`** as the form/validation standard before building any of the real forms in Phases 6–9 (checkout, add-listing, profile) — currently absent entirely, and every form phase depends on it.

7. **Consolidate the icon system to Heroicons** early (§14) — it's a pure subtraction with no functional risk and immediately shrinks the bundle and asset surface.

8. **Treat `src/data/` mock arrays as fixtures, not dead weight** — once Phase 3 lands, keep a seed script derived from the existing JSON for local dev/tests rather than discarding it.

9. **Don't refactor `src/shared/`/`src/components/` wholesale up front.** Per your stated principles, consolidate duplicates (§13) opportunistically as each phase above already touches that component — a standalone "component cleanup" phase invites the exact broad, undirected refactor you want to avoid.
