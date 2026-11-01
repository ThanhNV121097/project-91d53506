# Story — Buyer cancellation and refund requests

Module: `booking`
Requirement: BOOKING-004 (`docs/booking/SRS.md` §4.4)

## User story

As a Buyer, I want to request cancellation or rescheduling of my own booking
from `/account` and see its tracked status afterward, so that I am not stuck
once my plans change, even though the refund itself is decided by an admin.

## Scope

**In scope**

- A "Request cancellation/reschedule" action on a booking row on `/account`,
  available to the Buyer who owns that booking.
- Submitting the request creates a tracked record (a `complaints` row keyed
  to the booking's code) with an open/requested status.
- The Buyer sees that status on `/account` after submitting — e.g. a badge
  reading "Refund requested" next to the booking.
- Ownership check: a Buyer may only request this against their own booking.
- Duplicate-request handling: a second request while one is already open
  does not create a second open record.

**Out of scope**

- Approving or processing the refund, or changing the booking's status to
  `Refunded` — `admin` module (Admin bookings search and refunds). This
  story only ever writes the requested/open state.
- The booking list and its default statuses (Awaiting Payment/Paid/
  Confirmed/…) on `/account` — `Buyer booking history and status` story.
  This story adds one action and one extra status value onto that existing
  list; it does not build the list itself.
- Supplier-side handling of the cancellation/modification request —
  `suppliers` module (Supplier booking and passenger management).
- Choosing a cancellation/refund window or policy text — already decided as
  a proposed default in `docs/booking/SRS.md` (`decision.cancellation_window`,
  48h before departure); this story does not add window enforcement, since
  BOOKING-004 has no acceptance criterion gating the request by time-to-
  departure. The request can be submitted regardless of how close the
  departure is; a window-based block, if the stakeholder wants one, is a
  separate change against BOOKING-004.
- Rescheduling to a different, concrete departure date — BOOKING-004's own
  acceptance criteria only cover creating a tracked request and its status,
  not picking a new date. The request form captures the Buyer's note (which
  may state a preferred new date in free text), not a date picker against
  live availability.

## UI scope

Extends the `/account` screen (its "My bookings" list, built by the Buyer
booking history and status story) with:

- A "Request cancellation / reschedule" button/link on each booking row
  that is eligible (any booking not already `Cancelled`/`Refunded` and not
  itself already carrying an open request).
- A small form or inline panel: a free-text note field (what the Buyer wants
  — cancel, or reschedule to roughly when) and a submit action, using the
  existing Input/Textarea and Button components (design system §2.1, §2.3).
- After submit, the row shows a `Badge` (design system §2.9, tone `warn`,
  mark `◆`) reading "Refund requested" in place of the action, and the
  action is hidden while that status is open.
- No modal: the design system has no modal layer (§1.5); the panel is
  inline under the row, consistent with the rest of `/account`.
- No new top-level route — this is additive to the `/account` page.

## Acceptance criteria

- **SC-1 [BOOKING-004 AC-1]**: Given a Buyer's own `Confirmed` booking with
  no open request, when the Buyer submits a cancellation/reschedule request
  with a note, then a `complaints` row is created keyed to that booking's
  code with an open/requested status, and `/account` shows that booking
  with a "Refund requested" badge afterward; the booking's own `status`
  field is unchanged.
- **SC-2 [BOOKING-004 AC-2]**: Given the request created in SC-1, when
  `/account` is viewed again, then the booking's status is still
  `Confirmed` (not `Refunded`) — the request alone never changes it.
- **SC-3 [BOOKING-004 AC-3]**: Given a booking that belongs to a different
  Buyer account, when the signed-in Buyer attempts to submit a request
  against it (e.g. a replayed or crafted request with that booking's code),
  then the request is rejected and no `complaints` row is created.
- **SC-4 [BOOKING-004 failure/conflict case]**: Given a booking that already
  has an open request, when the Buyer submits another request for the same
  booking, then no second open `complaints` row is created — the existing
  one is reused/updated, not duplicated.
- **SC-5 [BOOKING-004, UI]**: Given a booking with an open request, the
  "Request cancellation / reschedule" action is not shown for that booking
  on `/account` — the Buyer sees the status badge instead, so they cannot
  trigger SC-4's conflict from the normal UI (SC-4 still holds at the API
  boundary).

## Dependencies

- `Buyer booking history and status` story — must land first; this story
  extends its `/account` booking list and reuses its row layout.
- `data` module — the `complaints` table (`booking_code`, `customer`,
  `issue`, `status`) per `docs/booking/SRS.md` §4.4 Data touched.
- `auth` module — the signed-in Buyer identity used for the ownership check
  in SC-3.
- Design system `Badge` (§2.9) and Input/Button (§2.1, §2.3) components —
  no new component is introduced.
