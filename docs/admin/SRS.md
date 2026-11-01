# SRS — admin

Module: `admin`
Design: [View the approved design](http://localhost:9400)
Design system: `design/design-system.md`

## 1. Purpose

The `admin` module is the Admin's half of the CMS: approving/rejecting
supplier profiles and products, moderating reviews, managing users and
sub-admin accounts, searching and resolving disputed bookings, setting
commission and running payout reconciliation, managing homepage content,
and the platform-wide settings, notifications overview and audit log on
`/admin/system`. It is what makes the approval workflow the whole product
depends on ("Supplier creates a product → Admin reviews and approves it →
product is published") an actual gate rather than a product sitting in
`pending` forever.

## 2. Actors

| Actor | Who they are | What they may do in this module |
|---|---|---|
| Admin | A signed-in account with role `admin` | Everything in this module |
| Sub-admin | A signed-in account with role `admin` and a restricted `permissions` value | Only the sections their `permissions` value grants (e.g. moderation-only, finance-only) |

## 3. Scope

**In scope** — the six functions specified below, by their plan titles:

- Admin supplier and product approval queue
- Admin review moderation
- Admin user and sub-admin management
- Admin bookings search and refunds
- Admin commission and payout reconciliation
- Admin content and homepage management
- Admin platform settings and audit log

**Out of scope** — a reader would expect these here; they live elsewhere:

- A supplier's own submission of a profile or product — `suppliers`
  module; this module only decides on what has already been submitted.
- A buyer's cancellation/rescheduling request itself — `booking` module
  (BOOKING-004); this module's manual refund (ADMIN-004) is the admin
  side of resolving that request.
- Sending the notification that an approval/rejection triggers —
  `notifications` module.

## 4. Functional requirements

### 4.1 Admin supplier and product approval queue

**Requirement ADMIN-001 — Approve or reject a supplier profile or a product**

*As an* Admin, *I want to* review a supplier profile or a submitted
product and approve it, reject it with a reason, or request edits, *so
that* only reviewed suppliers and products are published.

Behaviour:

1. `/admin/queue` lists `suppliers` rows with `verified = false` and
   `products` rows with `status = 'pending'`.
2. Approving a supplier sets `suppliers.verified = true`. Approving a
   product sets `products.status = 'approved'`.
3. Rejecting either requires a reason; the supplier's row or the
   product's row records that reason and (for a product) its `status`
   becomes `rejected`; the reason is visible to the submitting supplier
   on their own screen (SUPPLIERS-001/SUPPLIERS-002).
4. "Request edits" leaves the product out of `approved` and records the
   requested-edits reason the same way rejection does, distinguishing
   from an outright rejection only in the message shown, per the design's
   single "Reject with this reason" action — see §7's open question on
   whether a distinct state is needed.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | A supplier row with `verified = false` | The admin clicks Approve | `suppliers.verified` becomes `true` |
| AC-2 | A product row with `status = 'pending'` | The admin clicks Approve | `products.status` becomes `approved` |
| AC-3 | A product row with `status = 'pending'` | The admin rejects it with reason "Photos too dark" | `products.status` becomes `rejected`; that exact reason is stored and later visible to the supplier |
| AC-4 | An admin attempts to reject without entering a reason | — | Rejected — the action requires a reason; `products.status` is unchanged |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Invalid input | Rejection reason field submitted empty | AC-4 |
| Not permitted | A sub-admin without moderation permission attempts this action | Rejected per ADMIN-003's permission scoping |
| Boundary | Two admins act on the same queue item near-simultaneously | The second write either finds the item already decided (and is told so) or the last write wins consistently — never two conflicting decisions silently both recorded |

**Data touched**

| Field | Type | Required | Rule |
|---|---|---|---|
| suppliers.verified | bool | yes | false → true on approval only |
| products.status | text | yes | pending → approved or rejected |
| products rejection reason (stored field) | text | yes on reject | Required for a rejection to be recorded |

### 4.2 Admin review moderation

**Requirement ADMIN-002 — Hide or publish a review**

*As an* Admin, *I want to* hide a review that violates policy and publish
it again if needed, *so that* `/tours/:id` never shows content that
should not be public.

Behaviour:

1. Hiding a review sets `reviews.status` to `hidden`; publishing sets it
   to `published`. A `reported` review may be hidden or restored to
   `published` by the same action.
2. `/tours/:id`'s review list (`TripReviews.tsx`, filtered to
   `status = 'published'` by SITE-002) stops showing a hidden review
   immediately.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | A published review | The admin hides it | `reviews.status` becomes `hidden`; it no longer appears on `/tours/:id` |
| AC-2 | A hidden review | The admin publishes it | `reviews.status` becomes `published`; it reappears on `/tours/:id` |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Not permitted | A sub-admin without moderation permission attempts this | Rejected per ADMIN-003 |

**Data touched** — `reviews.status`, moved between `published`, `hidden`
(and read, not written, for `reported`).

### 4.3 Admin user and sub-admin management

**Requirement ADMIN-003 — List users, lock/unlock accounts, and create scoped sub-admins**

*As an* Admin, *I want to* search Buyers and Suppliers, lock/unlock their
accounts, and create a sub-admin scoped to a restricted permission set, *so
that* I can manage access and delegate without giving away full control.

Behaviour:

1. `/admin/users` lists `users` rows, filterable by role and status,
   searchable by name/email/role.
2. Locking sets `users.status = 'Locked'`; a locked account's sign-in is
   rejected per `auth` module's AUTH-002/AUTH-003/AUTH-004 status check.
   Unlocking reverses it.
3. Creating a sub-admin writes a `users` row with `role = 'admin'` and a
   `permissions` value naming the restricted set (e.g.
   "moderation-only", "finance-only").
4. A sub-admin signed in with a restricted `permissions` value sees, in
   `DashboardLayout`'s nav and on each `/admin/*` route, only the
   sections their `permissions` value grants; any other `/admin/*` route
   typed directly is refused the same way `RequireRole` refuses a
   non-admin role.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | A `users` row with `status = 'Active'` | The admin clicks Lock | `status` becomes `Locked`; that account's next sign-in attempt is rejected |
| AC-2 | A locked account | The admin clicks Unlock | `status` becomes `Active`; sign-in succeeds again |
| AC-3 | The admin creates a sub-admin with `permissions = 'moderation-only'` | That sub-admin signs in | They reach `/admin/moderation` and `/admin/queue`, but a direct visit to `/admin/finance` is refused |
| AC-4 | A search for "cualohomestay" | — | Returns only `users` rows matching that text in name/email/role |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Not permitted | A sub-admin without user-management permission attempts to lock/unlock or create a sub-admin | Rejected |
| Boundary | An admin attempts to lock their own account | Rejected or requires a second admin — never leaves the platform with zero unlocked admins as a direct, unconfirmed result of one click |

**Data touched**

| Field | Type | Required | Rule |
|---|---|---|---|
| users.status | text | yes | Active ↔ Locked |
| users.role, permissions | text | yes (for sub-admin creation) | role = 'admin', permissions names the restricted set |

### 4.4 Admin bookings search and refunds

**Requirement ADMIN-004 — View all bookings, search by ID, and process a manual refund**

*As an* Admin, *I want to* see every booking, search by its code, and
process a manual refund against a complaint, *so that* I can resolve
disputes the platform's automatic flow does not.

Behaviour:

1. `/admin/bookings` lists every `bookings` row, filterable by status and
   date range, searchable by code/product/supplier.
2. Searching by a booking's exact code returns that one booking.
3. "Refund manually" against a `complaints` row sets the matching
   booking's `status` to `Refunded` and the complaint's `status` to
   resolved/refunded.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | A booking with code `NA-7X42K9` exists among many | The admin searches `NA-7X42K9` | Exactly that booking is returned |
| AC-2 | A complaint referencing booking `NA-7X42K9` | The admin clicks "Refund manually" | `bookings.status` for `NA-7X42K9` becomes `Refunded`; the complaint's `status` reflects the resolution |
| AC-3 | A search code matching no booking | — | No results, not an error |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Not permitted | A sub-admin without finance/dispute permission attempts a manual refund | Rejected |
| Not found | Search code matches nothing | AC-3 |

**Data touched**

| Field | Type | Required | Rule |
|---|---|---|---|
| bookings.status | text | yes | → Refunded via manual admin action only |
| complaints.status | text | yes | → resolved/refunded on the same action |

### 4.5 Admin commission and payout reconciliation

**Requirement ADMIN-005 — Set commission and reconcile payouts**

*As an* Admin, *I want to* set a global or per-supplier commission rate
and run payout reconciliation, *so that* suppliers are paid correctly and
I can see platform revenue.

Behaviour:

1. `/admin/finance` sets a global commission percentage (applies to all
   suppliers with no override) and, per the existing override field on
   `suppliers.commission`, an individual supplier's own rate.
2. A commission change applies to bookings confirmed from that point
   forward; it does not retroactively alter already-closed payout
   periods.
3. Running reconciliation for a period creates `payouts` rows (one per
   supplier with activity in that period): gross (sum of that supplier's
   confirmed bookings), commission (gross × applicable rate), net (gross
   − commission), status `Pending` until marked paid.
4. Platform revenue for a period is the sum of the commission column
   across that period's `payouts` rows.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | No commission rate set | The admin sets the global rate to 10% | New bookings confirmed after this reflect 10% commission in supplier revenue figures (SUPPLIERS-007 AC-1) |
| AC-2 | Supplier X has an override of 15%; the global rate is 10% | Reconciliation runs for a period with Supplier X's bookings | Supplier X's payout row uses 15%, not the global 10% |
| AC-3 | Reconciliation runs for a period with 3 suppliers having confirmed bookings | — | 3 `payouts` rows are created, one per supplier, each with gross/commission/net matching that supplier's bookings and rate |
| AC-4 | A payout period already reconciled | The commission rate is changed afterward | The already-created `payouts` rows for that period are unchanged |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Boundary | Commission rate set to 0% | Payout net equals gross; commission column reads 0 |
| Invalid input | Commission rate outside 0–100 | Rejected with a message naming the valid range |
| Not permitted | A sub-admin without finance permission attempts this | Rejected |

**Data touched**

| Field | Type | Required | Rule |
|---|---|---|---|
| settings (or an equivalent global-rate field) | numeric | yes | The platform's default commission percentage |
| suppliers.commission | number | no | Per-supplier override, used instead of the global rate when set |
| payouts.period, supplier_name, gross, commission, net, status, paid_on | text/numeric/text/date | yes | Created by reconciliation, one row per supplier per period |

### 4.6 Admin content and homepage management

**Requirement ADMIN-006 — Manage categories, destinations and homepage banners**

*As an* Admin, *I want to* add, edit and remove categories, destinations
and homepage content, *so that* the storefront's Home page reflects
current offerings.

Behaviour:

1. `/admin/content` edits `categories` and `destinations` rows.
2. A change is reflected on the storefront's Home page through the
   existing data API — no separate publish step.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | An admin edits a destination's name and from-price | Saved | `/` shows the updated name and price for that destination |
| AC-2 | An admin adds a new category | Saved | `/`'s category chip row includes the new category, linking to `/search?kind=<id>` |
| AC-3 | An admin removes a destination | Saved | It no longer appears on `/`'s destinations grid |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Not permitted | A sub-admin without content permission attempts this | Rejected |
| Invalid input | Destination name left empty on save | Inline error; not saved |

**Data touched** — `categories.name, icon`; `destinations.name, line,
image, from_price`.

### 4.7 Admin platform settings and audit log

**Requirement ADMIN-007 — Platform settings, policies, and the audit log**

*As an* Admin, *I want to* set platform-wide settings (the ones
`/admin/system` lists as "decisions waiting on you"), edit the terms and
email-template text, and see a log of every change anyone has made, *so
that* the platform has one place for defaults and one record of who did
what.

Behaviour:

1. `/admin/system` lets the admin set each `settings` row's `value`
   (e.g. the default cancellation window, if the stakeholder decides a
   platform default is needed per `decision.cancellation_window`).
2. Editing the terms/conditions text or an email template's text saves
   that text for later use by `notifications`/the storefront's static
   pages.
3. Every write this module makes anywhere (ADMIN-001 through ADMIN-006,
   and this requirement's own settings/template edits) creates one
   `audit` row: when, who, what action, on what target.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | A `settings` row named "Default cancellation window" with no value | The admin sets it to "48 hours" | `settings.value` for that row becomes "48 hours" |
| AC-2 | The admin approves a product (ADMIN-001 AC-2) | — | An `audit` row is created recording that admin, the action "approved", and the product as the target |
| AC-3 | The admin edits the booking confirmation email template | Saved | The new template text is stored and an `audit` row records the edit |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Not permitted | A sub-admin without system permission attempts to change settings | Rejected |
| Invalid input | A settings value submitted empty where the field requires one | Inline error; not saved |

**Data touched**

| Field | Type | Required | Rule |
|---|---|---|---|
| settings.value | text | no | Admin-set platform defaults |
| audit.at, who, action, target | text | yes | One row per write this module makes, created automatically — never a manual admin entry |

## 5. Screens

| Screen | Section in the design | Functions it serves | States that must exist |
|---|---|---|---|
| Approval queue (`/admin/queue`) | `AdminQueue.tsx` | ADMIN-001 | default, empty |
| Review moderation (`/admin/moderation`) | `AdminModeration.tsx` | ADMIN-002 | default, empty |
| Users & roles (`/admin/users`) | `AdminUsers.tsx` | ADMIN-003 | default, empty |
| Bookings & disputes (`/admin/bookings`) | `AdminBookings.tsx` | ADMIN-004 | default, empty |
| Finance (`/admin/finance`) | `AdminFinance.tsx` | ADMIN-005 | default |
| Content & marketing (`/admin/content`) | `AdminContent.tsx` | ADMIN-006 | default |
| System (`/admin/system`) | `AdminSystem.tsx` | ADMIN-007 | default |
| Overview (`/admin`) | `AdminHome.tsx` | reads ADMIN-001/004/005 figures | default |

## 6. Non-functional requirements

| Area | Requirement |
|---|---|
| Privacy | A sub-admin's session never returns data for a section their `permissions` value does not grant, even via a direct API call |
| Auditability | Every state-changing admin action produces exactly one `audit` row; none is skipped and none is user-editable after the fact |

## 7. Dependencies and assumptions

- **Depends on:** `auth` module, for the signed-in admin/sub-admin
  session and its `permissions` value.
- **Depends on:** `data` module, for every table this module reads and
  writes (`suppliers`, `products`, `reviews`, `users`, `bookings`,
  `complaints`, `payouts`, `categories`, `destinations`, `settings`,
  `audit`).
- **Depends on:** `suppliers` module's submissions, `booking` module's
  complaints, as the inputs this module decides on.
- **Assumption (recorded in memory `decision.commission_rate`):** MVP
  ships one global commission percentage, default unset = 0%, with a
  per-supplier override field; setting a rate per supplier *type* is the
  open question below.

| Open question | Proposed default | Who decides |
|---|---|---|
| Does the commission rate vary by supplier type (tour vs homestay vs transport), or is one global rate fine for MVP? | One global rate, with the existing per-supplier override; no per-type rate for MVP | Stakeholder |
| Is "request edits" a distinct product state from "rejected", or the same rejection action with different wording? | Same action, same `rejected` status; the message shown is the only difference, since the design draws one "Reject with this reason" control | Stakeholder |

## 8. Traceability

| Plan item | Requirement ids | Test cases |
|---|---|---|
| Admin supplier and product approval queue | ADMIN-001 | `test-cases/admin-supplier-and-product-approval-queue.md` |
| Admin review moderation | ADMIN-002 | `test-cases/admin-review-moderation.md` |
| Admin user and sub-admin management | ADMIN-003 | `test-cases/admin-user-and-sub-admin-management.md` |
| Admin bookings search and refunds | ADMIN-004 | `test-cases/admin-bookings-search-and-refunds.md` |
| Admin commission and payout reconciliation | ADMIN-005 | `test-cases/admin-commission-and-payout-reconciliation.md` |
| Admin content and homepage management | ADMIN-006 | `test-cases/admin-content-and-homepage-management.md` |
| Admin platform settings and audit log | ADMIN-007 | `test-cases/admin-platform-settings-and-audit-log.md` |
