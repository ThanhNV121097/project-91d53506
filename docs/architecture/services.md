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

---

## 3.8.1 `GET /v1/supplier/profile` — Supplier registration and verification (SUPPLIERS-001)

**Auth** — `supplier`. Returns the caller's own `suppliers` row only
(`suppliers.user_id = caller.id`); there is no path parameter — a
supplier can never read another's profile by id.

**Response** — `200`

```json
{
  "id": "...", "name": "...", "place": "...", "kind": "...",
  "documents": ["https://cdn.../a.pdf"],
  "verified": false, "rejection_reason": null,
  "bank_name": "...", "bank_account_number": "...", "bank_account_holder": "...",
  "updated_at": "..."
}
```

If the signed-in supplier account has not yet submitted a profile, the
row is created empty at account creation time (so this call never 404s
for a valid `supplier` session — AC-2's "already verified" and the
default "pending" case are both just reads of this same row).

**Errors**

| Status | `error.code` | When |
|---|---|---|
| 401 | `UNAUTHENTICATED` | No valid session token |
| 403 | `PERMISSION_DENIED` | Signed in, but not role `supplier` |
| 500 | `INTERNAL` | The read query fails for a reason other than a refused connection |
| 503 | `UNAVAILABLE` | The database refuses the connection |

## 3.8.2 `PATCH /v1/supplier/profile` — submit/update profile and bank details (SUPPLIERS-001)

**Auth** — `supplier`. Writes only the caller's own row
(`suppliers.user_id = caller.id`) — never accepts an `id`/`supplier_id`
field naming a different row (AC: "Not permitted" in SRS §4.1).

**Request** — any subset of:

```json
{
  "name": "...", "place": "...", "kind": "...",
  "documents": ["https://cdn.../a.pdf"],
  "bank_name": "...", "bank_account_number": "...", "bank_account_holder": "..."
}
```

A field omitted is left unchanged. `verified` and `rejection_reason` are
never accepted here — both are admin-only derived fields (SUPPLIERS-001.2;
`admin` module owns the write).

**Response** — `200` — the updated row, same shape as 3.8.1.

**Errors**

| Status | `error.code` | When |
|---|---|---|
| 400 | `MALFORMED_REQUEST` | A field the request body does not define is present (e.g. `verified`, `rejection_reason`, `id`, `supplier_id`), or any accepted field is sent as `null` (no field here has a "clear it" case — AC-3 requires a value, not a clear) |
| 401 | `UNAUTHENTICATED` | No valid session token |
| 403 | `PERMISSION_DENIED` | Signed in, but not role `supplier` |
| 422 | `VALIDATION_FAILED` | `bank_account_number` present and blank (AC-3) |
| 500 | `INTERNAL` | The write query fails for a reason other than a refused connection |
| 503 | `UNAVAILABLE` | The database refuses the connection |

**Notes**

- Matches the UI PR's mock (`code/frontend/src/lib/mock/supplier-registration-and-verification.ts`,
  PR #56) field-for-field: its `SupplierProfile` (`name`, `documents`,
  `verified`, `rejectionReason`, `bankName`, `bankAccountNumber`,
  `bankAccountHolder`) maps onto this row with only the expected
  camelCase↔snake_case rename (`rejectionReason` → `rejection_reason`,
  etc.) that every other module in this file already uses at the
  HTTP boundary — no frontend change needed when the backend lands,
  only `readProfile`/`writeProfile` become `GET`/`PATCH` calls and
  `uploadDocument` becomes the call at 3.8.13 below.
- The SRS's own "Data touched" table for SUPPLIERS-001 (§4.1) also names
  `place` and `kind` as writable here even though today's
  `SupplierAccount.tsx` screen does not render those two fields yet.
  They are included in the request body above so that a later screen
  change needs no new endpoint — `admin`'s approval queue (ADMIN-001)
  already reads them from this same row.

## 3.8.13 `POST /v1/media` — the shared upload endpoint (SUPPLIERS-006)

**Auth** — `supplier` or `admin`. Does not know or care which form
called it — SUPPLIERS-001's licence upload and SUPPLIERS-002's product
photo upload both call this one endpoint and store the URL it returns
on their own row (`suppliers.documents` / `products.image`).

**Request** — `multipart/form-data`, one field:

| Field | Type | Required | Constraints |
|---|---|---|---|
| `file` | binary | yes | ≤ 10 MB; one of `image/jpeg`, `image/png`, `image/webp`, `application/pdf` |

**Response** — `201`

```json
{ "url": "https://cdn.../abc123.jpg" }
```

An image is compressed server-side before storage (AC-1); a PDF is
stored as-is (AC-2, no compression required for a non-image file).

**Errors**

| Status | `error.code` | When |
|---|---|---|
| 400 | `MALFORMED_REQUEST` | A multipart field other than `file` is present, or `file` is missing |
| 401 | `UNAUTHENTICATED` | No valid session token |
| 403 | `PERMISSION_DENIED` | Signed in, but role is neither `supplier` nor `admin` |
| 422 | `VALIDATION_FAILED` | `file` exceeds 10 MB, or its content-type is not in the accepted set (AC-3) — rejected before any byte is written to storage, so nothing partial is ever left referencing a file that does not exist |
| 503 | `UNAVAILABLE` | The storage/CDN provider rejects the write or cannot be reached (AC-3's upstream-failure row; the same code this file already uses for "a dependency this request needs is unreachable", distinct from `INTERNAL`, which is this service's own query failing) |

**Depends on** — `MEDIA_STORAGE_CLOUD_NAME`, `MEDIA_STORAGE_API_KEY`,
`MEDIA_STORAGE_API_SECRET` (already listed in `overview.md` §6 against
this same requirement). Until a real provider account is wired, Dev may
stub the storage client behind this same interface — the contract above
does not change either way.

## 8.5 Migration plan — Supplier registration and verification (SUPPLIERS-001, SUPPLIERS-006)

No schema change. `suppliers` (`erd.md` §3.4) already has every column
this story reads or writes — `name`, `place`, `kind`, `documents`,
`verified`, `rejection_reason`, `bank_name`, `bank_account_number`,
`bank_account_holder` — plus `uq_suppliers_user_id` (the "one profile,
looked up by the caller's own account" index this module's every read
and write uses) and `idx_suppliers_verified` (used by `admin`'s queue,
not this story). All written in the base ERD migration, ahead of this
story; nothing here adds a table, column, index or constraint.

This story adds three handlers: `GET /v1/supplier/profile` (§3.8.1),
`PATCH /v1/supplier/profile` (§3.8.2), and the shared `POST /v1/media`
(§3.8.13) — the latter did not exist in this file before this story and
is built here since SUPPLIERS-002 (product photos) also depends on it
and has not landed yet.

Reviewed against the UI PR's mock (PR #56,
`code/frontend/src/lib/mock/supplier-registration-and-verification.ts`):
its `SupplierProfile` shape and its `uploadDocument` stand-in match
§3.8.1/§3.8.2/§3.8.13 above one-to-one (see the note under §3.8.2) — no
frontend change required when these handlers replace the mock; only the
two functions' bodies change from a `localStorage` read/write to a real
`fetch`.

**Forward:** none to run — no DDL. **Backward:** none to run.
**Safety on a populated table:** not applicable, no DDL in this story.
