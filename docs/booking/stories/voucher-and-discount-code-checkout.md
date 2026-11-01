# Story — Voucher and discount code checkout

Module: `booking`
Requirement: `BOOKING-002` (SRS §4.2)

## User story

As a Buyer, I want to enter a discount code on `/checkout/:id` and have it
reduce my booking's total if it is valid, so that I can use a promotion when
paying for my trip.

## Scope

**In scope**

- A voucher code input on `/checkout/:id`, submitted against the `vouchers`
  table by `code` (case-insensitive lookup).
- Validating the code: exists, `status = Active`, `used < limit`,
  `expires` in the future.
- On valid: reducing the booking's displayed/stored total by the voucher's
  discount, and incrementing `vouchers.used` by exactly 1 for that
  application.
- On invalid (not found / expired / over limit / inactive): rejecting with
  a message naming the specific reason, total left unchanged.
- Guarding against the same voucher being applied twice to the same
  booking (e.g. a re-submitted payment retry).
- Empty code field: no lookup performed, checkout proceeds with no
  discount.

**Out of scope**

- Creating, editing or expiring vouchers — that is written by `admin`
  (Admin content and homepage management). This story only reads
  `vouchers`.
- Taking payment itself and the gateway callback — `payments` module. This
  story only adjusts the total `payments` later charges.
- Booking creation and the 15-minute seat hold — `BOOKING-001`, already
  built; this story assumes a booking in `Awaiting Payment` already exists
  at `/checkout/:id`.
- Booking confirmation screen (`/booking/:code`) — `BOOKING-003`.
- Any stacking of multiple vouchers on one booking — the SRS and the design
  show a single code field; only one voucher applies per booking.

## UI scope

Screen: `/checkout/:id` (Pay), per `docs/booking/SRS.md` §5 and the
approved design's "Pay" section.

- Default state: a code `Input` (§2.3 design system) beside the existing
  checkout total, with an "Apply" action (ghost/secondary button, §2.1).
- Voucher-error state (already named in the SRS screens table): on
  rejection, an inline message under the field, `role="alert"`, naming the
  reason (not found / expired / over limit) per the content system's error
  wording rule (§3: "plain and short, posted with `role=\"alert\"`").
- On success: the field shows the applied code (read-only or replaced by a
  "Remove" ghost action) and the total line updates to the discounted
  figure, set in `.fig` (design system §1.3 — every price is mono/tabular).
- No new screen, no modal — the product has no modal layer (design system
  §1.5).

## Acceptance criteria

- SC-1 [BOOKING-002 AC-1]: Given a voucher `CUALO10` that is `Active`,
  `used=3`/`limit=10`, not expired, when it is entered on `/checkout/:id`,
  then the booking's total reduces by the voucher's discount and
  `vouchers.used` for `CUALO10` becomes 4.
- SC-2 [BOOKING-002 AC-2]: Given a voucher at `used=10`/`limit=10`, when
  entered at checkout, then it is rejected with an over-limit message,
  `used` stays 10, and the total is unchanged.
- SC-3 [BOOKING-002 AC-3]: Given a voucher whose `expires` date has passed,
  when entered at checkout, then it is rejected with an expired message
  and the total is unchanged.
- SC-4 [BOOKING-002 AC-4]: Given a code that matches no `vouchers` row,
  when entered at checkout, then it is rejected with a not-found message
  and the total is unchanged.
- SC-5 [BOOKING-002 AC-5]: Given a voucher already applied once to a
  booking, when the same checkout session re-submits payment, then
  `vouchers.used` is not incremented a second time for that booking.
- SC-6 [BOOKING-002, boundary]: Given a voucher with `used` exactly one
  below `limit`, when applied, then it succeeds and brings `used` to
  `limit` exactly.
- SC-7 [BOOKING-002, invalid input]: Given the code field is submitted
  empty, when checkout proceeds, then no lookup is performed and checkout
  continues with no discount applied.
- SC-8 [BOOKING-002, UI]: Given a rejected code (any reason in SC-2..SC-4),
  when the rejection renders, then the message names the specific reason
  and is posted with `role="alert"`, per the design system's error wording
  (§3).

## Dependencies

- `BOOKING-001` (Booking creation with inventory hold) must have landed —
  a booking in `Awaiting Payment` must exist to reach `/checkout/:id`.
- `data` module: the `vouchers` table (`code`, `status`, `used`, `limit`,
  `expires`, `discount`).
- No external account or credential needed; this story does not call a
  payment gateway.
