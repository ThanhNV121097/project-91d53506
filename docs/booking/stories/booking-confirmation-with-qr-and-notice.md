# Story — Booking confirmation with QR and notice

Module: `booking`
Requirement: `BOOKING-003` (docs/booking/SRS.md §4.3)

## User story

As a Buyer, I want to see my booking code and a scannable QR on
`/booking/:code` once my booking is confirmed, so that I have proof of the
booking and can check in at the departure.

## Scope

**In scope**

- `/booking/:code` lookup against `bookings` by `code`.
- Rendering the full confirmation (code, QR, trip, date, travellers, amount
  paid) when the matched booking's status is `Confirmed` or `Completed`.
- A clear not-found state when the code matches no booking.
- Raising exactly one notification event when a booking transitions to
  `Confirmed`, for `notifications` to consume (this story's responsibility
  ends at raising the event — it does not send email/Zalo itself).
- The `QrCode` component (design system §2.15) rendering the booking code
  deterministically, no external QR library.

**Out of scope**

- The transition itself from `Awaiting Payment` to `Paid`/`Confirmed` —
  owned by `payments` module (Checkout payment via VNPay MoMo ZaloPay);
  this story only reacts to a booking already `Confirmed`.
- Actually delivering the email/Zalo message — `notifications` module
  (Booking and approval notifications) consumes the event this story raises.
- Any screen for a booking still `Awaiting Payment` — per SRS §4.3's
  "Not applicable" row, the approved design has no separate pending-
  confirmation screen; that status is covered by `/account` (Buyer booking
  history and status, a separate plan item).
- Listing all of a Buyer's bookings — `/account` is a different story.
- Supplier-side guest check-in via the same code/QR — `suppliers` module
  (Supplier booking and passenger management).

## UI scope

Screen: **Booking confirmed** (`/booking/:code`), per design system §5.
States: `default` (confirmed booking renders), `not-found` (no match).
Components used: `QrCode` (§2.15), `Badge` is not used here — a confirmed
booking only ever renders the one state defined by this requirement, no
status badge. Figures (price, date) carry `.fig` per the design system's
typography rule. No separate pending/awaiting-payment state is built on
this screen (see Out of scope).

## Acceptance criteria

- SC-1 [BOOKING-003 AC-1]: Given a booking with status `Confirmed` (or
  `Completed`), when `/booking/:code` is requested with its code, then the
  response/page renders that booking's code, a QR encoding the code, trip
  name, date, traveller count and total amount paid.
- SC-2 [BOOKING-003 AC-2]: Given no booking has the requested code, when
  `/booking/:code` is requested, then a not-found state renders — never the
  confirmation layout with blank or placeholder fields.
- SC-3 [BOOKING-003 AC-3]: Given a booking transitions from `Awaiting
  Payment` to `Confirmed` (performed by `payments`), when that transition
  happens, then exactly one notification event is recorded for that
  booking, consumable by the `notifications` module.
- SC-4 [BOOKING-003 Behaviour-1]: Given a booking with status still
  `Awaiting Payment`, when `/booking/:code` is requested with its code,
  then the confirmation layout with QR is not rendered for it (no QR is
  invented for an unconfirmed booking) — this case is explicitly out of
  scope for a dedicated UI per the SRS, so the backend treats it the same
  as not-found for this endpoint's purpose.

## Dependencies

- `payments` module: must land the `Awaiting Payment` → `Confirmed`
  transition this story reacts to (Checkout payment via VNPay MoMo
  ZaloPay).
- `notifications` module (Booking and approval notifications): consumes the
  event raised by SC-3; this story only raises it.
- `data` module: `bookings` table (code, status, date, travellers, total).
- Booking creation with inventory hold: must exist first — a booking row
  has to exist before it can reach `Confirmed`.
