# Test cases — Voucher and discount code checkout

Function: `POST /v1/bookings/{id}/voucher` — BOOKING-002, `/checkout/:id`'s
voucher step.

Risk: medium-high. Money math (total reduction) and a double-apply /
over-limit race on a shared counter (`vouchers.used`); failure modes are
explicitly named in the SRS (AC-2 through AC-5), so each gets its own case
rather than being folded into the happy path.

Source documents: `docs/booking/SRS.md` §4.2 (BOOKING-002, AC-1..AC-5, the
failure/boundary table), `docs/architecture/services.md` §3.5.3 (request/
response shape, error catalog), §2.3 (error envelope, `MALFORMED_REQUEST`
for an undefined field), §2.2 (auth).

---

**Scenario**: Valid, unused voucher reduces total and increments `used`
**Given**: Booking `{id}` owned by the caller, `Awaiting Payment`, no voucher applied; voucher `CUALO10` exists, `status = Active`, `used = 3`, `limit = 10`, `expires` in the future
**When**: Caller `POST /v1/bookings/{id}/voucher` with `{ "code": "CUALO10" }`
**Then**: `200` with body `{ "total": <reduced>, "discount_applied": <voucher's discount> }`; a follow-up read of the booking shows the reduced `total` and `voucher_id` set to `CUALO10`'s id; `vouchers.used` for `CUALO10` reads 4
**Traces**: SC-1 (BOOKING-002 AC-1)
**Check**: fetch_url

---

**Scenario**: Voucher at `used = limit` is rejected as over-limit
**Given**: Voucher `FULL10`, `status = Active`, `used = 10`, `limit = 10`, not expired; booking `{id}` owned by caller, no voucher applied
**When**: Caller `POST /v1/bookings/{id}/voucher` with `{ "code": "FULL10" }`
**Then**: `409 CONFLICT`, `error.details[0].code = "OVER_LIMIT"`, `error.message` names the reason; `vouchers.used` for `FULL10` stays 10; a follow-up read of the booking shows `total` unchanged and `voucher_id` still null
**Traces**: SC-2 (BOOKING-002 AC-2)
**Check**: fetch_url

---

**Scenario**: Expired voucher is rejected as expired
**Given**: Voucher `OLD2024`, `status = Active`, `used < limit`, `expires` is a past date; booking `{id}` owned by caller, no voucher applied
**When**: Caller `POST /v1/bookings/{id}/voucher` with `{ "code": "OLD2024" }`
**Then**: `409 CONFLICT`, `error.details[0].code = "EXPIRED"`; `vouchers.used` for `OLD2024` unchanged; booking `total` unchanged
**Traces**: SC-3 (BOOKING-002 AC-3)
**Check**: fetch_url

---

**Scenario**: Code matching no voucher row is rejected as not found
**Given**: No row in `vouchers` has `code = "NOSUCHCODE"` (case-insensitive); booking `{id}` owned by caller, no voucher applied
**When**: Caller `POST /v1/bookings/{id}/voucher` with `{ "code": "NOSUCHCODE" }`
**Then**: `404 NOT_FOUND`; booking `total` unchanged, `voucher_id` still null
**Traces**: SC-4 (BOOKING-002 AC-4)
**Check**: fetch_url

---

**Scenario**: Inactive voucher is rejected naming the reason
**Given**: Voucher `PAUSED5`, `status = "Inactive"`, `used < limit`, not expired; booking `{id}` owned by caller, no voucher applied
**When**: Caller `POST /v1/bookings/{id}/voucher` with `{ "code": "PAUSED5" }`
**Then**: `409 CONFLICT`, `error.details[0].code = "INACTIVE"`; `used` unchanged; booking `total` unchanged
**Traces**: SC-3 (BOOKING-002.3 — "Invalid for any reason ... is rejected with a message naming why")
**Check**: fetch_url

---

