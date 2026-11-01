# Test cases — Supplier calendar and seasonal pricing

Module: `suppliers`. Covers SUPPLIERS-004 (departure dates, capacity and
seasonal pricing, within product edit on `/supplier/products/:id`). Traces
to `docs/suppliers/SRS.md` §4.3, and to `docs/architecture/services.md`
§3.8.6 (`POST /v1/supplier/products/{id}/departures`) and §3.8.7
(`PATCH /v1/supplier/departures/{id}`), plus the cross-cutting error
contract and `collection`/field rules in §2.

No story plan exists yet for this module (only the SRS), so the SRS's own
`AC-n` list under SUPPLIERS-004, plus its failure/boundary/permission table,
is the list this file covers, per the task's fallback rule.

Risk level: **high**. A bug here either lets a product overbook (seats
exceed capacity, a blocked date stays bookable) or silently repaints prices
across dates that should keep their base price — both are money-and-trust
bugs, not cosmetic ones, so negative, boundary and permission paths get
full coverage alongside the happy path.

---

## SUPPLIERS-004 AC-1 — Adding a departure writes capacity, price, season, seats

**Scenario**: Adding a departure creates a row with seats equal to capacity
**Given**: A signed-in supplier owns a product with no departure on `2026-12-24` yet
**When**: `POST /v1/supplier/products/{id}/departures` is called with `{ "date": "2026-12-24", "capacity": 20, "season": "Peak summer", "price": 2500000 }`
**Then**: `201` is returned with the created row showing `date: "2026-12-24"`, `capacity: 20`, `seats: 20`, `season: "Peak summer"`, `price: 2500000`, `state: "Open"`; a follow-up read of that product's departures shows the same row persisted
**Traces**: SUPPLIERS-004 AC-1; contract (`POST /v1/supplier/products/{id}/departures`, §3.8.6)
**Check**: fetch_url

**Scenario**: Adding a departure without a price/season uses the product's base price and standard pricing
**Given**: A signed-in supplier owns a product with base `price = 1800000` and no departure on `2027-01-10`
**When**: `POST /v1/supplier/products/{id}/departures` is called with `{ "date": "2027-01-10", "capacity": 15 }` (no `price`, no `season`)
**Then**: `201` is returned with the created row's `price` and `season` both null, `seats: 15`
**Traces**: SUPPLIERS-004 AC-1 (null = standard pricing); contract §3.8.6
**Check**: fetch_url

---

## SUPPLIERS-004 AC-2 — A seasonal price overrides the base price on that date only

**Scenario**: Marking one Saturday as Weekend pricing changes only that row
**Given**: A signed-in supplier's product has two existing departure rows: a weekday row at the product's base price (no override) and a Saturday row also currently at the base price (no override)
**When**: `PATCH /v1/supplier/departures/{saturday_id}` is called with `{ "season": "Weekend", "price": 2200000 }`
**Then**: `200` is returned with the Saturday row's `price: 2200000` and `season: "Weekend"`; a follow-up read of the weekday row shows its `price` still null and `season` still null — unaffected
**Traces**: SUPPLIERS-004 AC-2; contract (`PATCH /v1/supplier/departures/{id}`, §3.8.7)
**Check**: fetch_url

**Scenario**: The calendar UI shows the overridden price only on the overridden date
**Given**: The same product as above, with the Saturday row now overridden to 2,200,000 and the weekday row still at the base price
**When**: The supplier opens `/supplier/products/{id}` and views the departure/calendar table
**Then**: The rendered row for the Saturday date shows `2,200,000`; the rendered row for the weekday date shows the product's base price, not `2,200,000`
**Traces**: SUPPLIERS-004 AC-2
**Check**: render_url

---

## SUPPLIERS-004 AC-3 — Blocking a date removes it from the buyer calendar and search

