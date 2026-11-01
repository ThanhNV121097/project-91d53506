# Test cases — Buyer booking history and status

Module: `account` · Requirement: ACCOUNT-001 · Screen: `/account` (My bookings)
Contract: `GET /v1/account/bookings` (services.md §3.3.1), `GET /v1/bookings/{id_or_code}` (§3.5.2)

Risk: medium-high. Read-only, but it is the one place another account's
private booking data could leak (privacy NFR, SRS §6), so permission and
isolation cases are weighted as heavily as the happy path.

## Core listing and freshness

**Scenario**: Buyer sees exactly their own bookings on the page
**Given**: Buyer A has 3 bookings, Buyer B has 2 bookings, Buyer A is signed in
**When**: Buyer A opens `/account`
**Then**: Exactly 3 booking rows render under `[data-testid='account-bookings']`, and every row's booking code is one of Buyer A's 3 — none of Buyer B's codes appear
**Traces**: ACCOUNT-001 AC-1
**Check**: render_url

**Scenario**: Account bookings API returns only the caller's own rows
**Given**: Buyer A has 3 bookings, Buyer B has 2 bookings
**When**: Buyer A, signed in, calls `GET /v1/account/bookings`
**Then**: `200`, `data` has exactly 3 entries, each `id` belonging to Buyer A; none of Buyer B's booking ids appear in the array, regardless of page size
**Traces**: ACCOUNT-001 AC-1; Contract (`GET /v1/account/bookings`)
**Check**: fetch_url

**Scenario**: Status shown reflects the latest write, not a stale value
**Given**: Buyer A has a booking currently `Awaiting Payment`; its payment is then confirmed, setting `status = 'Confirmed'` in the store
**When**: Buyer A reloads `/account`
**Then**: That booking's row shows the status text `Confirmed` exactly, not `Awaiting Payment`
**Traces**: ACCOUNT-001 AC-2
**Check**: render_url

**Scenario**: API reflects the same freshness as the UI
**Given**: Same booking as above, now `Confirmed` in the store
**When**: Buyer A calls `GET /v1/account/bookings`
**Then**: `200`, the entry for that booking's `id` has `"status": "Confirmed"`
**Traces**: ACCOUNT-001 AC-2; Contract (`GET /v1/account/bookings`)
**Check**: fetch_url

**Scenario**: Status string matches the state machine's own values verbatim
**Given**: Buyer A has one booking in each of the six states: Awaiting Payment, Paid, Confirmed, Completed, Cancelled, Refunded
**When**: Buyer A opens `/account`
**Then**: Each row's status text is exactly one of `Awaiting Payment`, `Paid`, `Confirmed`, `Completed`, `Cancelled`, `Refunded` — no paraphrase, no lowercase variant
**Traces**: ACCOUNT-001.1 ("shows each one's current `status` exactly as the booking state machine holds it")
**Check**: render_url

## Isolation / not permitted

**Scenario**: A booking that is not the caller's never appears, however the query is shaped
**Given**: Buyer A has 3 bookings, Buyer B has 2 bookings
**When**: Buyer A calls `GET /v1/account/bookings?limit=100`
**Then**: `200`, `data.length == 3`; raising `limit` never surfaces Buyer B's rows — the filter is applied server-side on `buyer_id = caller.id`, not a client-supplied parameter
**Traces**: ACCOUNT-001.2; Contract (`GET /v1/account/bookings`)
**Check**: fetch_url

**Scenario**: Fetching another buyer's booking id directly is rejected, not returned
**Given**: Buyer A owns booking id `B-A1`; Buyer B is signed in
**When**: Buyer B calls `GET /v1/bookings/B-A1`
**Then**: `404 NOT_FOUND` — the same code as a booking id that does not exist at all, so existence is never leaked to Buyer B
**Traces**: ACCOUNT-001 AC-3; Contract (`GET /v1/bookings/{id_or_code}`)
**Check**: fetch_url

