## 3.9.10 `GET /v1/admin/bookings` — List/search bookings (ADMIN-004)

**Auth** — `admin` (full or sub-admin).
**Permissions** — `full`, `finance-only`. Any other `permissions` value, and
any non-admin role, is denied.

**Request**

```
GET /v1/admin/bookings?code=&status=&date_from=&date_to=&limit=&cursor=
```

Query parameters — exactly these, no others:

| Param | Type | Notes |
|---|---|---|
| `code` | string | Case-insensitive match against `bookings.code`. The design's search box is labelled "Search by booking code" and sends only this — `product_name`/`supplier_name` are shown as columns but are not a separate search key for this endpoint (narrower than ADMIN-004's prose "searchable by code/product/supplier"; AC-1/AC-3 and the merged test cases only exercise exact/no-match by code, so this ships as code-only search and the SRS line is read as "found via its code" — no frontend change, the mock's search box never sent anything else). |
| `status` | string | One of `bookings.status`'s enum values |
| `date_from` | date (`YYYY-MM-DD`) | Inclusive lower bound on `bookings.created_at::date` |
| `date_to` | date | Inclusive upper bound |
| `limit` | integer, 1–100 | Default 20 |
| `cursor` | string | Opaque, from a previous response's `next_cursor` |

**Response** — `200`

```json
{
  "data": [
    {
      "id": "...",
      "code": "NA-7X42K9",
      "product_name": "...",
      "supplier_name": "...",
      "date": "2026-11-20",
      "total": 1850000,
      "status": "Paid",
      "created_at": "..."
    }
  ],
  "has_more": false,
  "next_cursor": null
}
```

`product_name` and `supplier_name` are read via a join through
`departures.product_id → products.name` and `products.supplier_id →
suppliers.name`; `date` is `departures.date` for the booking's
`departure_id` (none of these three are columns on `bookings` itself —
see erd.md §3.11 — this endpoint reads, never writes, the join).

**Errors**

| Status | `error.code` | When |
|---|---|---|
| 400 | `MALFORMED_REQUEST` | A query parameter outside the table above is present (e.g. `sort_by`) |
| 401 | `UNAUTHENTICATED` | No valid session token |
| 403 | `PERMISSION_DENIED` | Signed in, but not `admin`, or an `admin` whose `permissions` is neither `full` nor `finance-only` |
| 422 | `VALIDATION_FAILED` | `limit` is present and >100 (never clamped) or ≤0 |
| 500 | `INTERNAL` | The query fails for a reason other than a refused connection |
| 503 | `UNAVAILABLE` | The database refuses the connection |

No `404` — an empty result set is `200` with `data: []`, `has_more: false`
(AC-3).

---

## 3.9.11 `GET /v1/admin/complaints` — List complaints raised against bookings (ADMIN-004)

**Auth** — `admin` (full or sub-admin).
**Permissions** — `full`, `finance-only`.

**Request**

```
GET /v1/admin/complaints?limit=&cursor=
```

No filter by `status` — the design's complaints panel (`AdminBookings.tsx`)
reads this list unfiltered (its "Refund manually" action already shows a
disabled "Refunded" label for a resolved row instead of hiding it, so the
list mixes `Open` and resolved rows by design, not by a missing filter).

| Param | Type | Notes |
|---|---|---|
| `limit` | integer, 1–100 | Default 10, matching the design's `pageSize: 10` |
| `cursor` | string | Opaque |

**Response** — `200`

```json
{
  "data": [
    {
      "id": "...",
      "booking_code": "NA-7X42K9",
      "customer": "...",
      "issue": "...",
      "opened_at": "...",
      "refund_requested": 500000,
      "status": "Open"
    }
  ],
  "has_more": false,
  "next_cursor": null
}
```

`booking_code` is read via `complaints.booking_id → bookings.code` (erd.md
§3.15 stores `booking_id`, not a denormalized code column — the mock's flat
`booking_code` field becomes this join, no other frontend field changes).

**Errors**

| Status | `error.code` | When |
|---|---|---|
| 400 | `MALFORMED_REQUEST` | A query parameter outside `limit`/`cursor` is present |
| 401 | `UNAUTHENTICATED` | No valid session token |
| 403 | `PERMISSION_DENIED` | Signed in, but not `admin`, or an `admin` whose `permissions` is neither `full` nor `finance-only` |
| 422 | `VALIDATION_FAILED` | `limit` present and >100 or ≤0 |
| 500 | `INTERNAL` | The query fails for a reason other than a refused connection |
| 503 | `UNAVAILABLE` | The database refuses the connection |

---

## 3.9.12 `POST /v1/admin/complaints/{id}/refund` — Process a manual refund (ADMIN-004)

**Auth** — `admin` (full or sub-admin).
**Permissions** — `full`, `finance-only`.

**Request**

```
POST /v1/admin/complaints/{id}/refund
```

No request body. Any body field is rejected (the mock's `refund()` call
takes no body either, per PR #74's `setCollection` calls).

**Behaviour** — in one transaction: the `complaints` row with that `id`
must have `status = 'Open'`; on success its `status` becomes `Refunded`,
and the `bookings` row referenced by its `booking_id` has its `status` set
to `Refunded` regardless of its current value (AC-2 does not require it to
be `Paid` first — a dispute can be raised and resolved from any
non-terminal booking state).

**Response** — `200`

```json
{
  "booking": { "id": "...", "status": "Refunded" },
  "complaint": { "id": "...", "status": "Refunded" }
}
```

**Errors**

| Status | `error.code` | When |
|---|---|---|
| 400 | `MALFORMED_REQUEST` | A body field is present (e.g. `amount`) |
| 401 | `UNAUTHENTICATED` | No valid session token |
| 403 | `PERMISSION_DENIED` | Signed in, but not `admin`, or an `admin` whose `permissions` is neither `full` nor `finance-only` |
| 404 | `NOT_FOUND` | No `complaints` row with that `id` |
| 409 | `CONFLICT` | The complaint's `status` is not `'Open'` (already `Resolved`/`Refunded` — also covers two near-simultaneous refund attempts: the second finds it already resolved) |
| 500 | `INTERNAL` | The update query fails for a reason other than a refused connection |
| 503 | `UNAVAILABLE` | The database refuses the connection |

**Notes**

- Writes `bookings.status` and `complaints.status` only; both columns and
  their `CHECK` constraints already exist (erd.md §3.11, §3.15) — no ERD
  change for this story.
- `idx_complaints_status` (partial `WHERE status = 'Open'`, erd.md §3.15)
  and `idx_bookings_status_created_at` (erd.md §3.11) already serve this
  endpoint's own read (`WHERE id = $1 AND status = 'Open'`, the conflict
  check) and the list endpoint's status/date filter respectively — no new
  index needed.

## 8.5 Migration plan — Admin bookings search and refunds (ADMIN-004)

No schema change. `bookings.status`, `complaints.status` and their
`CHECK` constraints (`ck_bookings_status`, `ck_complaints_status`), plus
`uq_bookings_code`, `idx_bookings_status_created_at` and
`idx_complaints_status`, already exist from the base ERD (erd.md §3.11,
§3.15), written ahead of this story and already covering every value and
query this story's three endpoints need.

No new table, column, index or constraint. Three endpoints added: §3.9.10,
§3.9.11, §3.9.12 above.

**Forward:** none to run. **Backward:** none to run. **Safety on a
populated table:** not applicable — no DDL in this story.