**Scenario**: Blocking a departure removes its pick from the product's public calendar
**Given**: A signed-in supplier's product has an `Open` departure on `2027-02-14` with seats remaining
**When**: `PATCH /v1/supplier/departures/{id}` is called with `{ "state": "Blocked" }`, then the public product page `/tours/{id}` is opened
**Then**: The PATCH returns `200` with `state: "Blocked"`; the calendar rendered on `/tours/{id}` no longer offers `2027-02-14` as a pickable date
**Traces**: SUPPLIERS-004 AC-3; contract §3.8.7
**Check**: fetch_url

**Scenario**: A blocked date is excluded from search results for that date
**Given**: The same blocked departure from the previous case (`state: "Blocked"`, date `2027-02-14`, product otherwise matching a known search filter set)
**When**: `/search` is queried with `date=2027-02-14` and the other filters matching that product
**Then**: The product does not appear in the results, and `total` does not count it (SEARCH-001 AC-3's own exclusion, exercised here from the supplier's blocking action)
**Traces**: SUPPLIERS-004 AC-3; contract (`GET /v1/search`, §3.4.1)
**Check**: fetch_url

**Scenario**: Unblocking returns the date to the public calendar
**Given**: A departure currently `Blocked`, with seats remaining under capacity
**When**: `PATCH /v1/supplier/departures/{id}` is called with `{ "state": "Open" }`
**Then**: `200` is returned with `state: "Open"`; the date reappears as pickable on `/tours/{id}`'s calendar
**Traces**: SUPPLIERS-004 AC-3 (reverse direction); contract §3.8.7
**Check**: fetch_url

---

## Failure, boundary and permission behaviour

**Scenario**: Capacity of zero is rejected, no row written
**Given**: A signed-in supplier owns a product with no departure yet on `2027-03-01`
**When**: `POST /v1/supplier/products/{id}/departures` is called with `{ "date": "2027-03-01", "capacity": 0 }`
**Then**: `422 VALIDATION_FAILED` is returned naming the minimum capacity; a follow-up read of that product's departures shows no row for `2027-03-01`
**Traces**: SUPPLIERS-004 failure table "Invalid input"; contract §3.8.6 errors
**Check**: fetch_url

**Scenario**: Negative capacity is rejected, no row written
**Given**: A signed-in supplier owns a product with no departure yet on `2027-03-02`
**When**: `POST /v1/supplier/products/{id}/departures` is called with `{ "date": "2027-03-02", "capacity": -5 }`
**Then**: `422 VALIDATION_FAILED` is returned; a follow-up read shows no row for `2027-03-02`
**Traces**: SUPPLIERS-004 failure table "Invalid input"; contract §3.8.6 errors
**Check**: fetch_url

**Scenario**: Capacity cannot be reduced below seats already committed
**Given**: A departure with `capacity: 20` and `seats: 20` (none committed) is reduced by a booking hold to `seats: 12` (8 committed), then the supplier edits it
**When**: `PATCH /v1/supplier/departures/{id}` is called with `{ "capacity": 5 }` (below the 8 already committed)
**Then**: `422 VALIDATION_FAILED` is returned; a follow-up read shows `capacity` unchanged at `20` — rejected, never silently capped
**Traces**: SUPPLIERS-004 failure table "Boundary"; contract §3.8.7 errors
**Check**: fetch_url

**Scenario**: Capacity can be reduced down to exactly the number of seats already committed
**Given**: The same departure with `capacity: 20` and 8 seats committed (`seats: 12`)
**When**: `PATCH /v1/supplier/departures/{id}` is called with `{ "capacity": 8 }` (exactly the committed count)
**Then**: `200` is returned with `capacity: 8`; the row is not rejected at this exact boundary
**Traces**: SUPPLIERS-004 failure table "Boundary" (not reduced below committed — exactly at it is allowed); contract §3.8.7
**Check**: fetch_url

**Scenario**: A supplier cannot add a departure to a product they do not own
**Given**: Supplier A is signed in; a product exists owned by Supplier B
**When**: Supplier A calls `POST /v1/supplier/products/{supplier_b_product_id}/departures` with a valid body
**Then**: `404 NOT_FOUND` is returned; no departure row is created for Supplier B's product
**Traces**: SUPPLIERS-004 failure table "Not permitted"; contract §3.8.6 errors
**Check**: fetch_url

