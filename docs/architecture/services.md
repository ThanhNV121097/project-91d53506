## 3.8.8 `GET /v1/supplier/bookings` — List bookings on the caller's own products (SUPPLIERS-005)

**Auth** — `supplier`. Returns only bookings whose `departures.product_id`
joins to a `products` row with `supplier_id = caller's suppliers.id`
(`suppliers.user_id = caller.id`) — never another supplier's (SUPPLIERS-005
AC-1, SRS §6 "never exposed to another supplier's session").

**Request**

```
GET /v1/supplier/bookings?departure_date=&limit=&cursor=
```

Query parameters — exactly these, no others (the merged test cases'
"unknown query parameter" scenario fixes this list; `status`/`q` are the
design's own client-side table filters over this same `data` array, not a
second server-side filter this endpoint accepts):

| Param | Type | Notes |
|---|---|---|
| `departure_date` | date (`YYYY-MM-DD`) | Exact match on `departures.date`. Omitted: lists every booking on the caller's own products. This same parameter is what the passenger-list panel (`SupplierBookings.tsx`) calls with the travel-date filter pinned to one date — there is no separate passenger-list endpoint (SUPPLIERS-005 AC-4). |
| `limit` | integer, 1–100 | Default 20 |
| `cursor` | string | Opaque, from a previous response's `next_cursor` |

**Response** — `200`

```json
{
  "data": [
    {
      "id": "...",
      "code": "NA-7X42K9",
      "product_name": "Cửa Lò beach break, 2 days 1 night",
      "date": "2026-11-14",
      "travellers": 3,
      "total": 4625000,
      "status": "Paid",
      "confirmation": ""
    }
  ],
  "has_more": false,
  "next_cursor": null
}
```

`product_name` is read via `departures.product_id → products.name`;
`date` is `departures.date`; `travellers` is `bookings.adults +
bookings.children` (none of these three are columns on `bookings` itself,
same join pattern as ADMIN-004's list, erd.md §3.11); `confirmation` is
`products.confirmation` (erd.md §3.5) — empty string when the product
requires manual confirmation, non-empty when it auto-confirms — so the
frontend can decide, per row, whether to draw the Confirm/Reject actions
(SUPPLIERS-005 behaviour 3), without a second request.

**Errors**

| Status | `error.code` | When |
|---|---|---|
| 400 | `MALFORMED_REQUEST` | A query parameter outside the table above is present (e.g. `status`) |
| 401 | `UNAUTHENTICATED` | No valid session token |
| 403 | `PERMISSION_DENIED` | Signed in, but not role `supplier` |
| 422 | `VALIDATION_FAILED` | `limit` is present and >100 (never clamped) or ≤0 |
| 500 | `INTERNAL` | The query fails for a reason other than a refused connection |
| 503 | `UNAVAILABLE` | The database refuses the connection |

No `404` — no bookings on a given `departure_date`, or no bookings at
all, is `200` with `data: []`, `has_more: false` (matches ADMIN-004 AC-3's
pattern, and the design's "No booking matches these filters" empty state,
SRS §5).

---

## 3.8.9 `POST /v1/supplier/bookings/{id}/confirm` / `POST /v1/supplier/bookings/{id}/reject` — Confirm or reject a manual-confirmation booking (SUPPLIERS-005)

**Auth** — `supplier`. Writes only a booking reachable through the
caller's own product (`departures.product_id → products.supplier_id =
caller's suppliers.id`) — a booking that exists but belongs to another
supplier's product is treated identically to one that does not exist
(`404`), the same ownership-hiding pattern BOOKING-002 and ADMIN-004 both
already use.

**Request** — no body, for either action. Any body field is rejected.

**Behaviour** — in one transaction, for both actions:

1. Look up the `bookings` row by `id`, joined through `departures` to
   `products`, scoped to the caller's own `supplier_id`. Not found or not
   owned → `404 NOT_FOUND`.
2. If the product's `confirmation` field is non-empty (instant-confirm) →
   `409 CONFLICT` — an instant-confirm product's bookings auto-advance via
   `payments`/`booking` and never show or accept this manual action
   (SUPPLIERS-005 behaviour 3).
3. If the booking's `status <> 'Paid'` → `409 CONFLICT` — only a `Paid`
   booking is confirmable/rejectable; this also covers two near-
   simultaneous confirm/reject attempts, since the first to commit moves
   `status` off `'Paid'` and the second finds it already changed.
4. **Confirm**: `UPDATE bookings SET status = 'Confirmed', updated_at =
   now() WHERE id = $1 AND status = 'Paid' RETURNING *`.
5. **Reject**: `UPDATE bookings SET status = 'Cancelled', updated_at =
   now() WHERE id = $1 AND status = 'Paid' RETURNING *`, then release the
   seats this booking held: `UPDATE departures SET seats = LEAST(seats +
   $party_size, capacity), updated_at = now() WHERE id = $departure_id`
   (`$party_size` = the rejected booking's `adults + children`; `LEAST`
   against `capacity` is belt-and-suspenders — `ck_departures_seats_bounds`
   already forbids `seats > capacity`, this just avoids relying on the
   constraint to turn a bug into a 500).
   Both writes are in the same transaction as steps 1–3's reads, so the
   conditional `WHERE status = 'Paid'` on step 4/5's own `UPDATE` is what
   actually catches the race named in step 3 — step 3's read is for the
   error response's own diagnosis, not the sole guard.

**Response** — `200`

```json
{ "id": "...", "status": "Confirmed", "updated_at": "..." }
```

(`"status": "Cancelled"` for the reject path.)

**Errors**

| Status | `error.code` | When |
|---|---|---|
| 400 | `MALFORMED_REQUEST` | A body field is present (e.g. `note`) |
| 401 | `UNAUTHENTICATED` | No valid session token |
| 403 | `PERMISSION_DENIED` | Signed in, but not role `supplier` |
| 404 | `NOT_FOUND` | No `bookings` row with that `id`, or it is not on a product owned by the caller |
| 409 | `CONFLICT` | The booking's product has a non-empty `confirmation` (instant-confirm), or the booking's `status` is not `'Paid'` |
| 500 | `INTERNAL` | The update query fails for a reason other than a refused connection |
| 503 | `UNAVAILABLE` | The database refuses the connection |

**Notes (§3.8.8–§3.8.9)**

- Reviewed against PR #66's `SupplierBookings.tsx` (no isolated mock
  module — it reads/writes the project's shared JSON mock store directly,
  `src/data/bookings.json` + `useCollection`/`setCollection`, the same
  convention every other dashboard list in this repo already uses before
  its backend lands). Its client-side shape — `code`, `product_name`,
  `date`, `travellers`, `total`, `status`, `confirmation` per row, plus an
  in-place status write on Confirm/Reject — matches §3.8.8's response
  fields and §3.8.9's behaviour one-to-one. One deliberate departure: the
  mock's main table additionally filters client-side by `status` and a
  free-text search (`q`) because `useCollection` runs those over the
  *entire* local JSON array for free; the real endpoint does not accept
  either as a query parameter (confirmed by the merged test cases'
  "unknown query parameter" scenario). When the backend lands, `status`/
  `q` filtering on the main table becomes a client-side `.filter()` over
  this endpoint's own already-fetched page, or is dropped from that
  table's filter row — a small `SupplierBookings.tsx` change, not a
  contract gap; the passenger-list panel's `departure_date` filter is
  unaffected, since that one maps straight onto this endpoint's own query
  parameter.