**Scenario**: A voucher already applied to this booking cannot be applied a second time
**Given**: Booking `{id}` owned by caller already has `voucher_id` set to `CUALO10` from a prior successful application (`used` already incremented once for this booking)
**When**: Caller re-submits `POST /v1/bookings/{id}/voucher` with `{ "code": "CUALO10" }` again (e.g. a retried/re-submitted checkout)
**Then**: `409 CONFLICT`, `error.details[0].code = "ALREADY_APPLIED"`; `vouchers.used` for `CUALO10` is not incremented a second time (reads the same value as right after the first application); booking `total` unchanged by this second call
**Traces**: SC-5 (BOOKING-002 AC-5, BOOKING-002.4)
**Check**: fetch_url

---

**Scenario**: Boundary — voucher one below limit succeeds and reaches limit exactly
**Given**: Voucher `EDGE9`, `status = Active`, `used = 9`, `limit = 10`, not expired; booking `{id}` owned by caller, no voucher applied
**When**: Caller `POST /v1/bookings/{id}/voucher` with `{ "code": "EDGE9" }`
**Then**: `200`, `discount_applied` matches `EDGE9`'s discount; `vouchers.used` for `EDGE9` reads 10 (now equal to `limit`)
**Traces**: SC-6 (BOOKING-002 boundary table — "`used` exactly one below `limit`")
**Check**: fetch_url

---

**Scenario**: Boundary — voucher now at limit is rejected on the next attempt
**Given**: Following the previous scenario, `EDGE9` now has `used = 10 = limit`; a second booking `{id2}` owned by caller, no voucher applied
**When**: Caller `POST /v1/bookings/{id2}/voucher` with `{ "code": "EDGE9" }`
**Then**: `409 CONFLICT`, `error.details[0].code = "OVER_LIMIT"`; `used` stays 10
**Traces**: SC-2 (BOOKING-002 AC-2, confirming the boundary is enforced immediately past it)
**Check**: fetch_url

---

**Scenario**: Blank code field performs no lookup and checkout proceeds with no discount
**Given**: Booking `{id}` owned by caller, no voucher applied, `total` = the departure price
**When**: Caller submits the checkout voucher field empty (no code entered) and proceeds
**Then**: No `vouchers` row is read or modified by this submission; the booking's `total` is unchanged from the undiscounted amount; `voucher_id` stays null
**Traces**: SC-7 (BOOKING-002 boundary table — "Code field submitted empty")
**Check**: interact_page

---

