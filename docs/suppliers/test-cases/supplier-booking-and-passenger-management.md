# Test cases — Supplier booking and passenger management

Module: `suppliers`. Covers SUPPLIERS-005 (`/supplier/bookings`: list,
confirm/reject on manual-confirmation products, passenger list by
departure date). Traces to `docs/suppliers/SRS.md` §4.4, and to
`docs/architecture/services.md` §3.8.8
(`GET /v1/supplier/bookings`) and §3.8.9
(`POST /v1/supplier/bookings/{id}/confirm` /
`POST /v1/supplier/bookings/{id}/reject`), plus the cross-cutting error
contract, pagination and validation-boundary rules in §2, and the
`SupplierBookings.tsx` screen (`docs/suppliers/SRS.md` §5).

No story plan exists yet for this module (only the SRS), so the SRS's own
`AC-n` list under SUPPLIERS-005, plus its failure/boundary/permission
table, is the list this file covers, per the task's fallback rule.

Risk level: **high**. A leak across suppliers' own bookings is a privacy
bug the SRS calls out by name (§6 non-functional: "never exposed to
another supplier's session"), and a wrong confirm/reject releases or
holds real seats and real money. Happy path, isolation, state-transition
correctness and the contract's own error shapes all get full coverage;
the one area the SRS itself marks out of scope — guest check-in via QR —
gets no case, per its own "Not applicable" row (§4.4 failure table):
building a scanning flow behind the design's bare "Check in" button would
be inventing scope the SRS explicitly declines.

---

## SUPPLIERS-005 AC-1 — Only the signed-in supplier's own bookings are listed

**Scenario**: Supplier A's booking list excludes Supplier B's bookings
**Given**: Supplier A and Supplier B are each signed in with bookings on their own, distinct products
**When**: Supplier A calls `GET /v1/supplier/bookings`
**Then**: `200` is returned; every booking in `data` belongs to a product owned by Supplier A, and none belongs to Supplier B
**Traces**: SUPPLIERS-005 AC-1; contract (`GET /v1/supplier/bookings`, §3.8.8)
**Check**: fetch_url

**Scenario**: The bookings screen shows only the signed-in supplier's own rows
**Given**: Supplier A is signed in; Supplier A has bookings on their products, Supplier B has bookings on theirs
**When**: Supplier A opens `/supplier/bookings`
**Then**: The rendered table lists only rows whose product belongs to Supplier A; no row names a product or supplier belonging to Supplier B
**Traces**: SUPPLIERS-005 AC-1
**Check**: render_url

---

## SUPPLIERS-005 AC-2 — Confirming a Paid booking on a manual-confirmation product

**Scenario**: Confirm action sets a Paid booking to Confirmed
**Given**: A signed-in supplier owns a product whose `confirmation` field is empty (manual-confirmation), with a `Paid` booking on it
**When**: `POST /v1/supplier/bookings/{id}/confirm` is called
**Then**: `200` is returned with the booking's `status: "Confirmed"`; a follow-up `GET /v1/supplier/bookings` shows that booking's `status` as `Confirmed`
**Traces**: SUPPLIERS-005 AC-2; contract (§3.8.9)
**Check**: fetch_url

**Scenario**: Clicking Confirm on the bookings screen updates the row's status badge
**Given**: A signed-in supplier is on `/supplier/bookings`, viewing a `Paid` booking row with a visible "Confirm" button
**When**: The supplier clicks "Confirm"
**Then**: The row's status badge reads "Confirmed" without a full page reload being required to see it, and the "Confirm"/"Reject" actions no longer appear on that row
**Traces**: SUPPLIERS-005 AC-2
**Check**: interact_page

---

## SUPPLIERS-005 AC-3 — Rejecting a Paid booking on a manual-confirmation product

**Scenario**: Reject action moves a Paid booking out of Paid/Confirmed
**Given**: A signed-in supplier owns a product whose `confirmation` field is empty, with a `Paid` booking on it
**When**: `POST /v1/supplier/bookings/{id}/reject` is called
**Then**: `200` is returned with the booking's `status: "Cancelled"` (not `Paid` and not `Confirmed`); a follow-up `GET /v1/supplier/bookings` shows the same cancelled status, and the departure's `seats` the booking held are released back
**Traces**: SUPPLIERS-005 AC-3; contract (§3.8.9)
**Check**: fetch_url

**Scenario**: Clicking Reject on the bookings screen moves the booking out of Paid
**Given**: A signed-in supplier is on `/supplier/bookings`, viewing a `Paid` booking row with a visible "Reject" button
**When**: The supplier clicks "Reject"
**Then**: The row's status badge no longer reads "Paid" or "Confirmed"; it reads the cancelled/refund-tracked status, and the "Confirm"/"Reject" actions no longer appear on that row
**Traces**: SUPPLIERS-005 AC-3
**Check**: interact_page

---

## SUPPLIERS-005 AC-4 — Passenger list filtered by departure date

**Scenario**: Filtering by departure date returns exactly the matching bookings for this supplier's products
**Given**: A signed-in supplier has bookings on three different departure dates across their own products, and another supplier has a booking on one of those same dates on a different product
**When**: `GET /v1/supplier/bookings?departure_date=2026-11-14` is called
**Then**: `200` is returned; every booking in `data` has `date: "2026-11-14"` and belongs to the caller's own products; the other supplier's booking on that same date is absent
**Traces**: SUPPLIERS-005 AC-4; contract (§3.8.8)
**Check**: fetch_url

**Scenario**: Setting the travel-date filter on the screen narrows the table to that date only
**Given**: A signed-in supplier is on `/supplier/bookings` with bookings spanning several travel dates
**When**: The supplier sets the "Travel date" range filter to the same single date at both ends
**Then**: Every row remaining in the table shows that exact travel date; no row with a different date is shown
**Traces**: SUPPLIERS-005 AC-4
**Check**: interact_page

---

## Failure, boundary and permission behaviour

**Scenario**: A supplier cannot confirm a booking on a product they do not own
**Given**: Supplier A is signed in; a `Paid` booking exists on a manual-confirmation product owned by Supplier B
**When**: Supplier A calls `POST /v1/supplier/bookings/{supplier_b_booking_id}/confirm`
**Then**: `404 NOT_FOUND` is returned; a follow-up read (as Supplier B) shows the booking's `status` still `Paid`
**Traces**: SUPPLIERS-005 failure table "Not permitted"; contract (§3.8.9 errors)
**Check**: fetch_url

**Scenario**: A supplier cannot reject a booking on a product they do not own
**Given**: Supplier A is signed in; a `Paid` booking exists on a manual-confirmation product owned by Supplier B
**When**: Supplier A calls `POST /v1/supplier/bookings/{supplier_b_booking_id}/reject`
**Then**: `404 NOT_FOUND` is returned; a follow-up read (as Supplier B) shows the booking's `status` still `Paid`
**Traces**: SUPPLIERS-005 failure table "Not permitted"; contract (§3.8.9 errors)
**Check**: fetch_url

**Scenario**: Confirming a booking that is not currently Paid is rejected
**Given**: A signed-in supplier owns a manual-confirmation product with a booking whose `status` is already `Confirmed`
**When**: `POST /v1/supplier/bookings/{id}/confirm` is called
**Then**: `409 CONFLICT` is returned; a follow-up read shows `status` unchanged at `Confirmed`
**Traces**: Contract (§3.8.9 errors, "booking `status != 'Paid'`")
**Check**: fetch_url

**Scenario**: Rejecting a booking that is not currently Paid is rejected
**Given**: A signed-in supplier owns a manual-confirmation product with a booking whose `status` is already `Cancelled`
**When**: `POST /v1/supplier/bookings/{id}/reject` is called
**Then**: `409 CONFLICT` is returned; a follow-up read shows `status` unchanged at `Cancelled`
**Traces**: Contract (§3.8.9 errors, "booking `status != 'Paid'`")
**Check**: fetch_url

**Scenario**: Confirming a booking on an instant-confirm product is rejected
**Given**: A signed-in supplier owns a product whose `confirmation` field is non-empty (instant-confirm), with a `Paid` booking on it that has already auto-advanced, and a second `Paid` booking record is simulated directly against this product for the call
**When**: `POST /v1/supplier/bookings/{id}/confirm` is called on that product's booking
**Then**: `409 CONFLICT` is returned (SUPPLIERS-005.3: instant-confirm products never show or accept this manual action)
**Traces**: SUPPLIERS-005 AC/behaviour 3; contract (§3.8.9 errors, "product's `confirmation` field is non-empty")
**Check**: fetch_url

**Scenario**: The bookings screen shows no Confirm/Reject action for an instant-confirm product's booking
**Given**: A signed-in supplier is on `/supplier/bookings`, viewing a `Paid` booking row whose product has a non-empty `confirmation` field
**When**: The page renders that row
**Then**: No "Confirm" or "Reject" button is shown for that row (only for rows on manual-confirmation products with `status: "Paid"`)
**Traces**: SUPPLIERS-005 behaviour 3
**Check**: render_url

**Scenario**: Listing bookings without a signed-in session is rejected
**Given**: No session token is presented
**When**: `GET /v1/supplier/bookings` is called
**Then**: `401 UNAUTHENTICATED` is returned
**Traces**: Contract (§2.2 auth enforcement; §2.3 error catalog)
**Check**: fetch_url

**Scenario**: Confirming a booking without a signed-in session is rejected
**Given**: No session token is presented
**When**: `POST /v1/supplier/bookings/{id}/confirm` is called
**Then**: `401 UNAUTHENTICATED` is returned
**Traces**: Contract (§2.2 auth enforcement; §2.3 error catalog)
**Check**: fetch_url

---

## Service contract rules (undefined fields, unknown query params, pagination limits)

**Scenario**: An unknown query parameter on the bookings list is rejected with 400
**Given**: A signed-in supplier
**When**: `GET /v1/supplier/bookings?status=Paid` is called (`status` is not a field this endpoint's query contract defines — only `departure_date`, `limit`, `cursor` are)
**Then**: `400 MALFORMED_REQUEST` is returned
**Traces**: Contract (§2.5 "an unknown query parameter on a non-`data`-module endpoint" is rejected; §3.8.8 query params)
**Check**: fetch_url

**Scenario**: A `limit` over the pagination maximum is rejected, never clamped
**Given**: A signed-in supplier with more than 100 bookings on their products
**When**: `GET /v1/supplier/bookings?limit=101` is called
**Then**: `422 VALIDATION_FAILED` is returned, not a `200` silently capped at 100
**Traces**: Contract (§2.4 "Over the max limit | rejected with `VALIDATION_FAILED`, never clamped")
**Check**: fetch_url

**Scenario**: An undefined field in the confirm request body is rejected with 400
**Given**: A signed-in supplier owns a manual-confirmation product with a `Paid` booking
**When**: `POST /v1/supplier/bookings/{id}/confirm` is called with a body `{ "note": "called the traveller" }` (`note` is not a field this endpoint defines — the endpoint takes no body)
**Then**: `400 MALFORMED_REQUEST` is returned; a follow-up read shows the booking's `status` unchanged at `Paid` — the undefined field is never silently ignored while the confirm action still applies
**Traces**: Contract (§2.5 "a request field the contract does not define is rejected with 400"; §3.8.9)
**Check**: fetch_url

**Scenario**: A store failure on confirming a booking returns 500, not a silent success
**Given**: A signed-in supplier owns a manual-confirmation product with a `Paid` booking; the `bookings` table is unreachable/renamed so the update fails at the store layer
**When**: `POST /v1/supplier/bookings/{id}/confirm` is called
**Then**: `500 INTERNAL` is returned; once the store is restored, a follow-up read shows the booking's `status` unchanged at `Paid` (the failed write was never partially applied)
**Traces**: Contract (§2.3 error catalog `INTERNAL`; the backend's "a failed query is 500 INTERNAL" rule)
**Check**: fetch_url

**Scenario**: The database being unreachable while the backend runs returns 503, not 500
**Given**: The backend process is running but its database connection is refused
**When**: `GET /v1/supplier/bookings` is called
**Then**: `503 UNAVAILABLE` is returned (dependency refused the connection, distinct from an internal query failure)
**Traces**: Contract (§2.3 error catalog `UNAVAILABLE`, "a dependency ... refused the connection")
**Check**: fetch_url
