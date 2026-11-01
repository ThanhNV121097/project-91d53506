# Test Cases — Booking creation with inventory hold

Module: `booking`
Function: BOOKING-001 — `POST /v1/bookings` (`docs/booking/SRS.md` §4.1,
`docs/booking/stories/booking-creation-with-inventory-hold.md`,
`docs/architecture/services.md` §3.5.1)

Risk level: **High**. This is the project's inventory-correctness path —
money and seat capacity both depend on the atomic decrement never slipping
under concurrency, and an overbooked departure cannot be undone after the
fact. Coverage below is weighted accordingly: every acceptance criterion
gets a case, the concurrency criterion (SC-5) and the upstream-failure
criterion (SC-8) each get their own case rather than being folded into the
happy path, and every contract rule in services.md §3.5.1 (unknown field,
missing auth, not-found departure, wrong departure state) gets its own
case too since a backend review is blocked on exactly those.

---

**Scenario**: Booking created within remaining seats decrements capacity and holds seats
**Given**: A departure with 5 seats remaining, open, with a valid product/price; a signed-in Buyer
**When**: The Buyer submits `POST /v1/bookings` with `departure_id`, `adults: 2`, `children: 1`, and valid `traveller_name`/`traveller_phone`/`traveller_email`
**Then**: Response is `201` with `status: "Awaiting Payment"`, `held_until` set to 15 minutes after creation, and a `bookings` row exists for that id; `GET /v1/{collection}/{id}` (or the departure's own read) for that departure now reads `seats: 2`
**Traces**: SC-1 (BOOKING-001 AC-1)
**Check**: fetch_url

---

**Scenario**: Booking request exceeding remaining seats is rejected and leaves capacity unchanged
**Given**: A departure with 2 seats remaining
**When**: A Buyer submits `POST /v1/bookings` with `adults: 3`, `children: 0` against that departure, with valid traveller fields
**Then**: Response is `409 CONFLICT`; no `bookings` row is created; the departure's `seats` still reads 2 afterward
**Traces**: SC-2 (BOOKING-001 AC-2)
**Check**: fetch_url

---

**Scenario**: Expired hold is released on lazy read and the booking is cancelled
**Given**: A `bookings` row with `status: "Awaiting Payment"`, `held_until` set to 16 minutes in the past, holding seats on a departure
**When**: `GET /v1/bookings/{id}` is called for that booking (the lazy check-on-read named in services.md §3.5.1's Notes)
**Then**: The response shows `status: "Cancelled"` for that booking, and the departure's `seats` reflects the released seats added back
**Traces**: SC-3 (BOOKING-001 AC-3)
**Check**: fetch_url

---

**Scenario**: A hold within its 15-minute window is left untouched
**Given**: A `bookings` row with `status: "Awaiting Payment"`, `held_until` 5 minutes in the future (created 10 minutes ago)
**When**: `GET /v1/bookings/{id}` is called for that booking
**Then**: The response still shows `status: "Awaiting Payment"`; the departure's held seats are unchanged
**Traces**: SC-4 (BOOKING-001 AC-5)
**Check**: fetch_url

---

**Scenario**: Two simultaneous bookings for the last seat — exactly one succeeds
**Given**: A departure with exactly 1 seat remaining
**When**: Two `POST /v1/bookings` requests, each for 1 adult against that departure, are fired within the same second
**Then**: Exactly one request returns `201` with a created `bookings` row; the other returns `409 CONFLICT` as in SC-2; the departure's `seats` reads 0 afterward, never negative, and never two bookings coexist for that one seat
**Traces**: SC-5 (BOOKING-001 AC-4)
**Check**: fetch_url

---

**Scenario**: Party size exactly equal to remaining seats succeeds and exhausts capacity
**Given**: A departure with exactly N seats remaining (e.g. N=4)
**When**: A Buyer submits `POST /v1/bookings` with `adults + children = N`
**Then**: Response is `201`; the departure's `seats` reads 0 afterward
**Traces**: SC-6 (BOOKING-001 — Boundary)
**Check**: fetch_url

---

**Scenario**: Submitting the booking form with a missing traveller field shows an inline error and submits nothing
**Given**: The Buyer is on `/book/:id` with a valid departure selected, adults/children filled in, but the traveller name field left blank
**When**: The Buyer submits the form
**Then**: An inline error renders under the traveller name field; the submit does not navigate away from `/book/:id`; no `bookings` row exists afterward for that departure (seat count unchanged)
**Traces**: SC-7 (BOOKING-001 — Invalid input)
**Check**: interact_page

---

**Scenario**: Missing required traveller field at the API is rejected as a validation failure
**Given**: A valid, open departure with seats remaining
**When**: `POST /v1/bookings` is submitted with `traveller_name` omitted (or blank) and all other fields valid
**Then**: Response is `422 VALIDATION_FAILED` with a `details` entry naming the field; no `bookings` row is created; the departure's `seats` is unchanged
**Traces**: SC-7 (BOOKING-001 — Invalid input), contract (POST /v1/bookings)
**Check**: fetch_url

---

**Scenario**: Zero-length party is rejected
**Given**: A valid, open departure with seats remaining
**When**: `POST /v1/bookings` is submitted with `adults: 0`, `children: 0` and otherwise-valid traveller fields
**Then**: Response is `422 VALIDATION_FAILED`; no `bookings` row is created; `seats` is unchanged
**Traces**: contract (POST /v1/bookings)
**Check**: fetch_url

---

**Scenario**: A failed write mid-transaction leaves neither the booking nor the seat decrement applied
**Given**: A departure with seats remaining, and the booking-creation write arranged to fail partway through its transaction (e.g. a forced query failure after the seat decrement step but before the `bookings` insert commits)
**When**: `POST /v1/bookings` is submitted with an otherwise-valid request
**Then**: Response is `500 INTERNAL`; no `bookings` row exists for the attempt; the departure's `seats` is unchanged from before the attempt (never left decremented without a matching booking)
**Traces**: SC-8 (BOOKING-001 — Upstream failure)
**Check**: fetch_url

---

**Scenario**: A request body field the contract does not define is rejected, not silently ignored
**Given**: A valid, open departure with seats remaining
**When**: `POST /v1/bookings` is submitted with a well-formed body plus an extra field the contract does not define (e.g. `"total_override": 1`)
**Then**: Response is `400 MALFORMED_REQUEST`; no `bookings` row is created; `seats` is unchanged
**Traces**: contract (POST /v1/bookings)
**Check**: fetch_url

---

**Scenario**: A nonexistent departure id is rejected as not found
**Given**: A `departure_id` that matches no row in `departures`
**When**: `POST /v1/bookings` is submitted with that `departure_id` and otherwise-valid fields
**Then**: Response is `404 NOT_FOUND`; no `bookings` row is created
**Traces**: contract (POST /v1/bookings)
**Check**: fetch_url

---

**Scenario**: A departure that is not Open is rejected even with seats remaining
**Given**: A departure whose `state` is not `'Open'` (e.g. `'Closed'`) but whose `seats` column still shows a positive remaining count
**When**: `POST /v1/bookings` is submitted against that departure with a valid party size and traveller fields
**Then**: Response is `409 CONFLICT`; no `bookings` row is created; `seats` is unchanged
**Traces**: contract (POST /v1/bookings)
**Check**: fetch_url

---

**Scenario**: An unauthenticated request is rejected
**Given**: No session token (or an invalid/expired one) presented
**When**: `POST /v1/bookings` is submitted with an otherwise-valid body
**Then**: Response is `401 UNAUTHENTICATED`; no `bookings` row is created
**Traces**: contract (POST /v1/bookings — Auth: buyer)
**Check**: fetch_url
