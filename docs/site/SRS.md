# SRS — Site

Module: `site`
Design: [View the approved design](http://localhost:9400)
Design system: `design/design-system.md`

## 1. Purpose

The `site` module is the storefront and dashboard shell the owner approved in
the design phase: every page in `design/pages.json`, built with the copy in
`content.json` and the tokens in `theme.css`, reading records through the
mock data layer (`code/frontend/src/data`). It is what a visitor or a signed-in
operator sees before any of the backend stories (auth, booking, payments,
search, suppliers, admin, notifications, contact) replace a page's mock
behaviour with a real one. Without it there is no site to attach a backend to.

## 2. Actors

| Actor | Who they are | What they may do in this module |
|---|---|---|
| Visitor | Not signed in | Browse every public storefront page: Home, Search, Trip, Departures, Guides, Guide, Contact, Sign in, Register |
| Buyer | Signed-in traveller (mock session) | Everything a visitor may do, plus open Account, Wishlist, Book and Checkout screens (their data wiring is other modules') |
| Supplier | Signed-in operator (mock session) | Open the Supplier dashboard shell and its pages |
| Admin | Signed-in operator (mock session) | Open the Admin dashboard shell and its pages |

Permission is enforced today by `RequireRole` against the mock session in
`lib/session.ts` — a design-time gate, not a security boundary. The `auth`
module's SRS covers the real, server-checked version.

## 3. Scope

**In scope** — the one function specified below:

- The site as designed

**Out of scope** — a reader opening any of these pages would expect them, and
they are named here so they are not required twice:

- Real authentication, OTP and Google sign-in on `/signin` and `/register` — `auth` module.
- Booking creation, the 15-minute hold, and checkout payment logic — `booking` and `payments` modules.
- Search results filtered against real seat availability — `search` module.
- Supplier registration/verification, product approval workflow, calendar and seasonal pricing, booking/passenger management, payouts — `suppliers` module.
- Admin approval queue, moderation, user management, finance, content management, system settings and audit log — `admin` module.
- Records served from a database instead of the JSON files in `src/data/` — `data` module.
- Sending the contact form, booking confirmation notices — `contact` and `notifications` modules.
- Buyer account's own booking list and wishlist persistence logic — `account` module.

## 4. Functional requirements

### 4.1 The site as designed

**Requirement SITE-001 — Global shell on every page**

*As a* visitor, *I want to* see the same header, footer and mobile navigation
on every page, *so that* I can always get back to search, my account or
contact.

Behaviour:

1. On every storefront page the sticky header shows the site name, primary
   nav links, and icon buttons for search, wishlist and account (`Header.tsx`).
2. Below 1024px the header shows a menu toggle; opening it shows a full-screen
   drawer (`MobileMenu`) that locks body scroll and closes on `Escape` or an
   outside tap.
3. Below 1024px, on a storefront page only, a fixed two-button call/Zalo dock
   (`ContactDock`) appears bottom-right, showing only the buttons for which a
   number is configured in `content.json`, and nothing when neither is set.
4. Every storefront page ends with the footer (`Footer.tsx`).
5. The dashboard shell (Supplier and Admin areas) never shows the storefront
   header, footer or contact dock — it uses `DashboardLayout` instead (see SITE-007).

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | Any storefront page, viewport ≥1024px | The page loads | Header, footer render; no menu toggle is shown |
| AC-2 | Any storefront page, viewport <1024px | The visitor taps the menu toggle | The full-screen drawer opens, body scroll is locked |
| AC-3 | The drawer is open | The visitor presses `Escape` or taps outside it | The drawer closes |
| AC-4 | `content.json` has no phone and no Zalo number configured | A storefront page loads at <1024px | `ContactDock` renders nothing |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| — | — | Not applicable: the shell has one layout per breakpoint in the approved design, no error or loading state of its own |

**Data touched** — none; this requirement renders `content.json` values only.

---

**Requirement SITE-002 — Homepage content blocks**

*As a* visitor, *I want to* see featured tours, destinations, categories, the
departure board and guides on the homepage, *so that* I can find something to
book without searching first.

Behaviour:

1. The homepage shows, in order: the search row, a full-bleed hero with
   headline, a row of up to 4 featured products (`status: approved`, sorted by
   `next_date`), the product-type category pills, up to 4 destination tiles,
   up to 6 open departures in the board list, up to 3 guides, and the supplier
   call-to-action linking to `/register`.
2. Each featured product card shows its photo, name, price and seats-left in
   `.fig` (IBM Plex Mono, tabular), per the design system §1.3/§2.5.
3. The count beside "see all" reads the total number of approved products,
   not just the 4 shown.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | 4 or more approved products exist | The homepage loads | Exactly 4 featured product cards render, each with photo, name, price and seats-left |
| AC-2 | Fewer than 4 open departures exist | The homepage loads | The board lists exactly as many rows as there are open departures, no placeholder rows |
| AC-3 | A destination record has no `image` | The homepage loads | `Picture`'s empty-state block renders in its place (design system §2.7) |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Boundary | Zero approved products exist | The featured grid renders with zero cards and the "see all" count reads 0; the page does not crash |

**Data touched**

| Field | Type | Required | Rule |
|---|---|---|---|
| products.status | text | yes | Only `approved` records appear as featured |
| departures.state | text | yes | Only `Open` records appear on the board |

---

**Requirement SITE-003 — Search page layout and map**

*As a* visitor, *I want to* see the filter row, result grid and a map of
product locations on `/search`, *so that* I can narrow by type, duration and
sort, and see where things are.

Behaviour:

1. `/search` shows the search row, a type/duration/sort filter row, a result
   count, a 2–4 column card grid, a "show more" control when more pages
   exist, and a map section with pins placed by each product's `map_x`/`map_y`
   percentage position over an SVG outline.
2. A map pin links to that product's Trip page and shows its price.
3. This module ships the page and its controls wired to the mock data layer
   exactly as `useCollection` behaves today; replacing that behaviour with
   real seat-availability filtering is the `search` module's job (SEARCH-xxx).

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | At least one product has `map_x`/`map_y` set | `/search` loads | A pin renders at that position showing the product's price |
| AC-2 | A filter is changed (type, duration or sort) | The result set changes | The grid and the count update without a full page reload |
| AC-3 | No product matches the current filters | `/search` loads | The "no results" message renders instead of an empty grid |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Not applicable | — | Real seat-based filtering and its failure behaviour are specified in `docs/search/SRS.md` |

**Data touched** — `products`, `categories`, as described in `schema.json`.

---

**Requirement SITE-004 — Trip detail page**

*As a* visitor, *I want to* see a product's photos, itinerary,
inclusions/exclusions, calendar, policy, supplier info and reviews on one
page, *so that* I can decide whether to book it.

Behaviour:

1. `/tours/:id` shows the hero photo, name, destination/kind/duration label,
   next-departure date, summary, a numbered day-by-day itinerary, two columns
   for "included"/"not included", a calendar of departure dates (`TripDates`),
   the cancellation policy text (or a placeholder when empty), the supplier's
   name/kind/place/documents, a reviews list (`TripReviews`), a sticky booking
   panel (`TripBooking`) with price/date/seats/book button/wishlist toggle,
   and up to 4 related products.
2. A departure date in the calendar that is not `Open` is shown disabled with
   its state appended to its pricing-rule label.
3. An unknown product id shows the "missing" message instead of the page.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | A product has an itinerary of N lines | The Trip page loads | Exactly N numbered itinerary rows render |
| AC-2 | A departure's `state` is not `Open` | The calendar renders that date | The date button is disabled and shows its state alongside the pricing rule |
| AC-3 | No review has an author or text written | The Trip page loads | The reviews section shows the "waiting for your first review" message, not an empty list |
| AC-4 | `id` does not match any product | `/tours/:id` loads | The "missing" message renders; nothing else on the page does |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Not found | Product id does not exist | The "missing" text renders (AC-4); no partial page |

**Data touched** — `products`, `departures`, `reviews`, `suppliers`, per `schema.json`.

---

**Requirement SITE-005 — Departures board and Guides pages**

*As a* visitor, *I want to* see every open departure in one table, and browse
guides by category, *so that* I can compare dates across products or read
about a place before booking.

Behaviour:

1. `/departures` shows a sortable-by-season table of every open/closed
   departure with date, trip, operator, pricing rule, seats (highlighted
   accent when ≤4) and price, with a "show more" control.
2. `/guides` shows category filter pills (derived from the guides present),
   a result count, a card grid and a "show more" control.
3. `/guides/:slug` shows the guide's photo, title, standfirst, body split into
   paragraphs, and a "more guides" list excluding itself. An unknown slug
   shows the "missing" message.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | A departure has 4 or fewer seats left | `/departures` renders that row | The seats figure is set in the accent colour |
| AC-2 | A category pill is selected | The guides grid re-filters | Only guides of that category show, and the pill reads as active |
| AC-3 | `slug` does not match any guide | `/guides/:slug` loads | The "missing" message renders |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Not found | Guide slug does not exist | The "missing" text renders (AC-3) |

**Data touched** — `departures`, `guides`, per `schema.json`.

---

**Requirement SITE-006 — Sign in, register, account and wishlist shells**

*As a* visitor or signed-in Buyer, *I want to* see the sign-in, register,
account and wishlist pages laid out and populated from mock data, *so that*
the design is complete even before real authentication exists.

Behaviour:

1. `/signin` shows the email field, an OTP field, a role selector, the submit
   button and a Google button, plus a "why create an account" panel. Submitting
   signs in via the mock session (`lib/session.ts`) and routes by role.
2. `/register` shows name/email/phone, a role selector, and — only when the
   role is "supplier" — licence/agency file inputs and a bank field.
3. `/account` shows the signed-in visitor's bookings (from the mock
   `bookings` collection) or, when nobody is signed in, a "signed out"
   message with a sign-in link.
4. `/wishlist` shows saved products or an empty-state message with a link to
   `/search`.
5. Real credential checking, OTP verification and Google OAuth are the `auth`
   module's job; this requirement covers only that the screens render and the
   mock sign-in/out flow works.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | The role selector is set to "supplier" on `/register` | The form renders | Licence, agency and bank fields appear; they do not appear for "buyer" |
| AC-2 | Nobody is signed in | `/account` loads | The "signed out" message and sign-in link render, not a booking list |
| AC-3 | The wishlist has zero saved products | `/wishlist` loads | The empty-state message and "browse" link render |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Not applicable | — | Credential failure, OTP rejection and session persistence are specified in `docs/auth/SRS.md` |

**Data touched** — `bookings`, per `schema.json`; the mock session object (`email`, `name`, `role`).

---

**Requirement SITE-007 — Dashboard shell for Supplier and Admin**

*As a* Supplier or Admin, *I want to* see a left-nav dashboard shell on every
one of my pages, *so that* I always know where I am and what I can reach.

Behaviour:

1. Every Supplier and Admin page renders inside `DashboardLayout`: a
   permanent left nav ≥1024px (a full-screen drawer below it), grouped nav
   links with an optional badge count, a header with the page title and any
   page actions, and the content area.
2. `RequireRole` gates every one of these pages to its listed role(s); a
   visitor without that role sees the "you do not have access" message
   naming who the area is for and the visitor's own role or sign-in state.
3. Pages present as static UI by this module, with mock data from
   `src/data/*.json` reached through `useCollection`/`useRecord`:
   Supplier Overview/Products/Edit product/Bookings/Reviews/Profile & payouts;
   Admin Overview/Approval queue/Users & roles/All bookings/Finance/Review
   moderation/Content & marketing/System.
4. Every form control, button and table on these pages (commission input,
   reject-reason textarea, "approve"/"reject" buttons, DataTable sort/page
   controls) renders and is operable, with its state kept in the component —
   persisting what is typed or clicked to a backend is each page's owning
   module (`suppliers`, `admin`).

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | A visitor with no session opens `/supplier/products` | The page loads | `RequireRole`'s denial message renders, naming "suppliers" |
| AC-2 | A Buyer session opens `/admin/queue` | The page loads | The denial message renders, naming "admins" and the visitor's own role, "buyer" |
| AC-3 | A Supplier session opens `/supplier` | The page loads | `DashboardLayout` renders with the Supplier nav groups, and `RequireRole` allows it |
| AC-4 | Viewport <1024px on any dashboard page | The visitor opens the nav drawer | The full-screen drawer shows the same nav groups as the permanent sidebar |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Not permitted | Signed-in role is not in the page's `roles` list | `RequireRole` denial message renders (AC-1, AC-2); the page's content never renders |
| Not permitted | Nobody is signed in | Same denial message, since `allowed()` always refuses an absent session |

**Data touched** — every collection in `schema.json`, read-only through the mock data layer; see the `suppliers` and `admin` module SRS files for what each page writes once backed.

## 5. Screens

| Screen | Section in the design | Functions it serves | States that must exist |
|---|---|---|---|
| Home (`/`) | Home | SITE-002 | default |
| Search (`/search`) | Search trips | SITE-003 | default, empty (no results), loading (show more) |
| Trip (`/tours/:id`) | Trip | SITE-004 | default, not-found |
| Departures (`/departures`) | Departures | SITE-005 | default, loading (show more) |
| Guides (`/guides`), Guide (`/guides/:slug`) | Guides | SITE-005 | default, not-found (guide) |
| Sign in (`/signin`), Register (`/register`) | Sign in, Register | SITE-006 | default |
| My bookings (`/account`) | My bookings | SITE-006 | default, signed-out, empty (no bookings — list renders with 0 rows) |
| Wishlist (`/wishlist`) | Wishlist | SITE-006 | default, empty |
| Supplier Overview/Products/Edit product/Bookings/Reviews/Profile & payouts | Supplier dashboard | SITE-007 | default, denied |
| Admin Overview/Approval queue/Users & roles/All bookings/Finance/Review moderation/Content & marketing/System | Admin dashboard | SITE-007 | default, denied |
| Contact (`/contact`) | Contact | — (see `contact` module) | default |

## 6. Non-functional requirements

| Area | Requirement |
|---|---|
| Responsive | Every page works at 320px and up with no horizontal page scroll; layout breakpoints at `sm` (640px) and `lg` (1024px) per design system §1.5 |
| Accessibility | Keyboard reachable, labelled inputs, contrast ≥4.5:1 per design system §1.1 contrast audit; `prefers-reduced-motion: reduce` disables the Reveal animation and image hover zoom |
| Localisation | Copy is in Vietnamese (`vi-VN`); prices via `formatPrice`, dates via `formatDate`; every price/seat/date/duration figure uses `.fig` (IBM Plex Mono, tabular) |
| Performance | Hero and above-the-fold images load eagerly (`loading="eager"`); below-the-fold images load lazily |

## 7. Dependencies and assumptions

- **Depends on:** `data` module, for the mock-to-API swap of `src/data/index.ts`'s underlying records (this module ships against the mock layer as it exists today).
- **Depends on:** `auth` module, for real credential/session behaviour behind the sign-in and dashboard gates this module renders.
- **Assumption:** the content and screen list in this document is the approved design as committed in `code/frontend/src` and `design/pages.json` on the date of this SRS. If a later design change adds or removes a page, this file is revised alongside it.

| Open question | Proposed default | Who decides |
|---|---|---|
| — | — | None open for this module |

## 8. Traceability

| Plan item | Requirement ids | Test cases |
|---|---|---|
| The site as designed | SITE-001, SITE-002, SITE-003, SITE-004, SITE-005, SITE-006, SITE-007 | `test-cases/the-site-as-designed.md` |
