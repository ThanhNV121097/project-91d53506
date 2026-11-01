# SRS — suppliers

Module: `suppliers`
Design: [View the approved design](http://localhost:9400)
Design system: `design/design-system.md`

## 1. Purpose

The `suppliers` module is the Supplier's half of the CMS: registering and
verifying a supplier profile, creating and editing products through their
approval workflow, setting departure dates and seasonal pricing, managing
bookings and passengers, replying to reviews, and seeing revenue and
payouts. It is what turns `/supplier/*`'s screens from a static mock into
the actual tool a Nghệ An operator runs their listings through. Without
it, nothing a supplier does on those screens is stored anywhere a Buyer or
an Admin could ever see.

## 2. Actors

| Actor | Who they are | What they may do in this module |
|---|---|---|
| Supplier | A signed-in account with role `supplier` | Register/edit their own profile and documents; create, edit and submit their own products; manage their own departures, bookings and reviews; see their own revenue and payouts |
| Admin | Platform operator | Reads the supplier/product status this module writes, to act on in the `admin` module's approval queue |

Every screen in this module belongs to the signed-in supplier's own
records only — one supplier never reads or edits another's profile,
product, booking or payout.

## 3. Scope

**In scope** — the five functions specified below, by their plan titles:

- Supplier registration and verification
- Supplier product create edit and approval
- Supplier calendar and seasonal pricing
- Supplier booking and passenger management
- Supplier revenue and payout reporting
- Supplier review replies

**Out of scope** — a reader would expect these here; they live elsewhere:

- Approving or rejecting a supplier profile or a submitted product —
  `admin` module (Admin supplier and product approval queue); this module
  only submits and shows the resulting status.
- Hiding a review for policy violation — `admin` module (Admin review
  moderation); this module's reply feature only adds the supplier's own
  reply text, never changes a review's visibility.
- Setting the commission rate used in the revenue figures this module
  shows — `admin` module (Admin commission and payout reconciliation);
  this module reads that rate, never writes it.
- The seat hold and booking creation itself — `booking` module; this
  module manages bookings already created against the supplier's
  products.

## 4. Functional requirements

### 4.1 Supplier registration and verification

**Requirement SUPPLIERS-001 — Submit profile and documents for verification**

*As a* Supplier, *I want to* submit my business licence, travel-agency
licence (if any) and bank account details on `/supplier/account`, *so
that* an admin can verify me and I can receive payouts.

Behaviour:

1. Submitting the profile form writes to the signed-in supplier's own
   `suppliers` row: business name, licence document URLs (via the shared
   upload endpoint, SUPPLIERS-006), bank name, account number and account
   holder.
2. The supplier's `suppliers.verified` stays `false` until an admin
   approves it (`admin` module); this module never sets it to `true`
   itself.
3. The current verification status is visible to the supplier on this
   same screen.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | A supplier fills business name, uploads a licence document, and enters bank details | Submits | The `suppliers` row for that account has those fields set, `documents` reflecting at least one uploaded file, and `verified` still `false` |
| AC-2 | A supplier whose profile is already `verified = true` | Views `/supplier/account` | The screen shows the verified status, not a "waiting" message |
| AC-3 | Bank account number field left empty | Submits | Inline validation error; the `suppliers` row is not written |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Invalid input | A required field (business name, bank account number) is empty | Inline error; nothing written (AC-3) |
| Not permitted | A supplier attempts to submit against another supplier's `suppliers` row | Rejected; only the signed-in supplier's own row may be written |
| Upstream failure | The document upload (SUPPLIERS-006) fails | The form submission does not complete with a partial document reference; the supplier is told the upload failed and may retry |

**Data touched**

| Field | Type | Required | Rule |
|---|---|---|---|
| suppliers.name, place, kind | text | yes | Business identity fields |
| suppliers.documents | text | yes | Set from the upload endpoint's returned URL(s) |
| suppliers.verified | bool | yes | Read-only here; written only by `admin` |
| suppliers bank fields (name, account number, holder) | text | yes | Required before payouts can be issued |

### 4.2 Supplier product create edit and approval

**Requirement SUPPLIERS-002 — Create and edit a product through its approval states**

*As a* Supplier, *I want to* create or edit a product on
`/supplier/products/:id` and move it through Draft → Submit for approval →
Pending/Approved/Rejected, *so that* only reviewed listings reach Buyers.

Behaviour:

1. Saving as a draft writes the product's fields (title, description,
   photos via SUPPLIERS-006, itinerary, pricing, cancellation policy) to
   its `products` row with `status = 'draft'`.