- The mock's Confirm action currently has no Reject button in PR #66's own
  diff excerpt reviewed at UI-review time beyond a single "Confirm"
  control; the merged test cases (SUPPLIERS-005 AC-3) require a distinct
  Reject action moving the booking to `Cancelled`. `docs/suppliers/SRS.md`
  §4.4 behaviour 2 also names both actions. This design's §3.8.9 adds
  both; if the UI PR did not yet draw a Reject button, that is a UI-side
  gap against its own SRS, not a reason to leave the backend one action
  short — the BE story adds `POST .../reject` regardless, and the FE
  pairing (if missing) is a one-button addition to the existing actions
  cell.
- No ERD change: `bookings.status`, `departures.seats`, `departures.
  capacity`, `products.confirmation` and their `CHECK` constraints
  (`ck_bookings_status`, `ck_departures_seats_bounds`) already exist
  (erd.md §3.5, §3.6, §3.11), as does `idx_bookings_departure_id` (serves
  §3.8.8's `departure_date` filter and SUPPLIERS-005 AC-4's passenger
  list) and `idx_products_supplier_id` (serves the ownership join on every
  endpoint above).
- The `409` conflict checks need no new column or lock, matching
  ADMIN-001's own note: every write is a single `UPDATE ... WHERE id = $1
  AND status = 'Paid'`, so a concurrent second write matches zero rows and
  the handler reports `409` instead of trusting a stale read.

## 8.8 Migration plan — Supplier booking and passenger management (SUPPLIERS-005)

No schema change. `bookings.status`, `bookings.adults`, `bookings.
children`, `departures.seats`, `departures.capacity`, `products.
confirmation` and their constraints (`ck_bookings_status`, `ck_departures_
seats_bounds`), plus `idx_bookings_departure_id` and `idx_products_
supplier_id`, already exist from the base ERD (erd.md §3.5, §3.6, §3.11),
written ahead of this story and already covering every value and query
the two endpoints above need.

No new table, column, index or constraint. Two endpoints added: §3.8.8
(`GET /v1/supplier/bookings`) and §3.8.9 (`POST .../confirm`, `POST
.../reject`) above.

**Forward:** none to run. **Backward:** none to run. **Safety on a
populated table:** not applicable — no DDL in this story.
