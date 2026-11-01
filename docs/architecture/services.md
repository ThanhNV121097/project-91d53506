## 3.5.4 `POST /v1/bookings/{id}/complaints` — Request cancellation/refund (BOOKING-004)

**Auth** — `buyer`, owning the booking only. A booking `id` that matches no
row, and a booking `id` that exists but belongs to a different buyer, both
return `404` — the same non-leaking rule `GET /v1/bookings/{id_or_code}`
(§3.5.2, BOOKING-003 AC-2) already uses, so existence of another buyer's
booking is never revealed by this endpoint either.

**Request**

```json
{ "issue": "Please cancel, plans changed", "refund_requested": 500000 }
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `issue` | string | yes | Non-blank after trim |
| `refund_requested` | number | no | Omitted = no amount named (`refund_requested` stored `NULL`, per erd.md §3.15) |

No other field is accepted.

**Behaviour** — in one transaction:

1. Look up `bookings` by `id`. No row, or a row whose `buyer_id` is not the
   caller's, is `404`.
2. `issue` absent or blank after trim is `422 VALIDATION_FAILED`.
3. Insert a `complaints` row: `booking_id = bookings.id`, `customer =
   bookings.traveller_name` (denormalized at request time, erd.md §3.15),
   `issue`, `refund_requested` (or `NULL`), `status = 'Open'`, `opened_at =
   now()`. `uq_complaints_booking_open` (erd.md §3.15, partial `WHERE
   status = 'Open'`) is the actual duplicate guard: if it already holds an
   `Open` row for this `booking_id`, the insert raises a uniqueness
   violation, which this endpoint reports as `409 CONFLICT` rather than
   `500` — the same "near-simultaneous attempts" treatment ADMIN-004's own
   write endpoints already give their conditional updates (§3.9.2's notes).
4. `bookings.status` is never written by this endpoint (BOOKING-004 AC-2)
   — only `admin`'s manual refund (§3.9.12) ever moves it to `Refunded`.

**Response** — `201`

```
Location: /v1/complaints/{id}
```

```json
{ "id": "...", "status": "Open", "opened_at": "..." }
```

**Errors**

| Status | `error.code` | When |
|---|---|---|
| 400 | `MALFORMED_REQUEST` | A field the request body does not define is present (e.g. `force_refund`) |
| 401 | `UNAUTHENTICATED` | No valid session token |
| 403 | `PERMISSION_DENIED` | Signed in, but role is not `buyer` |
| 404 | `NOT_FOUND` | No `bookings` row with that `id`, or it belongs to a different buyer |
| 409 | `CONFLICT` | An `Open` `complaints` row already exists for this `booking_id` (`uq_complaints_booking_open`) |
| 422 | `VALIDATION_FAILED` | `issue` is absent or blank after trim; `details` names `issue` |
| 500 | `INTERNAL` | The insert fails for a reason other than a refused connection |
| 503 | `UNAVAILABLE` | The database refuses the connection |

**Notes**

- This is the only write BOOKING-004 performs. Listing the Buyer's own
  bookings with their tracked complaint status on `/account` is
  `ACCOUNT-001`'s `GET /v1/account/bookings` (§3.3.1) reading the same
  `complaints` row via `idx_complaints_booking_id` — out of scope here,
  covered by that module.
- No request/response shape was carried from a frontend mock: this story
  has no UI PR (no `/account` request-action screen has shipped a mock
  yet), so the shape above is designed directly from `docs/booking/SRS.md`
  §4.4 and reviewed against the already-merged
  `docs/booking/test-cases/buyer-cancellation-and-refund-requests.md`,
  which already names this exact method, path, status codes and body
  shape — this section ratifies that contract rather than inventing a
  second one.
- Reuses the project's existing error catalog (§2.3) and the `404`-for-
  not-owned convention already set by `GET /v1/bookings/{id_or_code}` —
  no new error code, no new pagination scheme (this endpoint returns no
  list).

## 8.8 Migration plan — Buyer cancellation and refund requests (BOOKING-004)

No schema change. `complaints` (erd.md §3.15) was written ahead of this
story — during the Admin bookings search and refunds design (ADMIN-004) —
already carrying every column this endpoint needs: `booking_id`,
`customer`, `issue`, `opened_at`, `refund_requested`, `status`, plus
`ck_complaints_status`, `uq_complaints_booking_open` (explicitly traced to
BOOKING-004 already, erd.md §3.15) and `idx_complaints_booking_id`
(likewise traced to "BOOKING-004's own-booking check"). `bookings.status`
and `bookings.buyer_id` (erd.md §3.11) are read-only in this requirement.

One handler added: `POST /v1/bookings/{id}/complaints` (§3.5.4 above).

**Forward:** none to run — no DDL. **Backward:** none to run.
**Safety on a populated table:** not applicable, no DDL in this story.
