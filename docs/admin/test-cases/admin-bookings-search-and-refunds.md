# Test cases — Admin bookings search and refunds

Module: `admin` · Requirement: ADMIN-004
Contract endpoints: `GET /v1/admin/bookings` (3.9.10), `GET /v1/admin/complaints` (3.9.11),
`POST /v1/admin/complaints/{id}/refund` (3.9.12)

No story plan was supplied for this plan item at the time these cases were
written; per process, the SRS's own `ADMIN-004` acceptance criteria (AC-1
to AC-3) plus its failure/boundary/permission table are the list this
file covers, together with the service contract's rules for the three
endpoints above (§2.2 permissions, §2.3 error catalog, §2.5 validation
boundary, §2.4 pagination).

Risk assigned: **high**. This function resolves disputed money (a manual
refund moves a booking to `Refunded`), is reachable by a restricted
sub-admin role, and its search is the admin's only way to find one
booking among all of them — so permission, not-found, conflict and
malformed-input paths get as much coverage as the happy path.

---

**Scenario**: Searching by a booking's exact code returns exactly that booking
**Given**: An admin is signed in with `full` permissions; among many bookings, one has code `NA-7X42K9`
**When**: `GET /v1/admin/bookings?code=NA-7X42K9` is sent with the admin's session token
**Then**: `200` is returned with `data` containing exactly one booking, whose `code` is `NA-7X42K9`
**Traces**: ADMIN-004 AC-1
**Check**: fetch_url

---

**Scenario**: Processing a manual refund sets the booking to Refunded and resolves the complaint
**Given**: A signed-in admin with `full` permissions; a `complaints` row with `status = 'Open'` referencing booking `NA-7X42K9`, whose `bookings.status` is currently `Paid`
**When**: `POST /v1/admin/complaints/{id}/refund` is sent for that complaint's id
**Then**: `200` is returned with `{ "booking": { "id", "status": "Refunded" }, "complaint": { "id", "status": "Refunded" } }`; re-reading the booking shows `status = 'Refunded'` and re-reading the complaint shows `status = 'Refunded'`
**Traces**: ADMIN-004 AC-2
**Check**: fetch_url

---

**Scenario**: Searching by a code matching no booking returns no results, not an error
**Given**: An admin is signed in with `full` permissions; no booking exists with code `NA-0000ZZ`
**When**: `GET /v1/admin/bookings?code=NA-0000ZZ` is sent
**Then**: `200` is returned with `data: []` and `has_more: false` — no error status, no error envelope
**Traces**: ADMIN-004 AC-3
**Check**: fetch_url

---

**Scenario**: Admin types a booking code into the bookings search box and sees exactly that row
**Given**: The admin is signed in and on `/admin/bookings`, which lists many bookings; one has code `NA-7X42K9`
**When**: The admin types `NA-7X42K9` into the search field and presses Enter
**Then**: The table shows exactly one row, whose code column reads `NA-7X42K9`
**Traces**: ADMIN-004 AC-1
**Check**: interact_page

---

**Scenario**: Admin clicks "Refund manually" on a complaint and sees the booking row update to Refunded
**Given**: The admin is on `/admin/bookings` with a `complaints` row open against booking `NA-7X42K9`, currently shown with status `Paid`
**When**: The admin clicks the "Refund manually" action for that complaint
**Then**: Without a page reload, the booking's status cell for `NA-7X42K9` reads `Refunded`
**Traces**: ADMIN-004 AC-2
**Check**: interact_page

---

**Scenario**: Admin searches a code that matches nothing and sees an empty state, not an error message
**Given**: The admin is on `/admin/bookings`; no booking exists with code `NA-0000ZZ`
**When**: The admin types `NA-0000ZZ` into the search field and presses Enter
**Then**: The table area shows zero rows and an empty-state message (e.g. "No bookings found"); no error banner or thrown-error text is displayed
**Traces**: ADMIN-004 AC-3
**Check**: interact_page

---

**Scenario**: A sub-admin without finance/dispute permission is rejected attempting a manual refund
**Given**: A signed-in sub-admin whose `permissions` value is `content-only`; an open complaint referencing a valid booking
**When**: `POST /v1/admin/complaints/{id}/refund` is sent for that complaint's id, authenticated as that sub-admin
**Then**: `403` is returned with `error.code = "PERMISSION_DENIED"`; the booking's `status` and the complaint's `status` are unchanged
**Traces**: ADMIN-004 failure table ("Not permitted"); contract §2.2 (3.9.12 permissions: `full`, `finance-only`)
**Check**: fetch_url

---

**Scenario**: A sub-admin without finance permission is rejected listing all bookings
**Given**: A signed-in sub-admin whose `permissions` value is `moderation-only`
**When**: `GET /v1/admin/bookings` is sent authenticated as that sub-admin
**Then**: `403` is returned with `error.code = "PERMISSION_DENIED"`
**Traces**: contract §2.2 (3.9.10 permissions: `full`, `finance-only`)
**Check**: fetch_url

