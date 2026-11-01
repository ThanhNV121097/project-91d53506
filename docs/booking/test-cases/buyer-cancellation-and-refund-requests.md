# Test cases — Buyer cancellation and refund requests

Module: `booking` · Requirement: `BOOKING-004`
Contract endpoint: `POST /v1/bookings/{id}/complaints` (`docs/architecture/services.md` §3.5.4)

Risk: medium — no money moves directly from this requirement (the actual
refund stays with `admin`/ADMIN-004), but the record created here is the
Buyer's only visible proof a request exists, and the own-booking
ownership check is a permission boundary. Coverage: every SC gets a case,
the duplicate-open-request conflict, the ownership denial, and the
contract's validation/malformed/not-found/auth rules each get their own
case.

---

**Scenario**: Requesting cancellation on a confirmed booking creates a tracked, visible status without changing the booking
**Given**: A signed-in Buyer owns a `Confirmed` booking `NA-7X42K9`, no open complaint exists for it
**When**: The Buyer submits `POST /v1/bookings/{id}/complaints` with `{ "issue": "Please cancel, plans changed" }`
**Then**: Response is `201`, `Location: /v1/complaints/{id}`, body `{ "id", "status": "Open", "opened_at" }`; re-reading the booking via `GET /v1/bookings/{id}` still shows `status = "Confirmed"` (unchanged)
**Traces**: SC-1 (BOOKING-004 AC-1)
**Check**: fetch_url

---

**Scenario**: The created request is visible to the Buyer afterward
**Given**: The request created in the previous scenario, for booking `NA-7X42K9`
**When**: The Buyer opens `/account`
**Then**: The page shows that booking with a tracked "requested"/open status visible to the Buyer, not just the original booking status
**Traces**: SC-1 (BOOKING-004 AC-1, "visible to that Buyer afterward")
**Check**: render_url

---

**Scenario**: Creating the request never itself changes the booking to Refunded
**Given**: A Buyer's own `Confirmed` booking with no open complaint
**When**: The Buyer submits `POST /v1/bookings/{id}/complaints` with a valid `issue`, and no admin action follows
**Then**: Response is `201`; `GET /v1/bookings/{id}` immediately after still reads `status = "Confirmed"`, never `"Refunded"`
**Traces**: SC-2 (BOOKING-004 AC-2)
**Check**: fetch_url

---

**Scenario**: A Buyer cannot request cancellation against a booking that is not theirs
**Given**: Booking `NA-9HT63B` is owned by Buyer A; Buyer B is signed in
**When**: Buyer B submits `POST /v1/bookings/{id}/complaints` for Buyer A's booking id, with a valid `issue`
**Then**: Response is `404 NOT_FOUND`; no `complaints` row is created for that booking
**Traces**: SC-3 (BOOKING-004 AC-3)
**Check**: fetch_url

---

**Scenario**: A second request against a booking that already has an open complaint is rejected, not duplicated
**Given**: Booking `NA-3KF95R` already has a `complaints` row with `status = "Open"`
**When**: The owning Buyer submits `POST /v1/bookings/{id}/complaints` again for the same booking with a valid `issue`
**Then**: Response is `409 CONFLICT`; no second `complaints` row is created for that booking (`uq_complaints_booking_open` holds — exactly one `Open` row remains)
**Traces**: Failure/boundary table — Conflict (BOOKING-004)
**Check**: fetch_url

---

**Scenario**: A blank issue is rejected as a validation failure
**Given**: A Buyer's own `Confirmed` booking with no open complaint
**When**: The Buyer submits `POST /v1/bookings/{id}/complaints` with `{ "issue": "" }`
**Then**: Response is `422 VALIDATION_FAILED` with a `details` entry naming `issue`; no `complaints` row is created
**Traces**: Contract (`POST /v1/bookings/{id}/complaints`, `issue` required non-blank)
**Check**: fetch_url

---

**Scenario**: Submitting the request form with the issue field blank shows an inline error and submits nothing
**Given**: The Buyer is on `/account` with the cancellation/refund request action open for one of their bookings, the issue field left blank
**When**: The Buyer submits the form
**Then**: An inline error renders under the issue field; no navigation away from `/account`; no `complaints` row exists afterward for that booking
**Traces**: Contract (`issue` required non-blank), SC-1 negative path
**Check**: interact_page

---

**Scenario**: A nonexistent booking id is rejected as not found
**Given**: A booking id that matches no row in `bookings`
**When**: `POST /v1/bookings/{id}/complaints` is submitted against that id with a valid `issue`
**Then**: Response is `404 NOT_FOUND`; no `complaints` row is created
**Traces**: Contract (`POST /v1/bookings/{id}/complaints`, not found/not owned)
**Check**: fetch_url

---

**Scenario**: An unauthenticated request is rejected
**Given**: No session token (or an invalid/expired one) presented
**When**: `POST /v1/bookings/{id}/complaints` is submitted for a valid booking id with a valid `issue`
**Then**: Response is `401 UNAUTHENTICATED`; no `complaints` row is created
**Traces**: Contract (Auth: buyer, owning the booking)
**Check**: fetch_url

---

**Scenario**: A request body field the contract does not define is rejected, not silently ignored
**Given**: A Buyer's own `Confirmed` booking with no open complaint
**When**: `POST /v1/bookings/{id}/complaints` is submitted with `{ "issue": "Change date", "force_refund": true }`
**Then**: Response is `400 MALFORMED_REQUEST`; no `complaints` row is created
**Traces**: Contract (§2.3/§2.5, `MALFORMED_REQUEST`)
**Check**: fetch_url

---

**Scenario**: An optional refund_requested amount is accepted and stored
**Given**: A Buyer's own `Confirmed` booking with no open complaint
**When**: The Buyer submits `POST /v1/bookings/{id}/complaints` with `{ "issue": "Cancel, request refund", "refund_requested": 500000 }`
**Then**: Response is `201` with `status: "Open"`; the created complaint's `refund_requested` reads `500000` when read back (e.g. via `GET /v1/admin/complaints` or the collection reader)
**Traces**: Contract (`refund_requested` optional field)
**Check**: fetch_url

---

**Scenario**: Omitting refund_requested is accepted as "no amount named"
**Given**: A Buyer's own `Confirmed` booking with no open complaint
**When**: The Buyer submits `POST /v1/bookings/{id}/complaints` with `{ "issue": "Please reschedule" }` (no `refund_requested` field)
**Then**: Response is `201`; the created complaint's `refund_requested` is null/absent when read back
**Traces**: Contract (`refund_requested` optional, "omit = no amount named")
**Check**: fetch_url

---

**Scenario**: A database failure on the request write is reported as an internal error
**Given**: A Buyer's own `Confirmed` booking with no open complaint, and the `complaints` table/query made to fail (e.g. a renamed table) while the backend process stays up
**When**: `POST /v1/bookings/{id}/complaints` is submitted with a valid `issue`
**Then**: Response is `500 INTERNAL`; no `complaints` row exists for the attempt
**Traces**: Contract (§2.3 error catalog, `INTERNAL`)
**Check**: fetch_url

---

**Scenario**: Database unreachable on the request write is reported as unavailable
**Given**: A Buyer's own `Confirmed` booking with no open complaint, and the database made to refuse connections while the backend process stays up (`set_db_available` off)
**When**: `POST /v1/bookings/{id}/complaints` is submitted with a valid `issue`
**Then**: Response is `503 UNAVAILABLE`; no `complaints` row exists for the attempt
**Traces**: Contract (§2.3 error catalog, `UNAVAILABLE`)
**Check**: fetch_url