**Scenario**: Empty-string code in the request body is rejected as a validation failure, not treated as "no code"
**Given**: Booking `{id}` owned by caller, no voucher applied
**When**: Caller `POST /v1/bookings/{id}/voucher` with `{ "code": "" }`
**Then**: `422 VALIDATION_FAILED` (code field blank, per the contract's own rule for this endpoint); booking `total` unchanged
**Traces**: contract (POST /v1/bookings/{id}/voucher — `VALIDATION_FAILED` 422, "code field blank")
**Check**: fetch_url

---

**Scenario**: A field the contract does not define is rejected, not silently ignored
**Given**: Booking `{id}` owned by caller, no voucher applied; voucher `CUALO10` valid and unused for this booking
**When**: Caller `POST /v1/bookings/{id}/voucher` with `{ "code": "CUALO10", "discount_override": 999999 }`
**Then**: `400 MALFORMED_REQUEST` ("the body carries a field this contract does not define"); the voucher is not applied and `used`/`total` are unchanged — the request is rejected outright, not processed with the extra field dropped
**Traces**: contract (§2.3 error catalog — `MALFORMED_REQUEST`, undefined body field)
**Check**: fetch_url

---

**Scenario**: Applying a voucher to a booking that does not exist
**Given**: No `bookings` row has id `does-not-exist`
**When**: Caller `POST /v1/bookings/does-not-exist/voucher` with `{ "code": "CUALO10" }`
**Then**: `404 NOT_FOUND`
**Traces**: contract (POST /v1/bookings/{id}/voucher — `NOT_FOUND` 404, "booking not found/not owned")
**Check**: fetch_url

---

**Scenario**: Applying a voucher to another buyer's booking is denied
**Given**: Booking `{id}` exists and is owned by Buyer A; the caller is authenticated as Buyer B
**When**: Buyer B `POST /v1/bookings/{id}/voucher` with `{ "code": "CUALO10" }`
**Then**: `404 NOT_FOUND` (contract treats "not found" and "not owned" identically, so ownership is never leaked); `used` and the booking's `total` are unchanged
**Traces**: contract (POST /v1/bookings/{id}/voucher — `NOT_FOUND` 404, "booking not found/not owned"); SRS 4.2 implicit ownership scoping consistent with BOOKING-004 AC-3's pattern
**Check**: fetch_url

---

**Scenario**: Unauthenticated caller is rejected
**Given**: Booking `{id}` exists; no session token (or an invalid one) is sent
**When**: `POST /v1/bookings/{id}/voucher` with `{ "code": "CUALO10" }` and no/invalid `Authorization`
**Then**: `401 UNAUTHENTICATED`; `used` and `total` unchanged
**Traces**: contract (§2.2 auth — `buyer`, owning the booking); §2.3 error catalog `UNAUTHENTICATED`
**Check**: fetch_url

---

**Scenario**: Database failure during voucher application is reported as INTERNAL, not silently succeeding
**Given**: Booking `{id}` owned by caller, no voucher applied; voucher `CUALO10` valid; the `vouchers` table (or the write path) is made to fail (e.g. renamed/broken) while the backend process itself stays up
**When**: Caller `POST /v1/bookings/{id}/voucher` with `{ "code": "CUALO10" }`
**Then**: `500 INTERNAL`; no partial state — booking `total` unchanged, `voucher_id` still null, `used` unchanged
**Traces**: contract (§2.3 error catalog — `INTERNAL` 500, "a query or insert that failed")
**Check**: fetch_url

---

**Scenario**: Database unreachable (dependency refused connection) during voucher application is reported as UNAVAILABLE
**Given**: Booking `{id}` owned by caller; backend process is up but its database connection is made unavailable (dependency refuses the connection)
**When**: Caller `POST /v1/bookings/{id}/voucher` with `{ "code": "CUALO10" }`
**Then**: `503 UNAVAILABLE`
**Traces**: contract (§2.3 error catalog — `UNAVAILABLE` 503, "a dependency ... refused the connection")
**Check**: fetch_url

---

**Scenario**: Voucher step on `/checkout/:id` shows the reduced total and the discount to the visitor
**Given**: Buyer signed in, on `/checkout/:id` for a booking they own; booking total before discount is visible on the page; voucher `CUALO10` is valid and unused for this booking
**When**: Buyer types `CUALO10` into the voucher field and submits it
**Then**: The page re-renders showing the reduced total matching the API's `total`, and a visible confirmation/discount line reflecting `discount_applied`; the voucher input and the page do not lose the traveller/booking data already entered
**Traces**: SC-1 (BOOKING-002 AC-1), state screen `voucher-error`/default on `/checkout/:id`
**Check**: interact_page

---

**Scenario**: Voucher error on `/checkout/:id` shows the rejection message without losing entered data
**Given**: Buyer signed in, on `/checkout/:id` for a booking they own, with traveller details already entered in the form; voucher `OLD2024` is expired
**When**: Buyer types `OLD2024` into the voucher field and submits it
**Then**: The page shows a visible error naming the rejection (expired), the total stays at its pre-discount value, and the previously entered traveller/booking fields on the page remain filled exactly as entered, not cleared by the failed voucher submission
**Traces**: SC-3 (BOOKING-002 AC-3; BOOKING-002.3 "rejected with a message naming why"); screen state `voucher-error` (SRS §5)
**Check**: interact_page
