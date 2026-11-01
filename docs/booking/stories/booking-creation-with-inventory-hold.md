# Story — Booking creation with inventory hold

Module: `booking`
Requirement: BOOKING-001 (`docs/booking/SRS.md` §4.1)

## User story

As a Buyer, I want to pick a date, adults/children and a package on
`/book/:id` and have my seats held while I pay, so that nobody else can
book the same seats out from under me.

## Scope

**In scope**

- The booking form on `/book/:id`: date (departure) select, adults/children
  counters, package selection (if the product has more than one), traveller
  fields (name, phone, email, note).
- On submit: create a `bookings` row with status `Awaiting Payment`,
  decrement `departures.seats` by `adults + children`, atomically, in one
  transaction.
- Reject the submission (no row created, no decrement) if the party size
  exceeds the departure's remaining seats at the moment of the attempt.
- Store a `heldUntil` timestamp 15 minutes from creation.
- A hold-expiry mechanism (background sweep or lazy check on read) that
  flips an expired, still-`Awaiting Payment` booking to `Cancelled` and
  returns its held seats to `departures.seats`.
- Atomic/locking seat arithmetic so two simultaneous bookings on the same
  departure cannot both succeed past seats remaining.

**Out of scope**

- Taking payment and the gateway callback that moves the booking to
  `Paid`/`Confirmed` — `payments` module (Checkout payment via VNPay MoMo
  ZaloPay).
- Applying a voucher/discount code — `payments` module's checkout step
  (Voucher and discount code checkout), which reads this booking's total.
- Sending the confirmation email/Zalo message — `notifications` module.
- The `/booking/:code` confirmation screen and its QR — Booking confirmation
  with QR and notice (separate plan item).
- Listing this booking on `/account` — Buyer booking history and status.
- Supplier confirming/rejecting a manual-confirmation booking —
  Supplier booking and passenger management.
- Any UI beyond `/book/:id` itself; the booking this story creates is read,
  not rendered, by every other screen above.

## UI scope

Screen: `/book/:id`, section "Book" in the approved design, **default**
state only (the design has one state for this screen — there is no
separate "seats sold out" layout; the form's own validation message covers
that case per SC-4 below).

- Reuses the design's existing Input, Select and Button components
  (design-system.md §2.1, §2.3, §2.4) — no new component.
- Fields: departure date (`Select`), adults (`Input type=number` or
  stepper), children (same), package (`Select`, shown only if the product
  has more than one package), traveller name/phone/email (`Input`), note
  (`Textarea`).
- Submitting shows the Button's existing disabled/loading pattern; on
  success the Buyer proceeds to `/checkout/:id` (that step belongs to the
  Checkout payment / Voucher stories — this story only needs the booking id
  to exist for that redirect to be wired).
- Validation errors render inline under the field, per design-system.md
  §2.3 states and §3 error wording (plain, short, `role="alert"` for the
  submit-level error such as "not enough seats left").

## Acceptance criteria

- SC-1 [BOOKING-001 AC-1]: Given a departure with 5 seats remaining, when a
  Buyer submits the form for 2 adults + 1 child with valid traveller fields,
  then a `bookings` row is created with status `Awaiting Payment` and that
  departure's `seats` reads 2 afterward, in the same transaction.
- SC-2 [BOOKING-001 AC-2]: Given a departure with 2 seats remaining, when a
  Buyer submits the form for 3 adults, then no `bookings` row is created,
  `departures.seats` stays at 2, and the Buyer sees an inline message that
  not enough seats remain.
- SC-3 [BOOKING-001 AC-3]: Given a booking created 16+ minutes ago still
  `Awaiting Payment`, when the hold-expiry check runs (sweep or lazy
  check-on-read), then its status becomes `Cancelled` and the seats it held
  are added back to `departures.seats`.
- SC-4 [BOOKING-001 AC-5]: Given a booking created 10 minutes ago still
  `Awaiting Payment`, when the hold-expiry check runs, then the booking is
  untouched and its seats remain held.
- SC-5 [BOOKING-001 AC-4]: Given a departure with exactly 1 seat remaining,
  when two Buyers submit a 1-seat booking for it within the same second,
  then exactly one booking is created and the other request is rejected
  with the same "not enough seats" message as SC-2 — never both succeeding.
- SC-6 [BOOKING-001 — Boundary]: Given a departure with exactly N seats
  remaining, when a Buyer books a party of exactly N, then the booking is
  created and seats remaining becomes 0.
- SC-7 [BOOKING-001 — Invalid input]: Given the form is submitted with a
  missing traveller name, phone, or email, then an inline error renders on
  that field and no `bookings` row is created.
- SC-8 [BOOKING-001 — Upstream failure]: Given the database write fails
  mid-transaction (e.g. the simulated/forced error path exercised in a
  test), then neither the `bookings` row nor the `departures.seats`
  decrement is left partially applied.

## Dependencies

- `data` module: `bookings` and `departures` tables must exist (Site data
  from the database).
- Reads the product/departure detail already shown on the product page —
  this story assumes a departure id and its seats/price are available to
  `/book/:id`; it does not build the product detail page itself.
- `/checkout/:id` (the next step a successful submit redirects to) is
  delivered by Checkout payment via VNPay MoMo ZaloPay / Voucher and
  discount code checkout — this story only needs to produce a booking id
  for that link target, not build that screen.
