# SRS — Account

Module: `account`
Design: [View the approved design](http://localhost:9400)
Design system: `design/design-system.md`

## 1. Purpose

Backs `/account`'s booking list with the signed-in Buyer's own real bookings
and status, and `/wishlist` with a real per-account saved-products list,
replacing the demo/localStorage behaviour the design ships with.

## 2. Actors

| Actor | Who they are | What they may do in this module |
|---|---|---|
| Buyer | Signed-in traveller | See their own bookings and status; save/remove wishlist products |

## 3. Scope

**In scope**: Buyer booking history and status; Wishlist.

**Out of scope**: creating a booking — `booking` module; the actual
cancellation/refund-request workflow — `booking` module (BOOKING-004); the
page layouts — already built by `site` (SITE-006).

## 4. Functional requirements

### 4.1 Buyer booking history and status

**Requirement ACCOUNT-001 — List only the signed-in Buyer's own bookings**

*As a* Buyer, *I want to* see my own bookings and their current status on
`/account`, *so that* I know what I have booked and whether it is confirmed.

Behaviour:

1. `/account` queries `bookings` filtered to the signed-in Buyer's account
   (by the booking's owning user id, not by name match) and shows each one's
   current `status` exactly as the booking state machine holds it.
2. A booking belonging to another account never appears, regardless of how
   the query is shaped.
3. Status shown always reflects the latest write — a reload after a payment
   confirms shows `Confirmed`, not a stale `Awaiting Payment`.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | Buyer A has 3 bookings, Buyer B has 2 | Buyer A opens `/account` | Exactly 3 bookings render, all belonging to Buyer A |
| AC-2 | A booking of Buyer A's is confirmed via payment | Buyer A reloads `/account` | That booking shows `Confirmed`, not its earlier status |
| AC-3 | Buyer B attempts to fetch Buyer A's booking id directly (API) | — | Rejected/not returned; the booking data is not exposed to Buyer B |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Not permitted | A booking does not belong to the requesting account | Excluded from the list (AC-1), rejected if fetched directly (AC-3) |
| Boundary | Buyer has zero bookings | The list renders with 0 rows, not an error |

**Data touched** — `bookings`, filtered by owning account, read-only here.

### 4.2 Wishlist

**Requirement ACCOUNT-002 — Persist a wishlist per account**

*As a* Buyer, *I want to* save or remove a product from my wishlist and have
it survive signing out and back in, *so that* my saved trips are not tied to
one browser.

Behaviour:

1. Toggling the wishlist button on a Trip page adds/removes that product id
   against the signed-in Buyer's account server-side (replacing the design's
   localStorage-only mock).
2. `/wishlist` lists the signed-in Buyer's saved products by querying that
   stored association, not `localStorage`.
3. Signing out and back in on a different browser still shows the same
   saved products.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | A Buyer saves product `cua-lo-beach-2n1d` | They sign out, then sign in on a different browser | `/wishlist` still lists that product |
| AC-2 | A saved product is removed | `/wishlist` is reloaded | It no longer appears |
| AC-3 | Nothing is saved | `/wishlist` loads | The empty-state message renders (per SITE-006) |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Not permitted | No signed-in Buyer | The toggle requires sign-in; an unauthenticated attempt is rejected or redirected, consistent with AUTH-004 |

**Data touched** — a Buyer-to-product association table/column, created by this requirement.

## 5. Screens

| Screen | Section in the design | Functions it serves | States that must exist |
|---|---|---|---|
| My bookings (`/account`) | My bookings | ACCOUNT-001 | default, signed-out, empty |
| Wishlist (`/wishlist`) | Wishlist | ACCOUNT-002 | default, empty |

## 6. Non-functional requirements

| Area | Requirement |
|---|---|
| Privacy | A Buyer's bookings and wishlist are never exposed to another account's session |

## 7. Dependencies and assumptions

- **Depends on:** `auth` module for the signed-in account; `booking` module for the `bookings` rows listed.

| Open question | Proposed default | Who decides |
|---|---|---|
| — | — | None open |

## 8. Traceability

| Plan item | Requirement ids | Test cases |
|---|---|---|
| Buyer booking history and status | ACCOUNT-001 | `test-cases/buyer-booking-history-and-status.md` |
| Wishlist | ACCOUNT-002 | `test-cases/wishlist.md` |