---

**Scenario**: An unauthenticated request to list bookings is rejected
**Given**: No session token or cookie is sent
**When**: `GET /v1/admin/bookings` is sent with no `Authorization` header and no `session` cookie
**Then**: `401` is returned with `error.code = "UNAUTHENTICATED"`
**Traces**: contract §2.2/§2.3
**Check**: fetch_url

---

**Scenario**: Refunding a complaint that does not exist returns Not Found
**Given**: A signed-in admin with `full` permissions; no `complaints` row exists with id `00000000-0000-0000-0000-000000000000`
**When**: `POST /v1/admin/complaints/00000000-0000-0000-0000-000000000000/refund` is sent
**Then**: `404` is returned with `error.code = "NOT_FOUND"`
**Traces**: contract §3.9.12 errors
**Check**: fetch_url

---

**Scenario**: Refunding an already-resolved complaint is rejected with Conflict
**Given**: A signed-in admin with `full` permissions; a `complaints` row whose `status` is already `Refunded` (previously resolved)
**When**: `POST /v1/admin/complaints/{id}/refund` is sent for that complaint's id
**Then**: `409` is returned with `error.code = "CONFLICT"`; the booking's and complaint's rows are unchanged from before the call
**Traces**: contract §3.9.12 errors ("`status != 'Open'`"); also covers the two-admins-act-near-simultaneously boundary — a second refund attempt finds the complaint already resolved rather than silently applying twice
**Check**: fetch_url

---

**Scenario**: A refund request body carrying a field the contract does not define is rejected
**Given**: A signed-in admin with `full` permissions; an open complaint referencing a valid booking
**When**: `POST /v1/admin/complaints/{id}/refund` is sent with body `{ "amount": 500000 }` (the contract defines no request body for this endpoint)
**Then**: `400` is returned with `error.code = "MALFORMED_REQUEST"`; the booking's and complaint's rows are unchanged
**Traces**: contract §2.5
**Check**: fetch_url

---

**Scenario**: A bookings list request with an undefined query parameter is rejected
**Given**: A signed-in admin with `full` permissions
**When**: `GET /v1/admin/bookings?sort_by=total` is sent (`sort_by` is not one of `status`, `date_from`, `date_to`, `code`, `limit`, `cursor`)
**Then**: `400` is returned with `error.code = "MALFORMED_REQUEST"`
**Traces**: contract §2.5 (strict validation applies to every endpoint except the `data` module's generic reader)
**Check**: fetch_url

---

**Scenario**: A bookings list request with `limit` over the maximum is rejected
**Given**: A signed-in admin with `full` permissions
**When**: `GET /v1/admin/bookings?limit=101` is sent
**Then**: `422` is returned with `error.code = "VALIDATION_FAILED"`; the limit is rejected, never clamped to 100
**Traces**: contract §2.4
**Check**: fetch_url

---

**Scenario**: Filtering by status and date range returns only matching bookings
**Given**: A signed-in admin with `full` permissions; bookings exist with a mix of `status` values and `created_at` dates, including at least one `Paid` booking inside `2026-10-01`–`2026-10-31` and others outside that status or range
**When**: `GET /v1/admin/bookings?status=Paid&date_from=2026-10-01&date_to=2026-10-31` is sent
**Then**: `200` is returned with `data` containing only bookings whose `status` is `Paid` and whose date falls within the given range
**Traces**: ADMIN-004 behaviour #1 ("filterable by status and date range")
**Check**: fetch_url

---

**Scenario**: Listing bookings when none exist returns an empty list, not an error
**Given**: A signed-in admin with `full` permissions; the `bookings` table has zero rows
**When**: `GET /v1/admin/bookings` is sent
**Then**: `200` is returned with `data: []`, `has_more: false` — no error status
**Traces**: SRS §5 screen states ("empty" state for `AdminBookings`)
**Check**: fetch_url

---

**Scenario**: A database query failure while listing bookings returns an internal error
**Given**: A signed-in admin with `full` permissions; the `bookings` table or a column it depends on has been renamed so the backing query fails
**When**: `GET /v1/admin/bookings` is sent
**Then**: `500` is returned with `error.code = "INTERNAL"`; no booking data is returned, no stack trace or internal detail is exposed in the response body
**Traces**: contract §2.3 error catalog (`INTERNAL` — "an unexpected failure, including a query or insert that failed")
**Check**: fetch_url

---

**Scenario**: The database refusing connections while the backend is up returns Unavailable
**Given**: A signed-in admin with `full` permissions; the database is made unreachable while the API service keeps running
**When**: `GET /v1/admin/bookings` is sent
**Then**: `503` is returned with `error.code = "UNAVAILABLE"`
**Traces**: contract §2.3 error catalog (`UNAVAILABLE` — "a dependency refused the connection")
**Check**: fetch_url
