# Test Cases — Search and filter trips by criteria

Module: `search` · Requirement: `SEARCH-001` · Contract: `GET /v1/search`
(`docs/architecture/services.md` §3.4.1)

No story plan file exists for this item (`docs/search/stories/` is absent);
per the test-writing rule, the SRS's own `SEARCH-001` acceptance criteria
(AC-1–AC-5) and failure/boundary table are the list this file covers, plus
the contract rules `GET /v1/search` is held to.

Risk level: **medium-high**. This endpoint is the only thing standing
between a Buyer and booking a trip that has no seats left — a false
positive here is an overbooking risk surfaced one step before BOOKING-001's
own atomic guard, so negative/boundary coverage on the availability join
gets the same weight as the happy path.

---

**Scenario**: Date search excludes a product whose only matching departure has too few seats
**Given**: Product `P1` (destination `Cửa Lò`, `status = approved`) has exactly one `departures` row for `2026-12-24`: `seats = 1`, `state = 'Open'`
**When**: A visitor calls `GET /v1/search?where=Cửa Lò&date=2026-12-24&people=2`
**Then**: The response is `200`; `items` does not contain `P1`; `total` does not count it
**Traces**: SEARCH-001 AC-1
**Check**: fetch_url

---

**Scenario**: Date search includes a product whose matching departure has enough seats
**Given**: The same product `P1` additionally has a `departures` row for `2026-12-24` with `seats = 4`, `state = 'Open'` (its only row for that date, replacing the 1-seat row in the previous case's fixture)
**When**: A visitor calls `GET /v1/search?where=Cửa Lò&date=2026-12-24&people=2`
**Then**: The response is `200`; `items` contains `P1` exactly once; `total` counts it
**Traces**: SEARCH-001 AC-2
**Check**: fetch_url

---

**Scenario**: A blocked departure excludes the product regardless of seats remaining
**Given**: Product `P2`'s only `departures` row for `2026-12-24` has `seats = 10`, `state = 'Blocked'`
**When**: A visitor calls `GET /v1/search?where=<P2's destination>&date=2026-12-24&people=2`
**Then**: The response is `200`; `items` does not contain `P2`, even though `seats (10) >= people (2)`
**Traces**: SEARCH-001 AC-3
**Check**: fetch_url

---

**Scenario**: Price ceiling filters on the product's own price when no date is given
**Given**: Product `P3` has `price = 950000`; product `P4` has `price = 1200000`; both `status = approved`
**When**: A visitor calls `GET /v1/search?max=1000000`
**Then**: The response is `200`; `items` contains `P3`; `items` does not contain `P4`
**Traces**: SEARCH-001 AC-4
**Check**: fetch_url

---

**Scenario**: Price ceiling filters on the matching departure's date-specific override price when a date is given
**Given**: Product `P5` has base `price = 800000`; its `departures` row for `2026-12-25` has `price = 1200000` (seasonal override), `state = 'Open'`, `seats = 5`
**When**: A visitor calls `GET /v1/search?date=2026-12-25&people=1&max=1000000`
**Then**: The response is `200`; `items` does not contain `P5` (the 1,200,000 override is used for the ceiling check, not the 800,000 base price)
**Traces**: SEARCH-001 AC-4
**Check**: fetch_url

---

**Scenario**: No date given leaves existing destination/kind/price/duration filtering unchanged
**Given**: Product `P6` (destination `Pù Mát`, `kind = tour`, `duration = 1 day`, `price = 500000`, `status = approved`) has no `departures` rows at all
**When**: A visitor calls `GET /v1/search?where=Pù Mát&kind=tour&duration=1 day`
**Then**: The response is `200`; `items` contains `P6` (absence of any departure row does not exclude it when no `date` is given)
**Traces**: SEARCH-001 AC-5
**Check**: fetch_url

---

**Scenario**: Boundary — party size exactly equal to seats remaining is still included
**Given**: Product `P7`'s `departures` row for `2026-12-26` has `seats = 2`, `state = 'Open'`
**When**: A visitor calls `GET /v1/search?where=<P7's destination>&date=2026-12-26&people=2`
**Then**: The response is `200`; `items` contains `P7` (the rule is `seats >= people`, not `>`)
**Traces**: SEARCH-001 Boundary row
**Check**: fetch_url

---

**Scenario**: Empty result set renders the design's "nothing matches" copy, not an error
**Given**: A set of filters (`where=Nonexistent Place&date=2026-12-24&people=2`) that matches no product
**When**: A visitor runs that search on `/search`
**Then**: The page renders the exact copy from `content.json` key `pages.search.none`: "Nothing matches these filters. Widen the price or clear a filter." No error state renders; `result-count` shows `0`
**Traces**: SEARCH-001 Empty result row
**Check**: render_url

---

**Scenario**: Result count shown reflects the filtered set, never the unfiltered product total
**Given**: At least 3 approved products exist in total; exactly 1 of them matches `where=Cửa Lò&date=2026-12-24&people=2` under the departures join
**When**: A visitor calls `GET /v1/search?where=Cửa Lò&date=2026-12-24&people=2`
**Then**: The response's `total` is `1`, not the count of all approved products
**Traces**: SEARCH-001 §4.1.4
**Check**: fetch_url

---

**Scenario**: A query parameter the contract does not define is rejected, not silently ignored
**Given**: No special setup
**When**: A visitor calls `GET /v1/search?where=Cửa Lò&notaparam=1`
**Then**: The response is `400` with error envelope `{ "error": { "code": "MALFORMED_REQUEST", ... } }`; no results are returned
**Traces**: contract (GET /v1/search, §2.5 validation boundary)
**Check**: fetch_url

---

**Scenario**: An invalid date value is rejected as a validation failure
**Given**: No special setup
**When**: A visitor calls `GET /v1/search?date=not-a-date`
**Then**: The response is `422` with error envelope `{ "error": { "code": "VALIDATION_FAILED", ... } }`
**Traces**: contract (GET /v1/search §3.4.1 errors table)
**Check**: fetch_url

---

**Scenario**: A negative price ceiling is rejected as a validation failure
**Given**: No special setup
**When**: A visitor calls `GET /v1/search?max=-1`
**Then**: The response is `422` with error envelope `{ "error": { "code": "VALIDATION_FAILED", ... } }`
**Traces**: contract (GET /v1/search §3.4.1 errors table)
**Check**: fetch_url

---

**Scenario**: A non-numeric or negative travellers count is rejected as a validation failure
**Given**: No special setup
**When**: A visitor calls `GET /v1/search?people=-2`
**Then**: The response is `422` with error envelope `{ "error": { "code": "VALIDATION_FAILED", ... } }`
**Traces**: contract (GET /v1/search §3.4.1 errors table)
**Check**: fetch_url

---

**Scenario**: A limit above the maximum is rejected, never clamped
**Given**: No special setup
**When**: A visitor calls `GET /v1/search?limit=101`
**Then**: The response is `422` with error envelope `{ "error": { "code": "VALIDATION_FAILED", ... } }`; it does not silently return 100 items instead
**Traces**: contract (GET /v1/search, §2.4 "over the max limit")
**Check**: fetch_url

---

**Scenario**: Missing `people` defaults to the party size already in the URL, defaulting further to 1
**Given**: Product `P8`'s `departures` row for `2026-12-27` has `seats = 1`, `state = 'Open'`
**When**: A visitor calls `GET /v1/search?where=<P8's destination>&date=2026-12-27` (no `people` param)
**Then**: The response is `200`; `items` contains `P8` (default `people = 1` satisfies `seats (1) >= 1`)
**Traces**: contract (GET /v1/search §3.4.1 query parameters, `people` default)
**Check**: fetch_url

---

**Scenario**: A store failure on the search query is reported as an internal error, not swallowed into an empty result
**Given**: The `products` or `departures` table is unreachable to the query (e.g. renamed/dropped in a way that makes the join fail) while the backend process itself stays up
**When**: A visitor calls `GET /v1/search?where=Cửa Lò`
**Then**: The response is `500` with error envelope `{ "error": { "code": "INTERNAL", ... } }` — not a `200` with an empty `items` array
**Traces**: contract (§2.3 error catalog, `INTERNAL`)
**Check**: fetch_url

---

**Scenario**: A refused database dependency is reported as unavailable, not internal
**Given**: The backend process is running but the database is made unreachable (connection refused) via `set_db_available(false)`
**When**: A visitor calls `GET /v1/search?where=Cửa Lò`
**Then**: The response is `503` with error envelope `{ "error": { "code": "UNAVAILABLE", ... } }`
**Traces**: contract (§2.3 error catalog, `UNAVAILABLE`)
**Check**: fetch_url
