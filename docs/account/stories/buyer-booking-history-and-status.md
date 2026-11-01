# Story — Buyer booking history and status

Module: `account`
SRS: `docs/account/SRS.md` (ACCOUNT-001)

## User story

As a Buyer, I want to see my own bookings and their current status on
`/account`, so that I know what I have booked and whether it is confirmed.

## Scope

**In scope**
- `/account` "My bookings" screen backed by real data: list of the
  signed-in Buyer's own `bookings` rows, each showing its current
  `status` (Awaiting Payment / Paid / Confirmed / Completed / Cancelled /
  Refunded) exactly as held by the booking state machine.
- Server-side filtering by the booking's owning user id — never by name
  or email match.
- Empty state (zero bookings) and signed-out state (redirect/prompt to
  sign in), per the design's existing states for this screen.
- A `GET /v1/bookings/mine`-style read endpoint (exact path decided in
  `docs/architecture/services.md` during this story's technical design
  step) that returns only the caller's own bookings, derived from the
  authenticated session — never from a client-supplied user id.

**Out of scope**
- Creating a booking, the inventory hold, and payment — `booking` module.
- The cancellation/rescheduling/refund-request workflow — `booking`
  module (BOOKING-004); this story only displays whatever status that
  workflow has already written.
- Wishlist (`/wishlist`, ACCOUNT-002) — separate plan item, separate
  story.
- The `/account` page shell, nav and layout — already built by `site`
  (SITE-006); this story wires its "My bookings" section to real data,
  it does not rebuild the screen.
- Post-trip reviews, order detail beyond what `/account`'s list already
  shows.

## UI scope

Screen: `/account` → "My bookings" section (per design system's
`DataTable`-less list view documented in `docs/account/SRS.md` §5).
States touched: `default` (rows render), `signed-out` (prompt/redirect),
`empty` (0 bookings, per the design's empty-state copy convention — name
what's missing, e.g. "Nothing booked yet."). No new screen, no new
component class beyond swapping the existing mock list for a real fetch;
`Badge` (§2.9 design system) renders each booking's status using its
existing neutral tone family — no new colour-coded status badge is
introduced, consistent with the design's "no tone by colour" rule.

## Acceptance criteria

- SC-1 [ACCOUNT-001 AC-1]: Given Buyer A has 3 bookings and Buyer B has 2,
  when Buyer A opens `/account`, then exactly 3 bookings render and all
  belong to Buyer A.
- SC-2 [ACCOUNT-001 AC-2]: Given one of Buyer A's bookings is confirmed via
  payment, when Buyer A reloads `/account`, then that booking shows
  `Confirmed`, not its earlier status.
- SC-3 [ACCOUNT-001 AC-3]: Given Buyer B knows Buyer A's booking id, when
  Buyer B calls the bookings-read endpoint with that id (or any list
  call), then Buyer A's booking is never returned to Buyer B.
- SC-4 [ACCOUNT-001 boundary]: Given a Buyer has zero bookings, when they
  open `/account`, then the list renders the empty state with 0 rows, not
  an error.
- SC-5 [ACCOUNT-001 behaviour-1]: Given a visitor is not signed in, when
  they navigate to `/account`, then they are prompted to sign in rather
  than shown any booking data.

## Dependencies

- `auth` module: signed-in session/user id this story filters by (item 3,
  currently `failed` — this story's backend cannot be verified end-to-end
  until auth lands, though the UI can build against mock auth state).
- `booking` module: the `bookings` rows this story reads (item 4, backend
  not yet built) — this story is read-only against that table once it
  exists; no `bookings` schema decision is made here.
- Design: `/account` page shell from `site` (SITE-006), already built.
