## 3.9.1 `GET /v1/admin/queue` — List pending suppliers and products (ADMIN-001)

**Auth** — `admin` (full or sub-admin).
**Permissions** — `full`, `moderation-only`. Any other `permissions` value
(e.g. `finance-only`, `content-only`), and any non-admin role (`buyer`,
`supplier`), is denied.

**Request**

```
GET /v1/admin/queue
```

No query parameters — the design's two lists (`AdminQueue.tsx`) are each
fixed to one filter: `suppliers.verified = false`, `products.status =
'pending'`. A caller wanting a different `products.status` uses the
existing `GET /v1/products?status=` reader (`data` module), not this
endpoint — this one is the moderation queue, not a general product list.

**Response** — `200`

```json
{
  "suppliers": [
    { "id": "...", "name": "...", "documents": ["https://cdn.../a.pdf"] }
  ],
  "products": [
    { "id": "...", "name": "...", "kind": "...", "next_date": "2026-11-20",
      "price": 480000, "status": "pending" }
  ]
}
```

`next_date` is the earliest `departures.date` with `state = 'Open'` for
that product (same derivation `SITE-001` already uses for a product
card's date; null if the product has no open departure yet — the design's
table renders that cell blank, no frontend change).

**Errors**

| Status | `error.code` | When |
|---|---|---|
| 401 | `UNAUTHENTICATED` | No valid session token |
| 403 | `PERMISSION_DENIED` | Signed in, but not `admin`, or an `admin` whose `permissions` is neither `full` nor `moderation-only` |
| 500 | `INTERNAL` | The query fails for a reason other than a refused connection |
| 503 | `UNAVAILABLE` | The database refuses the connection |

No `404` — an empty queue is `200` with both arrays empty (SRS §5 "empty"
screen state).

---

## 3.9.2 `POST /v1/admin/suppliers/{id}/approve` — Approve a supplier profile (ADMIN-001)

**Auth** — `admin` (full or sub-admin).
**Permissions** — `full`, `moderation-only`.

**Request** — no body. Any body field is rejected.