**Scenario**: Unauthenticated request to the account bookings list is rejected
**Given**: No signed-in session (no `Authorization` header, no `session` cookie)
**When**: `GET /v1/account/bookings` is called
**Then**: `401 UNAUTHENTICATED`, no `data` array returned
**Traces**: Contract (`GET /v1/account/bookings`, Auth: buyer); SRS §6 privacy NFR
**Check**: fetch_url

**Scenario**: A non-Buyer role cannot read the Buyer bookings list
**Given**: A signed-in Supplier session token
**When**: That Supplier calls `GET /v1/account/bookings`
**Then**: `403 PERMISSION_DENIED`
**Traces**: Contract (`GET /v1/account/bookings`, Auth: buyer only)
**Check**: fetch_url

**Scenario**: Visiting `/account` signed out shows the signed-out state, not any booking data
**Given**: No signed-in session
**When**: The visitor opens `/account`
**Then**: The signed-out heading/message renders (per SRS §5 "signed-out" state) and no booking rows or `[data-testid='account-bookings']` list items are shown
**Traces**: SRS §5 screen states (signed-out); ACCOUNT-001 (implicit: no booking data without a Buyer)
**Check**: render_url

## Boundary

**Scenario**: Buyer with zero bookings sees an empty list, not an error
**Given**: Buyer A is signed in and owns no bookings
**When**: Buyer A opens `/account`
**Then**: The page renders normally with `0` shown as the booking count and zero rows under `[data-testid='account-bookings']` — no error state
**Traces**: ACCOUNT-001 Boundary ("Buyer has zero bookings")
**Check**: render_url

**Scenario**: Zero bookings via the API returns an empty array, not an error
**Given**: Buyer A owns no bookings
**When**: Buyer A calls `GET /v1/account/bookings`
**Then**: `200`, `{ "data": [], "has_more": false }` — not a 404 or 500
**Traces**: ACCOUNT-001 Boundary; Contract (`GET /v1/account/bookings`)
**Check**: fetch_url

**Scenario**: `limit` above the cursor-pagination maximum is rejected, not clamped
**Given**: Buyer A is signed in
**When**: Buyer A calls `GET /v1/account/bookings?limit=101`
**Then**: `422 VALIDATION_FAILED` — the request is not silently clamped to 100
**Traces**: Contract §2.4 ("Over the max limit: rejected... never clamped")
**Check**: fetch_url

## Malformed request

**Scenario**: An undefined query field is rejected, not ignored
**Given**: Buyer A is signed in
**When**: Buyer A calls `GET /v1/account/bookings?buyer_id=some-other-id` (a field this endpoint does not define — there is no caller-supplied buyer filter in the contract)
**Then**: `400 MALFORMED_REQUEST` — the field is rejected outright, never accepted and used to target another account's bookings, and never silently dropped while returning 200
**Traces**: Contract §2.5 (validation boundary: "A request field the contract does not define is rejected with 400"); ACCOUNT-001 AC-3 (no path to another account's data)
**Check**: fetch_url

## Failure recovery

**Scenario**: A failed backing query returns 500, not a wrong-looking success
**Given**: Buyer A is signed in; the `bookings` table/query the endpoint depends on is made to fail (e.g. renamed/unreachable at the query level) while the database connection itself still accepts connections
**When**: Buyer A calls `GET /v1/account/bookings`
**Then**: `500 INTERNAL`, with the standard error envelope (`error.code == "INTERNAL"`) — not a 200 with partial/empty data presented as if it were the real list
**Traces**: Contract §2.3 error catalog (`INTERNAL`, 500, "a query or insert that failed")
**Check**: fetch_url

**Scenario**: Database refusing connections returns 503, not 500
**Given**: Buyer A is signed in; the database is made unavailable (refuses connections) while the API process keeps running
**When**: Buyer A calls `GET /v1/account/bookings`
**Then**: `503 UNAVAILABLE`, with the standard error envelope (`error.code == "UNAVAILABLE"`)
**Traces**: Contract §2.3 error catalog (`UNAVAILABLE`, 503, "A dependency (database...) refused the connection")
**Check**: fetch_url
