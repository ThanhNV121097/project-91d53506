
# Story — Supplier booking and passenger management

Module: `suppliers`
Requirement: SUPPLIERS-005 (`docs/suppliers/SRS.md` §4.4)

## User story

As a **Supplier**, I want to see the bookings on my own products on
`/supplier/bookings`, confirm or reject the ones that need manual
confirmation, and filter to the passenger list for a chosen departure
date, so that I can run the trip and know exactly who is travelling.

## Scope

**In scope**

- `GET /v1/supplier/bookings` (or equivalent, named in the technical
  design): list of bookings scoped to the signed-in supplier's own
  products only.
- Confirm/reject action on a `Paid` booking for a product whose
  `confirmation` field is empty (manual confirmation required, per
  `decision.confirmation_mode`).
- Filter the list by departure date, producing the passenger list for
  that date.
- Permission check: a supplier only ever reads/writes bookings on
  products they own.

**Out of scope**

- Guest check-in via QR/code scanning at the departure gate — the brief
  lists it as non-MVP and the approved design (`SupplierBookings.tsx`)
  draws only a "Check in" button with no scanning flow behind it; this
  story does not invent behaviour for it (SRS §4.4, "Not applicable").
- Automatic `Paid → Confirmed` transition for instant-confirm products
  (non-empty `confirmation`) — that is done by the `payments`/`booking`
  modules, not this screen; this story only renders those bookings
  without a manual action.
- Handling cancellation/modification requests raised by a Buyer — a
  separate plan item (Buyer cancellation and refund requests).
- Creating a booking or the inventory hold itself — `booking` module.
- Setting a product's `confirmation` field — that is product edit
  (Supplier product create edit and approval), not this story.

## UI scope

Screen: `/supplier/bookings` (`SupplierBookings.tsx` in the approved
design). This story replaces its mock data with the live API and wires
the existing Confirm/Reject buttons and the departure-date filter to
real writes/reads. States: `default` (bookings listed), `empty` (no
bookings match the current filter — existing design copy). No new
screen or component is introduced; the "Check in" button stays exactly
as drawn (disabled/no-op), per the out-of-scope note above.

## Acceptance criteria

- SC-1 [SUPPLIERS-005 AC-1]: Supplier A and Supplier B each have
  bookings on their own products; when Supplier A opens
  `/supplier/bookings`, only bookings on Supplier A's own products
  appear — none of Supplier B's.
- SC-2 [SUPPLIERS-005 AC-2]: Given a `Paid` booking on a product whose
  `confirmation` field is empty, when the supplier clicks Confirm, the
  booking's `status` becomes `Confirmed`.
- SC-3 [SUPPLIERS-005 AC-3]: Given a `Paid` booking on a product whose
  `confirmation` field is empty, when the supplier clicks Reject, the
  booking's `status` moves out of `Paid`/`Confirmed` into a
  cancelled/refund-tracked state.
- SC-4 [SUPPLIERS-005 AC-4]: Given a departure-date filter is applied on
  `/supplier/bookings`, the list shows exactly the bookings whose `date`
  matches that departure, restricted to the signed-in supplier's own
  products — this is the passenger list.
- SC-5 [SUPPLIERS-005, "Not permitted"]: A supplier attempting to
  confirm, reject, or read a booking on a product they do not own is
  rejected (e.g. 403/404, no state change).
- SC-6 [SUPPLIERS-005 "Not applicable"]: A booking on a product whose
  `confirmation` field is non-empty (instant-confirm) shows no
  Confirm/Reject action on this screen.

## Dependencies

- `auth` module — signed-in supplier session, to scope every query.
- `data` module — `bookings`, `products` tables already seeded/queryable.
- Booking creation with inventory hold (plan item 4) — bookings must
  already exist (as `Paid`) for this screen to act on; this story does
  not create bookings, only lists/acts on existing ones.
- `decision.confirmation_mode` (project memory) — governs which bookings
  show a manual action.

## Acceptance (from plan item)

Confirm/reject updates booking status; passenger list exactly matches
bookings on that departure — covered by SC-2, SC-3, SC-4 above.