**Behaviour** — a single conditional update: `UPDATE suppliers SET
verified = true, rejection_reason = NULL, updated_at = now() WHERE id =
$1 AND verified = false RETURNING *`. Zero rows updated because the row
does not exist is `404`; zero rows updated because it was already
`verified = true` is `409` (covers the near-simultaneous-approval race:
the second request's `WHERE verified = false` matches nothing).

**Response** — `200`

```json
{ "id": "...", "verified": true, "rejection_reason": null, "updated_at": "..." }
```

**Errors**

| Status | `error.code` | When |
|---|---|---|
| 400 | `MALFORMED_REQUEST` | A body field is present |
| 401 | `UNAUTHENTICATED` | No valid session token |
| 403 | `PERMISSION_DENIED` | Signed in, but not `admin`, or an `admin` whose `permissions` is neither `full` nor `moderation-only` |
| 404 | `NOT_FOUND` | No `suppliers` row with that `id` |
| 409 | `CONFLICT` | The row exists but `verified` is already `true` (already decided, including the second of two near-simultaneous approvals) |
| 500 | `INTERNAL` | The update query fails for a reason other than a refused connection |
| 503 | `UNAVAILABLE` | The database refuses the connection |

---

## 3.9.3 `POST /v1/admin/suppliers/{id}/reject` — Reject a supplier profile (ADMIN-001)

**Auth** — `admin` (full or sub-admin).
**Permissions** — `full`, `moderation-only`.

**Request**

```json
{ "reason": "Business licence expired" }
```

No other field is accepted.

**Behaviour** — `reason` trimmed must be non-empty (AC-4). A single
conditional update: `UPDATE suppliers SET rejection_reason = $2,
updated_at = now() WHERE id = $1 AND verified = false RETURNING *`.
Rejecting never changes `verified` — it only records the reason, visible
to the supplier on their own `GET /v1/supplier/profile` read (§3.8.1).
Zero rows updated because the row does not exist is `404`; zero rows
updated because it is already `verified = true` is `409` (a reject-after-
approve attempt never overwrites an approval).

**Response** — `200`

```json
{ "id": "...", "verified": false, "rejection_reason": "Business licence expired", "updated_at": "..." }
```

**Errors**

| Status | `error.code` | When |
|---|---|---|
| 400 | `MALFORMED_REQUEST` | A field the request body does not define is present (e.g. `autoNotify`) |
| 401 | `UNAUTHENTICATED` | No valid session token |
| 403 | `PERMISSION_DENIED` | Signed in, but not `admin`, or an `admin` whose `permissions` is neither `full` nor `moderation-only` |
| 404 | `NOT_FOUND` | No `suppliers` row with that `id` |
| 409 | `CONFLICT` | The row is already `verified = true` (approved by another admin first) |
| 422 | `VALIDATION_FAILED` | `reason` is absent, or trims to empty (AC-4) |
| 500 | `INTERNAL` | The update query fails for a reason other than a refused connection |
| 503 | `UNAVAILABLE` | The database refuses the connection |

---

## 3.9.4 `POST /v1/admin/products/{id}/approve` — Approve a product (ADMIN-001)

**Auth** — `admin` (full or sub-admin).
**Permissions** — `full`, `moderation-only`.

**Request** — no body. Any body field is rejected.

**Behaviour** — a single conditional update: `UPDATE products SET status
= 'approved', rejection_reason = NULL, updated_at = now() WHERE id = $1
AND status = 'pending' RETURNING *`. Zero rows updated because the row
does not exist is `404`; zero rows updated because its `status` is no
longer `pending` (already `approved`/`rejected`/decided by another admin
moments earlier) is `409`. A product resubmitted from `rejected` back to
`pending` by its supplier and approved here has its stale
`rejection_reason` cleared to `NULL` in the same write — the response
never carries a reason left over from the earlier rejection.

**Response** — `200`

```json
{ "id": "...", "status": "approved", "rejection_reason": null, "updated_at": "..." }
```

**Errors**

| Status | `error.code` | When |
|---|---|---|
| 400 | `MALFORMED_REQUEST` | A body field is present |
| 401 | `UNAUTHENTICATED` | No valid session token |
| 403 | `PERMISSION_DENIED` | Signed in, but not `admin`, or an `admin` whose `permissions` is neither `full` nor `moderation-only` |
| 404 | `NOT_FOUND` | No `products` row with that `id` |
| 409 | `CONFLICT` | The row's `status` is no longer `pending` (already decided — covers both the near-simultaneous-approval race and an approve attempted after another admin already rejected it) |
| 500 | `INTERNAL` | The update query fails for a reason other than a refused connection |
| 503 | `UNAVAILABLE` | The database refuses the connection |

---

## 3.9.5 `POST /v1/admin/products/{id}/reject` — Reject a product, or request edits (ADMIN-001)

**Auth** — `admin` (full or sub-admin).
**Permissions** — `full`, `moderation-only`.

**Request**

```json
{ "reason": "Photos too dark" }
```

No other field is accepted. The design's "Request edits" control
(`AdminQueue.tsx`) calls this same endpoint with its own message text —
there is no separate action or status value for "edits requested"
(`admin/SRS.md` §4.1 behaviour 4, §7's resolved open question): the
message is the only difference a caller can express.

**Behaviour** — `reason` trimmed must be non-empty (AC-4). A single
conditional update: `UPDATE products SET status = 'rejected',
rejection_reason = $2, updated_at = now() WHERE id = $1 AND status =
'pending' RETURNING *`. Zero rows updated because the row does not exist
is `404`; zero rows updated because its `status` is no longer `pending`
is `409` (covers rejecting a product another admin already approved —
the approval is never silently overwritten).

**Response** — `200`

```json
{ "id": "...", "status": "rejected", "rejection_reason": "Photos too dark", "updated_at": "..." }
```

**Errors**

| Status | `error.code` | When |
|---|---|---|
| 400 | `MALFORMED_REQUEST` | A field the request body does not define is present (e.g. `autoNotify`) |
| 401 | `UNAUTHENTICATED` | No valid session token |
| 403 | `PERMISSION_DENIED` | Signed in, but not `admin`, or an `admin` whose `permissions` is neither `full` nor `moderation-only` |
| 404 | `NOT_FOUND` | No `products` row with that `id` |
| 409 | `CONFLICT` | The row's `status` is no longer `pending` (already approved by another admin) |
| 422 | `VALIDATION_FAILED` | `reason` is absent, or trims to empty (AC-4) |
| 500 | `INTERNAL` | The update query fails for a reason other than a refused connection |
| 503 | `UNAVAILABLE` | The database refuses the connection |

**Notes (§3.9.1–§3.9.5)**

- Reviewed against PR #73 (`AdminQueue.tsx`): it has no mock module —
  it reuses the shared `suppliers`/`products` store that
  `GET /v1/products`/`GET /v1/suppliers` already serve, writing
  `verified`/`status`/`rejection_reason` straight onto those rows via
  `setCollection`. That client-side shape (clear `rejection_reason` on
  approve, set it plus `status: "rejected"` on reject, one shared reason
  textarea keyed to whichever row is targeted) matches the five contracts
  above field-for-field; only `approveSupplier`/`approveProduct`/
  `submitReject`'s bodies change from a local `setCollection` call to
  these `fetch` calls — no component markup change.
- No ERD change: `suppliers.verified`, `suppliers.rejection_reason`,
  `products.status`, `products.rejection_reason` and their `CHECK`
  constraints (`ck_products_status`) already exist (erd.md §3.4, §3.5),
  as do `idx_suppliers_verified` (serves §3.9.1's supplier half) and
  `idx_products_status` (serves §3.9.1's product half and the `409`
  conditional-update check on both endpoints below it).
- The `409` conflict check needs no new column or lock: every write here
  is a single `UPDATE ... WHERE id = $1 AND <current-state column> =
  <expected prior state>`, so a concurrent second write simply matches
  zero rows and the handler reports `409` instead of re-reading first —
  no optimistic-lock version column, no explicit transaction beyond the
  single statement.

## 8.6 Migration plan — Admin supplier and product approval queue (ADMIN-001)

No schema change. `suppliers.verified`, `suppliers.rejection_reason`,
`products.status`, `products.rejection_reason` and their constraints
(`ck_products_status`), plus `idx_suppliers_verified` and
`idx_products_status`, already exist from the base ERD (erd.md §3.4,
§3.5), written ahead of this story and already covering every value and
query the five endpoints above need.

No new table, column, index or constraint. Five endpoints added:
§3.9.1–§3.9.5 above.

**Forward:** none to run. **Backward:** none to run. **Safety on a
populated table:** not applicable — no DDL in this story.

---

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

## 3.9.20 `GET /v1/admin/settings` — List platform settings (ADMIN-007)

**Auth** — `admin` (full or sub-admin).
**Permissions** — `full`, any sub-admin `permissions` value (read-only —
every sub-admin may read this list even though only `full` may write it,
since other screens' "decisions waiting on you" context depends on it).

**Request**

```
GET /v1/admin/settings
```

No query parameters. Small table (erd.md §3.19, "always read in full"),
so no pagination — matches `AdminSystem.tsx`'s and `AdminHome.tsx`'s
`useCollection("settings", { pageSize: 10 })`, which reads the whole
table either way.

**Response** — `200`

```json
{
  "data": [
    { "id": "...", "name": "Default cancellation window", "value": null, "note": "..." }
  ]
}
```

**Errors**

| Status | `error.code` | When |
|---|---|---|
| 401 | `UNAUTHENTICATED` | No valid session token |
| 403 | `PERMISSION_DENIED` | Signed in, but not `admin` |
| 500 | `INTERNAL` | The query fails for a reason other than a refused connection |
| 503 | `UNAVAILABLE` | The database refuses the connection |

## 3.9.21 `PATCH /v1/admin/settings/{id}` — Set a platform setting's value (ADMIN-007)

**Auth** — `admin`, **full only** — no sub-admin `permissions` value
grants this write (failure table: "a sub-admin without system permission
attempts to change settings" is rejected regardless of scope).

**Request**

```json
{ "value": "48 hours" }
```

Only `value` is accepted; `name`/`note`/`id` are never written here. This
one endpoint also carries the terms-and-conditions and booking-
confirmation-email text (ADMIN-007.2): those are `settings` rows too
(`name = "Terms and conditions"` / `"Booking confirmation email"`,
`value` holding the long text), not a separate table or endpoint — the
column is already untyped `text` (erd.md §3.19), so a paragraph fits the
same `value` column a short setting does.

**Behaviour** — `UPDATE settings SET value = $2, updated_at = now() WHERE
id = $1 RETURNING *`; in the same transaction, insert one `audit` row
(`action = "set setting"`, `target = settings.name`, `actor_id` /
`actor_label` = the caller) — this is the one write every requirement in
this module makes that is *itself* ADMIN-007's own audited action, not a
different module's.

**Response** — `200` — the updated row, same shape as one item of
§3.9.20's `data`.

**Errors**

| Status | `error.code` | When |
|---|---|---|
| 400 | `MALFORMED_REQUEST` | A field other than `value` is present |
| 401 | `UNAUTHENTICATED` | No valid session token |
| 403 | `PERMISSION_DENIED` | Signed in, but not `admin`, or an `admin` whose `permissions` is anything other than full (no sub-admin scope grants this write) |
| 404 | `NOT_FOUND` | No `settings` row with that `id` |
| 422 | `VALIDATION_FAILED` | `value` is present and blank after trim (empty string) |
| 500 | `INTERNAL` | The update query fails for a reason other than a refused connection |
| 503 | `UNAVAILABLE` | The database refuses the connection |

## 3.9.22 `GET /v1/admin/audit` — Read the audit log, newest first (ADMIN-007)

**Auth** — `admin`, **full only** — no sub-admin `permissions` value may
read this log (test cases: a `finance-only` sub-admin's own read is
`403`, distinct from §3.9.20's read-only grant to every sub-admin).

**Request**

```
GET /v1/admin/audit?limit=&cursor=
```

| Param | Type | Notes |
|---|---|---|
| `limit` | integer, 1–100 | Default 20, matching the design's `t.size` default |
| `cursor` | string | Opaque, from a previous response's `next_cursor` — same scheme as §3.9.10/§3.9.11 |

**Response** — `200`

```json
{
  "data": [
    { "id": "...", "at": "...", "who": "...", "action": "approved", "target": "..." }
  ],
  "has_more": false,
  "next_cursor": null
}
```

`id` is `audit.id` (bigint, returned as a string per this contract's
existing convention); `at` is `audit.created_at`; `who` is
`audit.actor_label`; sorted `created_at DESC` (erd.md `idx_audit_created_at`).
No write endpoint exists on this path — `POST`/`PATCH`/`DELETE
/v1/admin/audit...` are not routes this contract defines, so the router's
own "no such route" handling (`404`, never a `200`/`201`) is what a caller
gets; this is a property of there being no handler, not a behaviour this
file specifies as a rejection rule.

**Errors**

| Status | `error.code` | When |
|---|---|---|
| 400 | `MALFORMED_REQUEST` | A query parameter outside `limit`/`cursor` is present |
| 401 | `UNAUTHENTICATED` | No valid session token |
| 403 | `PERMISSION_DENIED` | Signed in, but not `admin`, or an `admin` whose `permissions` is not full |
| 422 | `VALIDATION_FAILED` | `limit` present and >100 or ≤0 |
| 500 | `INTERNAL` | The query fails for a reason other than a refused connection |
| 503 | `UNAVAILABLE` | The database refuses the connection |

No `404` — an empty log is `200` with `data: []`, `has_more: false`.

**Notes**

- This story has no UI PR/mock — `AdminSystem.tsx` was built against the
  generic `data`-module `useCollection`/`useRecord` reader (DATA-002) for
  `settings`/`audit`/`notifications`; §3.9.20/§3.9.21/§3.9.22 above are a
  **narrower, dedicated contract** replacing that generic reader for
  `settings` (because its write needs the audit side-effect and the
  full-only write restriction DATA-002 never modelled) and for `audit`
  (because its read needs the full-only restriction and `admin`'s own
  auth, which the `data` module's public, role-less reads never enforce
  per `docs/data/SRS.md` §3 "Out of scope — Authentication and permission
  checks"). **Frontend change required** when this backend lands:
  `AdminSystem.tsx`'s `settings`/`audit` calls move from
  `useCollection("settings"/"audit", ...)` to this story's own
  `lib/admin-platform-settings-and-audit-log.ts` client against
  §3.9.20–22; its `notifications` panel keeps reading the generic `data`
  module reader unchanged (no permission or write concern there).
- Writes exactly one `audit` row per `PATCH /v1/admin/settings/{id}` call,
  matching §6's NFR ("every state-changing admin action produces exactly
  one `audit` row"). Every other admin endpoint in this file
  (§3.9.2–§3.9.5, §3.9.12, etc.) owes the same audit row on its own write;
  tracked as a cross-cutting note here since this story is the first to
  specify the `audit` table's own read/write contract, not a re-scope of
  those endpoints.

## 8.8 Migration plan — Admin platform settings and audit log (ADMIN-007)

No table, column, index or constraint change. `settings` (erd.md §3.19)
and `audit` (erd.md §3.17) already carry every column this story reads or
writes — `settings.name/value/note/updated_at`, `audit.actor_id/
actor_label/action/target/created_at` — and `idx_audit_created_at`
already serves §3.9.22's newest-first read. All written in the base ERD
migration (`0007_finance_admin`), ahead of this story.

One seed addition: a new migration, `0009_seed_admin_settings.up/down.sql`,
inserting five named `settings` rows this story's acceptance criteria
name that the base seed (`0008_seed_settings`, which seeds only "Default
cancellation window" and "Global commission percent") does not yet carry:
"Manual or instant confirmation", "Largest party a 15-minute hold covers",
"Departure scope", "Terms and conditions", "Booking confirmation email" —
all with `value = NULL` (erd.md §3.19's documented "not yet decided"
starting state).

Three endpoints added: §3.9.20, §3.9.21, §3.9.22 above.

**Forward:** `INSERT` the five named rows above with `value = NULL`.
**Backward:** `DELETE` those five named rows by name. **Safety on a
populated table:** safe — insert-only by name, no existing row's `value`
is touched, and the five names are guaranteed not to collide with
`0008`'s two (disjoint name sets).

---
## 3.5.3 `POST /v1/bookings/{id}/voucher` — Apply a discount code at checkout (BOOKING-002)

**Auth** — `buyer`, owning the booking (`bookings.buyer_id = caller.id`).
A booking that exists but belongs to another buyer is treated identically
to one that does not exist (`404`), so ownership is never leaked —
matching BOOKING-004 AC-3's pattern on the sibling complaints endpoint.

**Request**

```json
{ "code": "CUALO10" }
```

No other field is accepted. `code` is required and must not be blank —
an empty-string `code` is a validation failure, distinct from the
UI's "field left empty, no submit" case which never calls this endpoint
(SRS §4.2 boundary table: "Code field submitted empty" → no lookup is
performed client-side; this endpoint is only ever called with a non-empty
string the Buyer typed and submitted).

**Behaviour** — in one transaction:

1. Look up `bookings` by `id`, scoped to the caller (`buyer_id = caller.id`
   AND `status = 'Awaiting Payment'`... — see Notes on status). Not found
   or not owned → `404`.
2. If the booking already has `voucher_id` set (non-null) → `409
   ALREADY_APPLIED` (BOOKING-002.4 — never applied twice to the same
   booking); nothing else is read or written.
3. Look up `vouchers` by `lower(code) = lower($code)` (the existing
   `uq_vouchers_code_lower` index, erd.md §3.13). No match → `404
   NOT_FOUND`.
4. Validate, in order, against the found row: `status <> 'Active'` → `409
   INACTIVE`; `expires < current_date` → `409 EXPIRED`; `used >= "limit"`
   → `409 OVER_LIMIT`. First failing check wins; only one `error.details[0].code`
   is ever returned.
5. On success: compute the discount (`discount_percent` → `total *
   discount_percent / 100`, floored to 2 decimals; `discount_amount` →
   that fixed amount, never reducing `total` below 0), update the
   booking's `total` and set its `voucher_id`, and increment
   `vouchers.used` by exactly 1 — all three writes in the same
   transaction as step 1–4's reads, so a concurrent application of the
   same voucher to a different booking either serializes behind this one
   or the other transaction's own `used >= "limit"` check (step 4) catches
   the race the same way BOOKING-001.5 catches the seat-hold race: the
   update is `UPDATE vouchers SET used = used + 1 WHERE id = $1 AND used <
   "limit" RETURNING used`; zero rows updated means the race was lost,
   and that request falls back to `409 OVER_LIMIT` instead of applying a
   stale read.

**Response** — `200`

```json
{ "total": 1665000, "discount_applied": 185000 }
```

`total` is the booking's new `total` after discount; `discount_applied`
is the amount subtracted (not the voucher's raw percent/amount field, so
the frontend never recomputes it).

**Errors**

| Status | `error.code` | `error.details[0].code` | When |
|---|---|---|---|
| 400 | `MALFORMED_REQUEST` | — | A field the body does not define is present (e.g. `discount_override`) |
| 401 | `UNAUTHENTICATED` | — | No valid session token |
| 403 | `PERMISSION_DENIED` | — | Signed in, but not role `buyer` |
| 404 | `NOT_FOUND` | — | No `bookings` row with that `id`, or it belongs to another buyer, or no `vouchers` row matches `code` (case-insensitive) |
| 409 | `CONFLICT` | `ALREADY_APPLIED` | The booking already has a `voucher_id` set |
| 409 | `CONFLICT` | `INACTIVE` | The matched voucher's `status` is not `'Active'` |
| 409 | `CONFLICT` | `EXPIRED` | The matched voucher's `expires` has passed |
| 409 | `CONFLICT` | `OVER_LIMIT` | The matched voucher's `used >= "limit"` (checked twice: once on read, once atomically on the write, per Behaviour step 5) |
| 422 | `VALIDATION_FAILED` | — | `code` is present and blank (empty string) |
| 500 | `INTERNAL` | — | A query or insert fails for a reason other than a refused connection |
| 503 | `UNAVAILABLE` | — | The database refuses the connection |

**Notes**

- A booking no longer `Awaiting Payment` (already `Paid`/`Confirmed`/
  terminal) is out of this requirement's stated scope — BOOKING-002's SRS
  text only describes `/checkout/:id`, which is reached before payment.
  This endpoint does not additionally gate on `status`, matching the test
  cases (`docs/booking/test-cases/voucher-and-discount-code-checkout.md`),
  which never exercise a non-`Awaiting Payment` booking; a booking in any
  status is found by step 1 as long as it is the caller's own, and the
  normal `ALREADY_APPLIED`/voucher-state checks are what actually gate
  re-application.
- Matches the SRS's own response shape (§4.2 doesn't prescribe a wire
  shape; this story has no UI PR/mock to read, so the response above is
  this design's own choice) and the merged test cases' expectations
  (`total`, `discount_applied`, `error.details[0].code`) exactly — no
  frontend change needed since there is no frontend yet for this field;
  when `/checkout/:id`'s voucher step is built it implements against this
  contract directly, no mock to reconcile.

## 8.6 Migration plan — Voucher and discount code checkout (BOOKING-002)

No schema change. `vouchers` (erd.md §3.13) and `bookings.voucher_id`/
`bookings.total` (erd.md §3.11) already carry every column this story
reads or writes — `vouchers.status`, `used`, `"limit"`, `expires`,
`discount_percent`, `discount_amount`, and `bookings.voucher_id`,
`total` — plus `uq_vouchers_code_lower` (this endpoint's case-insensitive
lookup) and the existing `ck_vouchers_used_bounds` constraint (`used >= 0
AND used <= "limit"`, which the atomic `UPDATE ... WHERE used < "limit"`
in Behaviour step 5 never violates). All written in the base ERD
migration, ahead of this story.

One endpoint added: §3.5.3 above (`POST /v1/bookings/{id}/voucher`).

**Forward:** none to run — no DDL. **Backward:** none to run. **Safety
on a populated table:** not applicable, no DDL in this story.

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

---

## 3.10 `POST /v1/contact` — Deliver a contact submission (CONTACT-001)

**Auth** — none. The endpoint is open to every visitor (`contact/SRS.md`
§4.1 "Not applicable — no permission model").

### 3.10.1 Request/response

**Request**

```json
{ "name": "...", "contact": "...", "message": "...", "honeypot": "" }
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | Non-blank after trim |
| `contact` | string | yes | Non-blank after trim — a phone number or an email, not validated as either (the design's single `reply_to` input accepts both) |
| `message` | string | no | May be blank or absent — SRS §4.1 behaviour 3 names only `name`/`contact` as required |
| `honeypot` | string | no | Blank on a real visitor; the frontend's hidden `website` input maps to this field at the HTTP boundary — a bot that fills every field sends this non-blank |

No other field is accepted.

**Behaviour**

1. Reject a non-JSON body or a field outside the table above with `400
   MALFORMED_REQUEST` before looking at `honeypot` — a malformed request is
   never partially processed.
2. Reject a blank/absent `name` or `contact` with `422 VALIDATION_FAILED`
   and a `details` array naming each blank field — checked before the
   honeypot, so a bot that fills the honeypot but leaves `name` blank still
   gets `422`, not the fake `202` (honeypot secrecy only covers a
   *well-formed* submission).
3. If `honeypot` is non-blank: do nothing further — no outbound call — and
   return `202` (AC-2's "visitor still sees sent").
4. Otherwise, forward `{ name, contact, message }` to the platform's
   configured Agent Team inbox endpoint, server-side, using
   `AGENT_TEAM_API_URL`/`AGENT_TEAM_KEY` (§8.7 below — the backend's own
   copy of the same platform-level values `site.json`/`site.ts` already use
   client-side; no new secret, per `contact/SRS.md` §7). The forward
   failing (non-2xx or unreachable) returns `503`; it succeeding returns
   `202`.

**Response** — `202`, body `{}`, identical for a real send and a
honeypot drop (contract rule the test cases AC-1/AC-2 fetch_url scenarios
check byte-for-byte).

**Errors**

| Status | `error.code` | When |
|---|---|---|
| 400 | `MALFORMED_REQUEST` | Body is not valid JSON, or a field outside `name`/`contact`/`message`/`honeypot` is present |
| 422 | `VALIDATION_FAILED` | `name` and/or `contact` is absent or blank after trim; `details` names each |
| 500 | `INTERNAL` | An unexpected failure other than the forward being unreachable/rejected |
| 503 | `UNAVAILABLE` | The Agent Team inbox endpoint rejects the forward or cannot be reached |

No `401`/`403` — the endpoint has no auth. No `404` — there is no resource
to look up.

**Notes**

- This is a proxy, not a store: nothing here writes to this project's own
  database (`contact/SRS.md` "Data touched" — forwarded, not persisted).
- Matches the merged test cases
  (`docs/contact/test-cases/contact-message-form.md`) field-for-field
  (`name`/`contact`/`message`/`honeypot`, the `202`/`400`/`422`/`503`
  split) — those were written against this exact contract ahead of this
  design step, so this section ratifies rather than invents the shape.
- **Frontend change required**: today `ContactForm.tsx`/`src/site.ts`
  call the Agent Team endpoint directly from the browser
  (`sendEnquiry` → `fetch(`${API}/${KEY}/messages`)`), using the field
  names `reply_to`/`website`. The BE story for this plan item rewires
  `sendEnquiry` to call this backend's `POST /v1/contact` instead,
  renaming `reply_to` → `contact` and `website` → `honeypot` at the call
  site — the same camelCase/snake_case-style boundary rename every other
  module in this file already does. `PageViews`' separate `/views` beacon
  is untouched; it is not part of this story.

## 8.7 Migration plan — Contact message form (CONTACT-001)

No schema change. The submission is forwarded, never stored — no table,
column, index or constraint is added for this story.

One handler added: `POST /v1/contact` (§3.10.1). It depends on two
environment values, `AGENT_TEAM_API_URL` and `AGENT_TEAM_KEY` — the
backend's own copies of the same platform-level endpoint/key
`code/frontend/src/site.json` already carries for the client-side call
being replaced; add both to `code/backend/.env.example` alongside
`DATABASE_URL`/`PORT` as runtime-injected, not stakeholder-supplied
secrets (`contact/SRS.md` §7: "already configured at the platform level;
no new secret requested here").

**Forward:** none to run — no DDL. **Backward:** none to run.
**Safety on a populated table:** not applicable, no DDL in this story.