**Scenario**: A supplier cannot edit a departure on a product they do not own
**Given**: Supplier A is signed in; a departure exists on a product owned by Supplier B
**When**: Supplier A calls `PATCH /v1/supplier/departures/{supplier_b_departure_id}` with `{ "state": "Blocked" }`
**Then**: `404 NOT_FOUND` is returned; a follow-up read (as Supplier B) shows the row's `state` unchanged
**Traces**: SUPPLIERS-004 failure table "Not permitted"; contract §3.8.7 errors
**Check**: fetch_url

---

## Service contract rules (fields the contract does not define, duplicate dates, bad enum)

**Scenario**: Adding a duplicate departure for the same product and date is rejected
**Given**: A signed-in supplier's product already has a departure row on `2027-04-05`
**When**: `POST /v1/supplier/products/{id}/departures` is called again with `{ "date": "2027-04-05", "capacity": 10 }`
**Then**: `409 CONFLICT` is returned; a follow-up read shows exactly one departure row for that product on `2027-04-05`, unchanged
**Traces**: Contract (`POST /v1/supplier/products/{id}/departures`, §3.8.6 errors, `uq_departures_product_date`)
**Check**: fetch_url

**Scenario**: Patching a departure with an undefined field is rejected with 400
**Given**: A signed-in supplier owns an existing departure
**When**: `PATCH /v1/supplier/departures/{id}` is called with `{ "price": 2000000, "note": "summer special" }` (`note` is not a field this contract defines)
**Then**: `400 MALFORMED_REQUEST` is returned; a follow-up read shows the row's `price` unchanged from before the call — the undefined field is never silently ignored while the rest of the update applies
**Traces**: Contract (§2.5 "a request field the contract does not define is rejected with 400"; §3.8.7)
**Check**: fetch_url

**Scenario**: Setting state to a value outside Open/Blocked is rejected with 400
**Given**: A signed-in supplier owns an existing departure currently `Open`
**When**: `PATCH /v1/supplier/departures/{id}` is called with `{ "state": "Cancelled" }`
**Then**: `400 MALFORMED_REQUEST` is returned; a follow-up read shows `state` still `Open`
**Traces**: Contract (§3.8.7 errors, `state` not Open/Blocked)
**Check**: fetch_url

**Scenario**: Sending `seats` directly in the patch body is rejected with 400
**Given**: A signed-in supplier owns an existing departure with `seats: 10`
**When**: `PATCH /v1/supplier/departures/{id}` is called with `{ "seats": 20 }`
**Then**: `400 MALFORMED_REQUEST` is returned (`seats` is a derived, booking-module-only field); a follow-up read shows `seats` unchanged at `10`
**Traces**: Contract (§3.8.7 errors, "`seats` present in the body")
**Check**: fetch_url

**Scenario**: A store failure on adding a departure returns 500, not a silent success
**Given**: A signed-in supplier owns a product with no departure on `2027-05-20`; the `departures` table is unreachable/renamed so the insert fails at the store layer
**When**: `POST /v1/supplier/products/{id}/departures` is called with `{ "date": "2027-05-20", "capacity": 10 }`
**Then**: `500 INTERNAL` is returned; no departure row exists for `2027-05-20` once the store is restored and re-read
**Traces**: Contract (§2.4 "store failure... is 500 INTERNAL")
**Check**: fetch_url

**Scenario**: The database being unreachable while the backend runs returns 503, not 500
**Given**: The backend process is running but its database connection is refused (database taken down while the service stays up)
**When**: `POST /v1/supplier/products/{id}/departures` is called with a valid body
**Then**: `503 UNAVAILABLE` is returned (dependency refused the connection, distinct from an internal query failure)
**Traces**: Contract (§2.4 "`UNAVAILABLE` 503 ... refused the connection")
**Check**: fetch_url
