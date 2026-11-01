# Test cases — Booking confirmation with QR and notice

Module: `booking` · Requirement: `BOOKING-003` · Story:
`docs/booking/stories/booking-confirmation-with-qr-and-notice.md`

Risk: medium-high — this is the Buyer's proof of a paid booking and the
sole trigger for the confirmation notification; a wrong render (blank
fields, invented QR for an unpaid booking) or a missed/duplicated
notification event both have real user and ops impact. Covered in
proportion: full coverage of the two states on the GET endpoint, the
id-vs-code auth split, the not-found/ownership non-leak rule, the
contract's malformed-request rule, and the notification de-dup rule.

---

**Scenario**: Confirmed booking renders full confirmation with code and QR
**Given**: A `bookings` row with `code = "NA-7X42K9"`, `status = "Confirmed"`
**When**: `GET /v1/bookings/NA-7X42K9` is requested (no auth header)
**Then**: `200` with body containing `id`, `code = "NA-7X42K9"`, `status`,
`total`, `adults`, `children`, `traveller_name`, `departure`, `payment`
**Traces**: SC-1 (BOOKING-003 AC-1)
**Check**: fetch_url

---

**Scenario**: Confirmed booking page shows code, QR, trip, date, travellers, total
**Given**: The same `Confirmed` booking `NA-7X42K9`
**When**: `/booking/NA-7X42K9` is opened in the browser
**Then**: The page renders the booking code `NA-7X42K9` as text, a QR
graphic (`svg[role=img]` with `aria-label` containing the code), the trip
name, the date, the traveller count and the total amount paid — none of
those fields blank or placeholder
**Traces**: SC-1 (BOOKING-003 AC-1)
**Check**: render_url

---

**Scenario**: Completed booking also renders the full confirmation
**Given**: A `bookings` row with `code = "NA-9HT63B"`, `status = "Completed"`
**When**: `GET /v1/bookings/NA-9HT63B` is requested
**Then**: `200` with the same full confirmation shape as AC-1 (status
`Completed` is accepted exactly like `Confirmed`)
**Traces**: SC-1 (BOOKING-003 AC-1, "or Completed")
**Check**: fetch_url

---

**Scenario**: QR encodes the booking's own code, not a fixed placeholder
**Given**: Two different `Confirmed` bookings, `NA-7X42K9` and `NA-9HT63B`
**When**: Both `/booking/:code` pages are opened
**Then**: Each page's QR element's `aria-label` contains that page's own
code (`"Booking code NA-7X42K9"` vs `"Booking code NA-9HT63B"`) — the QR
is not one static graphic reused across bookings
**Traces**: SC-1 (BOOKING-003 AC-1, "a QR encoding the code")
**Check**: render_url

---

**Scenario**: Unknown code returns not-found, not a blank confirmation
**Given**: No `bookings` row has `code = "NA-000000"`
**When**: `GET /v1/bookings/NA-000000` is requested
**Then**: `404` with error envelope `{"error":{"code":"NOT_FOUND", ...}}`
**Traces**: SC-2 (BOOKING-003 AC-2)
**Check**: fetch_url

---

**Scenario**: Unknown code page shows a clear not-found state
**Given**: No `bookings` row has `code = "NA-000000"`
**When**: `/booking/NA-000000` is opened in the browser
**Then**: A clear not-found state renders (explicit not-found text) —
never the confirmation layout with empty/placeholder code, QR, trip, date
or total fields
**Traces**: SC-2 (BOOKING-003 AC-2)
**Check**: render_url

---

**Scenario**: Booking still Awaiting Payment is treated as not-found by code
**Given**: A `bookings` row with `code = "NA-2PD40C"`, `status = "Awaiting Payment"`
**When**: `GET /v1/bookings/NA-2PD40C` is requested (no auth header)
**Then**: `404 NOT_FOUND` — the confirmation layout and QR are not produced
for an unconfirmed booking; the endpoint treats it the same as no match
**Traces**: SC-4 (BOOKING-003 Behaviour-1)
**Check**: fetch_url

---