2. Submitting for approval sets `status = 'pending'`. An admin's decision
   (`admin` module) later sets it to `approved` or `rejected`, the latter
   with a `reason` the supplier can read on this same screen.
3. Editing the price or the content fields (`name`, `summary`, `itinerary`,
   `includes`, `excludes`, `policy`, `price`) of a product whose `status`
   is currently `approved` sets it back to `status = 'pending'` on save —
   it is never left `approved` with unreviewed changes live.
4. Editing a non-price, non-content field (for example toggling the
   pause/hide state, SUPPLIERS-003) does not by itself trigger
   re-approval.
5. A rejection reason, once set, is shown to the supplier until the
   product is next submitted and decided again.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | A new product form filled in | Saved as draft | A `products` row exists with `status = 'draft'` and the entered fields |
| AC-2 | A draft product | Submitted for approval | `status` becomes `pending` |
| AC-3 | A product with `status = 'approved'` | The supplier changes its `price` and saves | `status` becomes `pending` again, not left `approved` |
| AC-4 | A product with `status = 'approved'` | The supplier only toggles "pause the sale" and saves | `status` stays `approved`; the pause state is tracked separately (SUPPLIERS-003) |
| AC-5 | A product rejected with reason "Photos too dark" | The supplier opens `/supplier/products/:id` | That reason is shown on the screen |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Not permitted | A supplier attempts to edit a product not owned by their account | Rejected; only the owning supplier may write that `products` row |
| Invalid input | Required fields (title, price) are empty on submit | Inline error; `status` does not move to `pending` |
| Conflict | Two tabs editing the same product save at different times | Last write wins on the full saved form; this is the one write path for a product and the design has no concurrent-edit indicator to specify further |

**Data touched**

| Field | Type | Required | Rule |
|---|---|---|---|
| products.status | text | yes | draft → pending → approved/rejected; approved → pending on price/content edit |
| products.name, summary, itinerary, includes, excludes, policy, price | text/list/longtext/numeric | yes (title, price) | Supplier-editable fields that trigger re-approval when changed on an approved product |
| products.supplier | ref:suppliers | yes | Set to the signed-in supplier's own id; never another's |

**Requirement SUPPLIERS-003 — Hide or pause a published product**

*As a* Supplier, *I want to* hide/pause an approved product without losing
its approval, *so that* I can stop taking bookings temporarily (e.g. fully
booked, off season) without resubmitting it.

Behaviour:

