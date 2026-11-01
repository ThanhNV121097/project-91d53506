# Test cases — Wishlist

Module: `account` · Requirement: ACCOUNT-002 · Screen: `/wishlist`
Contract: `GET /v1/wishlist`, `POST /v1/wishlist/{product_id}`,
`DELETE /v1/wishlist/{product_id}` (services.md §3.3.2–3.3.4)

Risk: medium. Read/write, account-scoped, no payment or inventory impact —
but it is a second place (besides bookings) where one account's data must
never leak into another's session, so isolation and sign-in-required cases
are weighted alongside the happy path. Cases are written against the
service contract already merged (services.md §2.2–2.6, §3.3.2–3.3.4); this
story's own endpoints are not re-designed here.

## Core save / list / remove

**Scenario**: Saving a product persists it server-side, not to localStorage
**Given**: Buyer A is signed in, has not saved `cua-lo-beach-2n1d`
**When**: Buyer A calls `POST /v1/wishlist/cua-lo-beach-2n1d`
**Then**: `201`, and a subsequent `GET /v1/wishlist` for Buyer A includes an entry with `product_id == "cua-lo-beach-2n1d"`
**Traces**: ACCOUNT-002.1; Contract (`POST /v1/wishlist/{product_id}`)
**Check**: fetch_url

**Scenario**: Toggling the wishlist button on the Trip page saves the product
**Given**: Buyer A is signed in and viewing a Trip page for `cua-lo-beach-2n1d`, not yet saved
**When**: Buyer A clicks the wishlist toggle button
**Then**: The button's pressed/active state (e.g. `aria-pressed="true"` or the filled-heart icon) reflects saved, and `/wishlist` subsequently lists that product
**Traces**: ACCOUNT-002.1
**Check**: interact_page

**Scenario**: A saved product survives sign-out and sign-in on a different browser
**Given**: Buyer A saves `cua-lo-beach-2n1d` in browser session 1
**When**: Buyer A signs out, then signs in again using a fresh session (no shared localStorage/cookies with session 1)
**Then**: `GET /v1/wishlist` in the new session returns `product_id == "cua-lo-beach-2n1d"` in `data`
**Traces**: ACCOUNT-002 AC-1
**Check**: fetch_url

**Scenario**: `/wishlist` page lists the signed-in Buyer's saved products from the server
**Given**: Buyer A has saved `cua-lo-beach-2n1d` and `pu-mat-trek-3n2d` server-side
**When**: Buyer A opens `/wishlist`
**Then**: Both products render in the saved list, and the shown count equals `2`
**Traces**: ACCOUNT-002.2
**Check**: render_url

**Scenario**: Removing a product via the API un-saves it
**Given**: Buyer A has saved `cua-lo-beach-2n1d`
**When**: Buyer A calls `DELETE /v1/wishlist/cua-lo-beach-2n1d`
**Then**: `204`, and a subsequent `GET /v1/wishlist` no longer includes `product_id == "cua-lo-beach-2n1d"`
**Traces**: ACCOUNT-002 AC-2; Contract (`DELETE /v1/wishlist/{product_id}`)
**Check**: fetch_url

**Scenario**: Removing a product via the page toggle and reloading reflects the removal
**Given**: Buyer A is signed in, `/wishlist` lists `cua-lo-beach-2n1d`
**When**: Buyer A clicks that product's remove/un-save control, then reloads `/wishlist`
**Then**: `cua-lo-beach-2n1d` no longer appears in the list after reload
**Traces**: ACCOUNT-002 AC-2
**Check**: interact_page

**Scenario**: Saving a product twice never creates two rows (idempotent save)
**Given**: Buyer A has already saved `cua-lo-beach-2n1d`
**When**: Buyer A calls `POST /v1/wishlist/cua-lo-beach-2n1d` again
**Then**: `200` (not `201`, not `409 CONFLICT`), and `GET /v1/wishlist` still lists `cua-lo-beach-2n1d` exactly once
**Traces**: Contract (`POST /v1/wishlist/{product_id}`, "idempotent save... a repeat call is a no-op success, not a `CONFLICT`")
**Check**: fetch_url

**Scenario**: Removing a product that was never saved is still a no-op success (idempotent delete)
**Given**: Buyer A has never saved `pu-mat-trek-3n2d`
**When**: Buyer A calls `DELETE /v1/wishlist/pu-mat-trek-3n2d`
**Then**: `204`, whether or not the pair existed
**Traces**: Contract (`DELETE /v1/wishlist/{product_id}`, "`204`, whether or not the pair existed")
**Check**: fetch_url

## Boundary

**Scenario**: Nothing saved renders the empty state, not an error
**Given**: Buyer A is signed in and has saved nothing
**When**: Buyer A opens `/wishlist`
**Then**: The empty-state message renders (per SITE-006) and no product rows are shown — no error state
**Traces**: ACCOUNT-002 AC-3
**Check**: render_url

