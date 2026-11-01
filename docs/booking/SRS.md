# SRS — Booking

Module: `booking`
Design: [View the approved design](http://localhost:9400)
Design system: `design/design-system.md`

## 1. Purpose

The `booking` module turns `/book/:id`, `/checkout/:id` (its voucher step)
and `/booking/:code` into a real reservation system: creating a booking with
a time-limited seat hold, applying a discount code, confirming it after
payment, and letting a Buyer request cancellation/rescheduling. Without it a
booking is never more than numbers typed into a form that disappear on
reload, and the brief's overbooking-prevention requirement is unmet.

## 2. Actors

| Actor | Who they are | What they may do in this module |
|---|---|---|
| Buyer | Signed-in traveller | Create a booking, apply a voucher, view its confirmation, request cancellation/rescheduling |
| Supplier | Product owner | Has their departure's capacity and seats affected by bookings on their product (read elsewhere, in `suppliers` module) |
| System | The hold-expiry process | Releases seats from an unpaid booking after 15 minutes |

## 3. Scope

**In scope** — three functions specified below:

- Booking creation with inventory hold
- Booking confirmation with QR and notice
- Voucher and discount code checkout
- Buyer cancellation and refund requests

**Out of scope**:

- Taking payment itself and the gateway callback — `payments` module
  (Checkout payment via VNPay MoMo ZaloPay). This module creates the booking
  as `Awaiting Payment`; `payments` moves it to `Paid`/`Confirmed`.
- Sending the email/Zalo confirmation message — `notifications` module. This
  module triggers it; `notifications` delivers it.
- Approving a manual refund — `admin` module (Admin bookings search and
  refunds). This module only records the Buyer's request and its tracked
  status.
- Listing a Buyer's booking history on `/account` — `account` module.
- Supplier confirming/rejecting a manual-confirmation booking — `suppliers`
  module (Supplier booking and passenger management).

## 4. Functional requirements

### 4.1 Booking creation with inventory hold

**Requirement BOOKING-001 — Create a booking with a 15-minute seat hold**

*As a* Buyer, *I want to* pick a date, adults/children and a package on
`/book/:id` and have my seats held while I pay, *so that* nobody else can
book the same seats out from under me.

Behaviour:

1. Submitting the form on `/book/:id` creates a `bookings` row with status
   `Awaiting Payment`, and decrements `departures.seats` for the chosen
   departure by `adults + children`, in one transaction — the decrement and
   the booking row are never one without the other.
2. The booking is never created, and `departures.seats` is never decremented,
   if `adults + children` exceeds the departure's seats remaining at the
   moment of the attempt.
3. A `heldUntil` timestamp 15 minutes from creation is stored on the booking.
   A background process (or an equivalent lazy check on read) that finds an
   `Awaiting Payment` booking whose `heldUntil` has passed releases its held
   seats back to `departures.seats` and marks the booking `Cancelled`.
4. Traveller name, phone, email and note are stored on the booking.
5. The decrement in step 1 and the release in step 3 use a locking or atomic
   update so two simultaneous bookings on the same departure can never both
   succeed past the seats remaining (no lost-update race).

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | A departure with 5 seats remaining | A Buyer books 2 adults + 1 child | `departures.seats` for that departure reads 2 afterward, and a `bookings` row exists with status `Awaiting Payment` |
| AC-2 | A departure with 2 seats remaining | A Buyer attempts to book 3 adults | No `bookings` row is created; `departures.seats` is unchanged at 2 |
| AC-3 | A booking created 16 minutes ago, still `Awaiting Payment` | The hold-expiry check runs (or the departure is next read) | The booking's status becomes `Cancelled`; the seats it held are added back to `departures.seats` |
| AC-4 | Two Buyers submit bookings for the last 1 remaining seat within the same second | Both requests are processed | Exactly one booking is created for that seat; the other is rejected as AC-2, never both succeeding |
| AC-5 | A booking created 10 minutes ago, still `Awaiting Payment` | The hold-expiry check runs | The booking is untouched; its seats remain held |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Boundary | `adults + children` exactly equals seats remaining | The booking is created, seats remaining becomes 0 |
| Invalid input | Required traveller fields (name, phone, email) are missing | Inline error on the field; no booking row is created |
| Conflict | Concurrent bookings on the same departure (AC-4) | Resolved by the atomic decrement; the loser is told the seats are no longer available, not left in an inconsistent state |
| Upstream failure | The database write fails mid-transaction | Neither the booking row nor the seat decrement is left partially applied |

**Data touched**

| Field | Type | Required | Rule |
|---|---|---|---|
| bookings.status | text | yes | Awaiting Payment on creation |
| bookings.date, travellers, total | date/number/price | yes | Set from the form and the departure's price |
| departures.seats | number | yes | Decremented on hold, incremented on release; never negative |
| bookings.heldUntil | timestamp | yes | Now + 15 minutes |

---

### 4.2 Voucher and discount code checkout

**Requirement BOOKING-002 — Apply a discount code at checkout**

*As a* Buyer, *I want to* enter a discount code on `/checkout/:id` and have
it reduce my total if it is valid, *so that* I can use a promotion.

Behaviour:

1. A submitted code is looked up in `vouchers` by `code` (case-insensitive).
2. Valid — status `Active`, `used < limit`, and `expires` is in the future —
   applies the voucher's discount to the booking's total and increments
   `vouchers.used` by 1, once, for that booking.
3. Invalid for any reason (not found, expired, over limit, inactive) is
   rejected with a message naming why, and the total is unchanged.
4. A voucher is never applied twice to the same booking.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | A voucher `CUALO10`, active, `used=3`/`limit=10`, not expired | Entered at checkout | The booking's total reduces by the voucher's discount; `vouchers.used` for `CUALO10` becomes 4 |
| AC-2 | A voucher at `used=10`/`limit=10` | Entered at checkout | Rejected with an over-limit message; `used` stays 10; total is unchanged |
| AC-3 | A voucher whose `expires` date has passed | Entered at checkout | Rejected with an expired message; total unchanged |
| AC-4 | A code that matches no `vouchers` row | Entered at checkout | Rejected with a not-found message; total unchanged |
| AC-5 | A voucher already applied once to this booking | The same checkout session re-submits payment | `vouchers.used` is not incremented a second time for the same booking |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Boundary | `used` exactly one below `limit` | Applying it succeeds and brings `used` to `limit` exactly |
| Invalid input | Code field submitted empty | No lookup is performed; checkout proceeds with no discount |

**Data touched**

| Field | Type | Required | Rule |
|---|---|---|---|
| vouchers.used | number | yes | Incremented by exactly 1 per successful, distinct application |
| vouchers.status, limit, expires | text/number/date | yes | Read-only in this requirement; written by `admin` (Admin content and homepage management) |

---

### 4.3 Booking confirmation with QR and notice

**Requirement BOOKING-003 — Show the confirmed booking with its code and QR**

*As a* Buyer, *I want to* see my booking code and a scannable QR on
`/booking/:code` once I have paid, *so that* I have proof of the booking and
can check in.

Behaviour:

1. `/booking/:code` looks up `bookings` by `code`. A match whose status is
   `Confirmed` (or later: `Completed`) renders the full confirmation —
   code, QR, trip, date, travellers, amount paid.
2. Reaching `Confirmed` status (done by the `payments` module) triggers one
   notification event consumed by the `notifications` module; this module's
   responsibility ends at raising that event.
3. A code that matches no booking renders a clear not-found state, never a
   blank or partially-filled page.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | A booking `NA-7X42K9` with status `Confirmed` | `/booking/NA-7X42K9` loads | The page renders that booking's code, a QR encoding it, trip, date, travellers and total |
| AC-2 | No booking has code `NA-000000` | `/booking/NA-000000` loads | A not-found state renders, not the confirmation layout with empty fields |
| AC-3 | A booking moves from `Awaiting Payment` to `Confirmed` | The transition happens (via `payments`) | Exactly one notification event is recorded for that booking (checked in `notifications` module) |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Not found | Code matches no booking | Not-found state (AC-2) |
| Not applicable | — | A booking still `Awaiting Payment` reached by its code shows the information available without inventing a QR for an unconfirmed booking; the approved design has no separate "pending" confirmation screen, so this case is out of scope for this requirement and covered instead by `/account`'s status display (`account` module) |

**Data touched** — `bookings.code, status, date, travellers, total`, read-only in this requirement.

---

### 4.4 Buyer cancellation and refund requests

**Requirement BOOKING-004 — Request cancellation or rescheduling**

*As a* Buyer, *I want to* request cancellation or rescheduling of a booking
from `/account` and track its refund status, *so that* I am not stuck once
my plans change.

Behaviour:

1. A request on a Buyer's own booking creates a tracked status on that
   booking (e.g. a `Refund requested` state, or a row in `complaints` per the
   schema, keyed to the booking's code) visible to that Buyer afterward.
2. Creating the request never itself changes the booking to `Refunded` — the
   booking's status changes only when an admin processes a manual refund
   (`admin` module, Admin bookings search and refunds).
3. A Buyer may only request this against their own booking.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | A Buyer's own `Confirmed` booking | Requests cancellation | A tracked record exists afterward that the Buyer can see showing a "requested" status; the booking's own status is unchanged |
| AC-2 | The same request | — | The booking does not become `Refunded` as a direct result of the request alone |
| AC-3 | A Buyer attempts to request this against a booking that is not theirs | — | Rejected; no record is created |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Not permitted | Booking belongs to a different account | Rejected (AC-3) |
| Conflict | A request already open for the same booking | A second request does not create a duplicate open record; it either updates the existing one or is rejected with a message |

**Data touched**

| Field | Type | Required | Rule |
|---|---|---|---|
| complaints.booking_code, customer, issue, status | text/number | yes | Created by this requirement; `status` starts as the open/requested state |

## 5. Screens

| Screen | Section in the design | Functions it serves | States that must exist |
|---|---|---|---|
| Book (`/book/:id`) | Book | BOOKING-001 | default |
| Pay (`/checkout/:id`) | Pay | BOOKING-002 | default, voucher-error |
| Booking confirmed (`/booking/:code`) | Booking confirmed | BOOKING-003 | default, not-found |
| My bookings (`/account`) | My bookings | BOOKING-004 | default (request action) |

## 6. Non-functional requirements

| Area | Requirement |
|---|---|
| Concurrency | The seat-hold decrement and release are atomic under concurrent requests on the same departure (BOOKING-001 AC-4) |
| Performance | Booking creation (including the hold) completes within 2s at the project's seeded data volume |

## 7. Dependencies and assumptions

- **Depends on:** `data` module, for the `bookings`, `departures`, `vouchers`, `complaints` tables.
- **Depends on:** `payments` module, to move a booking from `Awaiting Payment` to `Paid`/`Confirmed`.
- **Depends on:** `notifications` module, to deliver the confirmation message this module's BOOKING-003 AC-3 raises.
- **Assumption (recorded in memory `decision.hold_and_scope`):** the 15-minute hold has no separate party-size ceiling beyond the departure's own capacity.
- **Assumption (recorded in memory `decision.hold_and_scope`):** MVP's departure scope is Nghệ An-based products only; inbound packages from Hà Nội/HCM are out of scope.
- **Assumption (recorded in memory `decision.cancellation_window`):** the default cancellation/refund window, until a supplier or admin sets one, is 48 hours before departure for a full refund.
- **Assumption (recorded in memory `decision.confirmation_mode`):** manual-vs-instant confirmation is decided per product via the `confirmation` field; empty means manual.

| Open question | Proposed default | Who decides |
|---|---|---|
| Is there a minimum/maximum group size the 15-minute hold needs to account for beyond the departure's own capacity? | No separate ceiling; the departure's capacity is the only limit | Stakeholder |
| Does the platform cover departures only from Nghệ An, or also inbound tours from Hà Nội/HCM? | Nghệ An-based departures only for MVP | Stakeholder |
| Which cancellation/refund window applies by default? | 48 hours before departure for a full refund | Stakeholder |

## 8. Traceability

| Plan item | Requirement ids | Test cases |
|---|---|---|
| Booking creation with inventory hold | BOOKING-001 | `test-cases/booking-creation-with-inventory-hold.md` |
| Booking confirmation with QR and notice | BOOKING-003 | `test-cases/booking-confirmation-with-qr-and-notice.md` |
| Voucher and discount code checkout | BOOKING-002 | `test-cases/voucher-and-discount-code-checkout.md` |
| Buyer cancellation and refund requests | BOOKING-004 | `test-cases/buyer-cancellation-and-refund-requests.md` |