1. Toggling "pause the sale" on an approved product sets a paused flag
   (e.g. `status = 'suspended'`, per the brief's state machine) without
   clearing its approved content or requiring re-approval to unpause.
2. A paused product does not appear in `/search` or Home's featured rows
   (both read `status = 'approved'`).
3. Unpausing returns it to `status = 'approved'` directly — no
   re-approval, since nothing reviewable changed.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | An approved, bookable product | The supplier pauses it | It stops appearing in `/search` results; its `status` reflects the paused state |
| AC-2 | A paused product | The supplier unpauses it | It is immediately bookable again (`status = 'approved'`) with no admin step in between |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Not permitted | A supplier attempts to pause a product not owned by their account | Rejected |

**Data touched** — `products.status`, as the brief's state machine defines
(`Draft → Pending Approval → Approved/Rejected → Suspended`).

### 4.3 Supplier calendar and seasonal pricing

**Requirement SUPPLIERS-004 — Departure dates, capacity and seasonal pricing**

*As a* Supplier, *I want to* set departure dates with their capacity, a
seasonal pricing rule, and block specific dates, within product edit, *so
that* Buyers see the right price and availability for each date.

Behaviour:

1. Adding a departure creates a `departures` row (product, date,
   capacity, seats = capacity initially, price, season, state) scoped to
   the supplier's own product.
2. A seasonal price (`season` naming a rule such as Weekend or Peak
   summer) overrides the product's base `price` on that row only — other
   dates keep the base price.
3. Blocking a date sets that row's `state` to a blocked value; a blocked
   date is excluded from both `/search` (SEARCH-001) and from the
   bookable dates shown on `/tours/:id`'s calendar.
4. `departures.seats` is never set above `capacity` by this requirement —
   only `booking` module's hold/release logic moves it within that
   ceiling.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | A supplier adds a departure for `2026-12-24`, capacity 20, season "Peak summer", price 2,500,000 | Saved | A `departures` row exists with those values and `seats = 20` |
| AC-2 | A departure on a weekday with the base price | The supplier marks a specific Saturday as "Weekend" pricing with a higher price | Only that Saturday's row shows the higher price; weekday rows are unaffected |
| AC-3 | A departure row | The supplier blocks that date | The date no longer appears as pickable on `/tours/:id`'s calendar, and is excluded from search results for that date (SEARCH-001 AC-3) |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Invalid input | Capacity is zero or negative | Rejected with a message naming the minimum; no row written |
| Boundary | Capacity set exactly to the number of seats already booked against that date (if editing an existing row with bookings) | Not reduced below the number of seats already committed — the row is either rejected or capped, never silently overbooking |
| Not permitted | A supplier attempts to add/edit a departure on a product not owned by their account | Rejected |

**Data touched**

| Field | Type | Required | Rule |
|---|---|---|---|
| departures.product, date, capacity, seats, price, season, state | ref/date/number/number/numeric/text/text | yes | capacity ≥ seats already committed; price overrides the product base price on that row only |

### 4.4 Supplier booking and passenger management

**Requirement SUPPLIERS-005 — Bookings list, confirm/reject, and passenger list**

*As a* Supplier, *I want to* see bookings on my products, confirm or
reject the ones needing manual confirmation, and see who is travelling on
a given departure, *so that* I can run the trip.

Behaviour:

1. `/supplier/bookings` lists only bookings whose product belongs to the
   signed-in supplier.
2. For a product whose `confirmation` field is empty (manual confirmation
   required, per `decision.confirmation_mode`), a `Paid` booking shows a
   "Confirm"/"Reject" action; confirming sets `status = 'Confirmed'`,
   rejecting sets it to a cancelled/refund-tracked state.
3. For a product whose `confirmation` field is non-empty, a `Paid` booking
   moves to `Confirmed` automatically (by the `payments`/`booking`
   modules) and this screen shows no manual action for it.
4. Filtering by a chosen departure date shows exactly the bookings for
   that date on that supplier's products — the passenger list.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | Supplier A and Supplier B each have bookings | Supplier A opens `/supplier/bookings` | Only Supplier A's own products' bookings appear |
| AC-2 | A `Paid` booking on a manual-confirmation product | The supplier clicks Confirm | The booking's `status` becomes `Confirmed` |
| AC-3 | A `Paid` booking on a manual-confirmation product | The supplier clicks Reject | The booking moves out of `Confirmed`/`Paid` into a cancelled/refund-tracked state |
| AC-4 | A departure date filter is applied | — | The list shows exactly the bookings whose `date` matches, for that supplier's products only |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Not permitted | A supplier attempts to confirm/reject a booking on a product not theirs | Rejected |
| Not applicable | Guest check-in via QR/code at the departure | Not specified by this requirement: the brief lists it as a non-MVP item and the approved design (`SupplierBookings.tsx`) draws only a "Check in" button with no scanning flow behind it; building scanning behaviour here would be inventing scope the design does not show |

**Data touched**

| Field | Type | Required | Rule |
|---|---|---|---|
| bookings.status | text | yes | Paid → Confirmed (manual approve) or → cancelled/refund state (manual reject), scoped to the supplier's own products |

### 4.5 Supplier revenue and payout reporting

**Requirement SUPPLIERS-007 — Revenue, commission and payout figures**

*As a* Supplier, *I want to* see my revenue, the platform commission taken
and my expected and past payouts, *so that* I know what I am owed.

Behaviour:

1. `/supplier` and `/supplier/account` compute revenue as the sum of the
   supplier's own `Paid`/`Confirmed`/`Completed` bookings' totals.
2. Commission shown is revenue × the applicable commission rate (global,
   or this supplier's override — read from `admin` module's rate, never
   written here).
3. Expected payout is revenue minus commission, for bookings not yet in a
   closed payout period; payout history lists `payouts` rows for this
   supplier, period by period.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | A supplier has `Confirmed` bookings totalling 10,000,000 and a 10% commission rate applies | Views `/supplier` | Revenue shows 10,000,000, commission shows 1,000,000, expected payout shows 9,000,000 |
| AC-2 | No commission rate has been set globally or for this supplier | Views `/supplier` | Commission shows 0 and the note that no rate is set yet (matching the design's existing copy) |
| AC-3 | A closed payout period exists for this supplier | Views `/supplier/account` | That period's gross, commission and net appear in payout history |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Not permitted | A supplier's figures must never include another supplier's bookings or payouts | Excluded entirely from the sums and the list |
| Boundary | Commission rate is exactly 0% | Commission shows 0; expected payout equals revenue |

**Data touched**

| Field | Type | Required | Rule |
|---|---|---|---|
| bookings.total, status, supplier_name | numeric/text | yes | Summed per the owning supplier only |
| payouts.supplier_name, gross, commission, net, status, paid_on | text/numeric/text/date | yes | Scoped to the signed-in supplier |

### 4.6 Supplier review replies

**Requirement SUPPLIERS-006B — Reply to a guest review**

*As a* Supplier, *I want to* publish a reply under a review of my
product, *so that* I can respond publicly to feedback.

Behaviour:

1. Submitting a reply on `/supplier/reviews` writes to that review's
   `reviews.reply` field, scoped to a review on one of the supplier's own
   products.
2. The reply is then shown on `/tours/:id` under that review (already
   drawn by `TripReviews.tsx`, which renders `reply` when present).
3. A supplier may not reply to a review on a product they do not own, and
   may not change a review's own visibility (`reviews.status`) — that is
   `admin`'s moderation action.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | A published review on the supplier's own product, with no reply yet | The supplier submits reply text | `reviews.reply` is set; `/tours/:id` shows it under that review |
| AC-2 | A review on a product the supplier does not own | The supplier attempts to reply | Rejected |
| AC-3 | A review already has a reply | The supplier submits a new reply | The existing reply is replaced by the new text, not duplicated |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Not permitted | Review belongs to a product not owned by the supplier | Rejected (AC-2) |
| Invalid input | Reply text submitted empty | Inline error; `reviews.reply` is not cleared by an empty submission |

**Data touched** — `reviews.reply`, scoped to reviews on the supplier's
own products only.

### 4.7 The shared upload endpoint

**Requirement SUPPLIERS-006 — Upload a document or photo via the shared media endpoint**

*As a* Supplier, *I want to* upload a licence document (registration) or a
product photo (product create/edit), *so that* it is stored, compressed
where it is an image, and served from a CDN URL I can attach to my form.

Behaviour:

1. `POST /v1/media` accepts a file upload, compresses it when it is an
   image, stores it, and returns a CDN URL.
2. SUPPLIERS-001 (licence/agency documents) and SUPPLIERS-002 (product
   photos) both call this same endpoint and store the URL it returns —
   the endpoint itself does not know which form called it.
3. An upload that fails (wrong type, too large, storage error) returns an
   error the calling form surfaces; nothing partially-written is left
   referencing a file that does not exist.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | A supplier uploads a product photo (JPEG/PNG) | `POST /v1/media` | A CDN URL is returned, and the photo is retrievable at that URL, compressed from its original size |
| AC-2 | A supplier uploads a licence document (PDF) | `POST /v1/media` | A CDN URL is returned for the document (no compression required for a non-image file) |
| AC-3 | An upload exceeds the accepted size or type | `POST /v1/media` | Rejected with an error; no URL is returned and no partial file is stored |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Invalid input | File type not accepted, or file too large | Rejected (AC-3) |
| Upstream failure | Storage/CDN write fails | Rejected with an error; the calling form is told the upload failed and keeps its other fields intact |

**Data touched** — none in this project's own tables; returns a URL the
calling form stores on `suppliers.documents` or `products.image`.

## 5. Screens

| Screen | Section in the design | Functions it serves | States that must exist |
|---|---|---|---|
| Profile & payouts (`/supplier/account`) | `SupplierAccount.tsx` | SUPPLIERS-001, SUPPLIERS-007 | default |
| Products (`/supplier/products`) | `SupplierProducts.tsx` | SUPPLIERS-002 | default, empty (no product matches filters) |
| Edit product (`/supplier/products/:id`) | `SupplierProduct.tsx` | SUPPLIERS-002, SUPPLIERS-003, SUPPLIERS-004, SUPPLIERS-006 | default, saved |
| Bookings (`/supplier/bookings`) | `SupplierBookings.tsx` | SUPPLIERS-005 | default, empty |
| Reviews (`/supplier/reviews`) | `SupplierReviews.tsx` | SUPPLIERS-006B | default, empty |
| Overview (`/supplier`) | `SupplierHome.tsx` | SUPPLIERS-007 | default |

## 6. Non-functional requirements

| Area | Requirement |
|---|---|
| Privacy | A supplier's products, bookings, payouts and profile are never exposed to another supplier's session |
| Performance | Media upload (SUPPLIERS-006) completes within 5s for a photo up to 10MB |

## 7. Dependencies and assumptions

- **Depends on:** `auth` module, for the signed-in supplier session.
- **Depends on:** `data` module, for `suppliers`, `products`, `departures`,
  `bookings`, `payouts`, `reviews` tables.
- **Depends on:** `admin` module, for the commission rate this module
  reads (SUPPLIERS-007) and the approval decision this module's statuses
  wait on.
- **Assumption (recorded in memory `decision.confirmation_mode`):** a
  non-empty `products.confirmation` means instant-confirm; empty means
  the supplier must confirm manually, per SUPPLIERS-005.

| Open question | Proposed default | Who decides |
|---|---|---|
| Does the commission rate vary by supplier type (tour vs homestay vs transport)? | No — one global rate for MVP, per `decision.commission_rate` | Stakeholder |

## 8. Traceability

| Plan item | Requirement ids | Test cases |
|---|---|---|
| Supplier registration and verification | SUPPLIERS-001, SUPPLIERS-006 | `test-cases/supplier-registration-and-verification.md` |
| Supplier product create edit and approval | SUPPLIERS-002, SUPPLIERS-003, SUPPLIERS-006 | `test-cases/supplier-product-create-edit-and-approval.md` |
| Supplier calendar and seasonal pricing | SUPPLIERS-004 | `test-cases/supplier-calendar-and-seasonal-pricing.md` |
| Supplier booking and passenger management | SUPPLIERS-005 | `test-cases/supplier-booking-and-passenger-management.md` |
| Supplier revenue and payout reporting | SUPPLIERS-007 | `test-cases/supplier-revenue-and-payout-reporting.md` |
| Supplier review replies | SUPPLIERS-006B | `test-cases/supplier-review-replies.md` |