**Scenario**: Nothing saved via the API returns an empty array, not an error
**Given**: Buyer A has saved nothing
**When**: Buyer A calls `GET /v1/wishlist`
**Then**: `200`, `{ "data": [] }` — not a 404 or 500
**Traces**: ACCOUNT-002 AC-3; Contract (`GET /v1/wishlist`)
**Check**: fetch_url

## Not permitted / permission

**Scenario**: An unauthenticated attempt to save a product is rejected
**Given**: No signed-in session
**When**: `POST /v1/wishlist/cua-lo-beach-2n1d` is called with no `Authorization` header and no `session` cookie
**Then**: `401 UNAUTHENTICATED`; no `wishlists` row is created for that product
**Traces**: ACCOUNT-002 failure/boundary table ("Not permitted — no signed-in Buyer... rejected"); Contract (Auth: buyer on every endpoint in §3.3)
**Check**: fetch_url

**Scenario**: An unauthenticated attempt to list the wishlist is rejected
**Given**: No signed-in session
**When**: `GET /v1/wishlist` is called
**Then**: `401 UNAUTHENTICATED`, no `data` array returned
**Traces**: Contract (`GET /v1/wishlist`, Auth: buyer)
**Check**: fetch_url

**Scenario**: An unauthenticated attempt to remove a saved product is rejected
**Given**: No signed-in session
**When**: `DELETE /v1/wishlist/cua-lo-beach-2n1d` is called
**Then**: `401 UNAUTHENTICATED`
**Traces**: Contract (`DELETE /v1/wishlist/{product_id}`, Auth: buyer)
**Check**: fetch_url

**Scenario**: Clicking the wishlist toggle while signed out requires sign-in rather than silently saving
**Given**: No signed-in session, visitor is viewing a Trip page
**When**: The visitor clicks the wishlist toggle button
**Then**: The visitor is redirected to sign-in (or shown a sign-in prompt), consistent with AUTH-004; no product is saved to any account
**Traces**: ACCOUNT-002 failure/boundary table ("the toggle requires sign-in... consistent with AUTH-004")
**Check**: interact_page

**Scenario**: Buyer A's wishlist is never exposed through Buyer B's session
**Given**: Buyer A has saved `cua-lo-beach-2n1d`; Buyer B is signed in and has saved nothing
**When**: Buyer B calls `GET /v1/wishlist`
**Then**: `200`, `data == []` — Buyer A's saved product never appears in Buyer B's response
**Traces**: SRS §6 privacy NFR; ACCOUNT-002 (per-account association)
**Check**: fetch_url

## Not found / malformed request

**Scenario**: Saving a product id that does not exist is rejected
**Given**: Buyer A is signed in
**When**: Buyer A calls `POST /v1/wishlist/does-not-exist-id`
**Then**: `404 NOT_FOUND`; no `wishlists` row is created
**Traces**: Contract (`POST /v1/wishlist/{product_id}`, error catalog "`NOT_FOUND` 404 — `product_id` does not exist")
**Check**: fetch_url

**Scenario**: A body field the contract does not define is rejected, not ignored
**Given**: Buyer A is signed in
**When**: Buyer A calls `POST /v1/wishlist/cua-lo-beach-2n1d` with a JSON body `{"note": "for later"}` (a field this endpoint does not define — it takes no body fields)
**Then**: `400 MALFORMED_REQUEST` — the field is rejected outright, never accepted and silently dropped while returning `200`/`201`
**Traces**: Contract §2.5 (validation boundary: "A request field the contract does not define is rejected with 400")
**Check**: fetch_url

## Failure recovery

**Scenario**: A failed backing query on save returns 500, not a wrong-looking success
**Given**: Buyer A is signed in; the `wishlists` table/query the endpoint depends on is made to fail at the query level (e.g. renamed/unreachable) while the database connection itself still accepts connections
**When**: Buyer A calls `POST /v1/wishlist/cua-lo-beach-2n1d`
**Then**: `500 INTERNAL`, standard error envelope (`error.code == "INTERNAL"`) — not a 200/201 presented as a successful save
**Traces**: Contract §2.3 error catalog (`INTERNAL`, 500, "a query or insert that failed")
**Check**: fetch_url

**Scenario**: Database refusing connections returns 503 on the wishlist list read, not 500
**Given**: Buyer A is signed in; the database is made unavailable (refuses connections) while the API process keeps running
**When**: Buyer A calls `GET /v1/wishlist`
**Then**: `503 UNAVAILABLE`, standard error envelope (`error.code == "UNAVAILABLE"`)
**Traces**: Contract §2.3 error catalog (`UNAVAILABLE`, 503, "A dependency (database...) refused the connection")
**Check**: fetch_url