**Scenario**: Awaiting-payment booking's code page shows no QR
**Given**: The same `Awaiting Payment` booking `NA-2PD40C`
**When**: `/booking/NA-2PD40C` is opened in the browser
**Then**: The confirmation layout with QR is not rendered; the not-found
state (or equivalent non-confirmation render) shows instead — no QR is
drawn for an unconfirmed booking
**Traces**: SC-4 (BOOKING-003 Behaviour-1)
**Check**: render_url

---

**Scenario**: Owner buyer looks up their own booking by id
**Given**: A `Confirmed` booking owned by buyer A, known by its `id`
**When**: Buyer A, signed in, requests `GET /v1/bookings/{id}`
**Then**: `200` with the full booking shape
**Traces**: Contract (`GET /v1/bookings/{id_or_code}`)
**Check**: fetch_url

---

**Scenario**: A different buyer cannot look up someone else's booking by id
**Given**: A `Confirmed` booking owned by buyer A, known by its `id`
**When**: Buyer B, signed in, requests `GET /v1/bookings/{id}`
**Then**: `404 NOT_FOUND` — same code as a genuinely missing id, so
existence of buyer A's booking is never leaked to buyer B
**Traces**: Contract (`GET /v1/bookings/{id_or_code}`, BOOKING-003 AC-2)
**Check**: fetch_url

---

**Scenario**: An unrecognized body field on the lookup is rejected, not ignored
**Given**: A `Confirmed` booking `NA-7X42K9`
**When**: `GET /v1/bookings/NA-7X42K9` is requested with a JSON body
containing a field the contract does not define, e.g. `{"foo":"bar"}`
**Then**: `400` with `{"error":{"code":"MALFORMED_REQUEST", ...}}` — the
request is rejected, not silently processed with the extra field dropped
**Traces**: Contract (§2.3 error catalog, `MALFORMED_REQUEST`)
**Check**: fetch_url

---

**Scenario**: A database failure on lookup is reported as an internal error
**Given**: The `bookings` table/query is made to fail (e.g. a renamed
table) while the backend process stays up
**When**: `GET /v1/bookings/NA-7X42K9` is requested
**Then**: `500` with `{"error":{"code":"INTERNAL", ...}}`
**Traces**: Contract (§2.3 error catalog, `INTERNAL`)
**Check**: fetch_url

---

**Scenario**: Database unreachable on lookup is reported as unavailable
**Given**: The database is made to refuse connections while the backend
process stays up (`set_db_available` off)
**When**: `GET /v1/bookings/NA-7X42K9` is requested
**Then**: `503` with `{"error":{"code":"UNAVAILABLE", ...}}`
**Traces**: Contract (§2.3 error catalog, `UNAVAILABLE`)
**Check**: fetch_url

---

**Scenario**: Transition to Confirmed raises exactly one notification event
**Given**: A booking `NA-5QJ81M` in status `Awaiting Payment`
**When**: It transitions to `Confirmed` (performed by `payments`, e.g. via
the VNPay IPN success path)
**Then**: Exactly one row is written to `notifications` per channel for
the event string `"booking.confirmed:<booking-id>"` — i.e. `GET
/v1/admin/notifications` lists one event for this booking's transition,
not zero and not duplicated
**Traces**: SC-3 (BOOKING-003 AC-3)
**Check**: fetch_url

---

**Scenario**: A duplicate confirmation signal does not raise a second event
**Given**: Booking `NA-5QJ81M` already transitioned to `Confirmed` and its
notification event already recorded
**When**: A duplicate confirmation signal for the same booking arrives
again (e.g. a replayed VNPay IPN on an already-`succeeded` payment)
**Then**: `uq_notifications_event_channel` prevents a second row for
`"booking.confirmed:<booking-id>"` per channel — `GET
/v1/admin/notifications` still shows exactly one event for this booking
**Traces**: SC-3 (BOOKING-003 AC-3, de-dup)
**Check**: fetch_url

---

**Scenario**: QrCode component draws from the code string, no external library
**Given**: The `/booking/:code` page for a `Confirmed` booking
**When**: The page is opened
**Then**: The QR mark is an inline `<svg>` element (drawn locally from the
code), not an `<img>` pointing at an external QR-generation service
**Traces**: Story UI scope ("`QrCode` component rendering the booking code
deterministically, no external QR library")
**Check**: render_url
