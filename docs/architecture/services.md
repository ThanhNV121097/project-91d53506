## 3.9.13 `PATCH /v1/admin/commission` — Set the global commission rate (ADMIN-005)

**Auth** — `admin`, full or sub-admin with `permissions = 'finance-only'`
(matches the `AdminFinance.tsx` route's own nav tag, `admin003.permission_gating`
memory). Any other sub-admin scope is `403` (test cases: a
`moderation-only` sub-admin's call is rejected).

**Request**

```json
{ "rate": 10.0 }
```

Only `rate` is accepted — a request carrying any other field (e.g.
`appliesTo`) is `400 MALFORMED_REQUEST`, never silently ignored (test
cases, "Commission rate rejected on a field the contract does not
define").

**Behaviour** — a single conditional update plus one audit row, in one
transaction:

```sql
UPDATE settings SET value = $1::text, updated_at = now()
WHERE name = 'Global commission percent'
RETURNING value
```

followed by one `INSERT INTO audit (actor_id, actor_label, action,
target) VALUES ($caller_id, $caller_label, 'set commission', 'Global
commission percent')`. The row always exists — seeded, unset, by
`0008_seed_settings` ahead of this story (erd.md §8, `decision.
commission_rate`) — so this is never a `404`; it is a value already
present, being set for the first time or changed.

A rate change is forward-only in its effect: it changes what
`GET /v1/supplier/revenue` (§3.8.10) and this story's own reconciliation
(§3.9.15 below) compute from this point on. It never rewrites a
`payouts` row already created by an earlier reconciliation run
(ADMIN-005 AC-4) — that guarantee holds because reconciliation reads this
setting only at the moment it runs, and never re-reads it for a period
already reconciled.

**Response** — `200`

```json
{ "rate": 10.0 }
```

(`settings.value` is stored as `text`; the response parses it back to a
number so this endpoint's shape matches what it accepted, not the raw
column type.)

**Errors**

| Status | `error.code` | When |
|---|---|---|
| 400 | `MALFORMED_REQUEST` | A field other than `rate` is present |
| 401 | `UNAUTHENTICATED` | No valid session token |
| 403 | `PERMISSION_DENIED` | Signed in, but not `admin`, or a sub-admin whose `permissions` is not `finance-only` |
| 422 | `VALIDATION_FAILED` | `rate` is absent, not a number, or outside `0`–`100` inclusive — message names the valid range |
| 500 | `INTERNAL` | The update or audit insert fails for a reason other than a refused connection |
| 503 | `UNAVAILABLE` | The database refuses the connection |

**Notes**

- No mock module exists for this story (no UI PR) — the request/response
  shape above is designed from `AdminFinance.tsx`'s already-merged form
  (`#rate` input, "Save commission" button, currently
  `onSubmit={(e) => e.preventDefault()}`) and the SRS's own ADMIN-005
  behaviour/AC list. **Frontend change required** when this backend
  lands: that form's submit handler calls this endpoint instead of doing
  nothing, then refetches the page's `payouts`/`suppliers` collections so
  the "Platform revenue" stat and the reconciliation table's Commission/
  Payout columns reflect the saved rate (test case "Submitting the
  commission form with a valid rate updates the page").
- Audit row per ADMIN-007's NFR ("every state-changing admin action
  produces exactly one `audit` row") — this is one of the admin writes
  that note names as owing its own row, not yet given one until now.

---

## 3.9.14 `PATCH /v1/admin/suppliers/{id}/commission` — Set or clear a
per-supplier commission override (ADMIN-005)

**Auth** — `admin`, full or sub-admin with `permissions = 'finance-only'`
— same scope as §3.9.13.

**Request**

```json
{ "rate": 15.0 }
```

or, to clear an override and fall back to the global rate:

```json
{ "rate": null }
```

Only `rate` is accepted.

**Behaviour**

```sql
UPDATE suppliers SET commission = $2, updated_at = now()
WHERE id = $1
RETURNING id, name, place, kind, verified, commission, created_at, updated_at
```

`$2` is the submitted `rate`, or `NULL` to clear — `suppliers.commission`
is already nullable for exactly this reason (erd.md §3.4: "null = use
the global rate"); the `ck_suppliers_commission_range` check (erd.md §3.4)
already enforces `0`–`100` at the database, but the handler validates
the same range before the query so the error is `422` with a message,
not a raw constraint-violation `500`. One `audit` row is written in the
same transaction: `action = 'set supplier commission'`, `target =` the
supplier's `name`.

**Response** — `200` — the updated row:

```json
{
  "id": "...", "name": "Cửa Lò Beach Stays", "place": "Cửa Lò",
  "kind": "Tour operator", "verified": true, "commission": 15.0,
  "created_at": "...", "updated_at": "..."
}
```

**Errors**

| Status | `error.code` | When |
|---|---|---|
| 400 | `MALFORMED_REQUEST` | A field other than `rate` is present |
| 401 | `UNAUTHENTICATED` | No valid session token |
| 403 | `PERMISSION_DENIED` | Signed in, but not `admin`, or a sub-admin whose `permissions` is not `finance-only` |
| 404 | `NOT_FOUND` | No `suppliers` row with that `id` |
| 422 | `VALIDATION_FAILED` | `rate` is present, non-null, and outside `0`–`100` inclusive |
| 500 | `INTERNAL` | The update or audit insert fails for a reason other than a refused connection |
| 503 | `UNAVAILABLE` | The database refuses the connection |

**Notes**

- `AdminFinance.tsx`'s "Override for one supplier" `Select` plus the same
  `#rate` field currently submit nowhere (shared form,
  `onSubmit={(e) => e.preventDefault()}`). **Frontend change required**:
  when a supplier is selected in that dropdown, "Save commission" calls
  this endpoint with that supplier's id instead of §3.9.13; when no
  supplier is selected ("Every supplier"), it calls §3.9.13 instead. This
  is the one behavioural fork the backend step adds to that form — the
  SRS's own §4.5 behaviour 1 names both the global and the per-supplier
  path as the same screen's two actions, and the shared form already has
  the two fields side by side for exactly this choice.

---

## 3.9.15 `POST /v1/admin/payouts/reconcile` — Run payout reconciliation
for a period (ADMIN-005)

**Auth** — `admin`, full or sub-admin with `permissions = 'finance-only'`.

**Request**

```json
{ "period": "2026-11" }
```

`period` is `YYYY-MM`; any other shape is `422 VALIDATION_FAILED` (test
case, `"period": "October 2026"`). Only `period` is accepted — a
`force` field or any other is `400 MALFORMED_REQUEST`.

**Behaviour**

1. Reject outright if any `payouts` row already exists for this `period`
   (`SELECT 1 FROM payouts WHERE period = $1 LIMIT 1`) — `409 CONFLICT`,
   matching the test case "Re-running reconciliation for an
   already-reconciled period is rejected" and `uq_payouts_supplier_period`
   (erd.md §3.14): a period is reconciled once, in full, or not at all.
2. Otherwise, in one transaction, for every supplier with at least one
   qualifying booking, compute and insert:
   - **Qualifying bookings** — joined `bookings → departures → products`
     where `products.supplier_id` is the supplier's id, `departures.date`
     falls within the calendar month named by `period`, and
     `bookings.status IN ('Paid','Confirmed','Completed')` — the same
     revenue-counted set `GET /v1/supplier/revenue` (§3.8.10) already
     uses, so a supplier's own revenue figure and admin's reconciled
     `gross` for the same period are never two different numbers for the
     same bookings.
   - `gross` = `SUM(bookings.total)` over that set.
   - `rate` = the supplier's own `suppliers.commission` if non-null,
     else `settings` row `"Global commission percent"`'s `value`, else
     `0` — the exact precedence `decision.commission_rate` and §3.8.10
     already use (ADMIN-005 AC-2).
   - `commission` = `round(gross * rate / 100)`; `net` = `gross -
     commission`.
   - `INSERT INTO payouts (supplier_id, period, gross, commission, net,
     status) VALUES (..., 'Pending')`.
   A supplier with no qualifying booking in the period gets no row (test
   case AC-3: "3 suppliers having confirmed bookings... 2 do not" →
   exactly 3 rows).
3. One `audit` row for the whole run: `action = 'reconciled payouts'`,
   `target =` the period string — one admin action, one row, not one per
   payout (ADMIN-007's NFR is "exactly one `audit` row" per
   state-changing action; the action here is "ran reconciliation for this
   period", not each resulting payout).
4. If the transaction fails partway (step 10 in the failure table), it
   rolls back entirely — no partial `payouts` rows for the period survive
   (test case, "A database failure during reconciliation surfaces as a
   500... no partial `payouts` rows are left").

**Response** — `201`

```json
{
  "data": [
    { "id": "...", "supplier_id": "...", "supplier_name": "Cửa Lò Beach Stays",
      "period": "2026-11", "gross": 9515000, "commission": 951500,
      "net": 8563500, "status": "Pending", "paid_on": null }
  ]
}
```

**Errors**

| Status | `error.code` | When |
|---|---|---|
| 400 | `MALFORMED_REQUEST` | A field other than `period` is present |
| 401 | `UNAUTHENTICATED` | No valid session token |
| 403 | `PERMISSION_DENIED` | Signed in, but not `admin`, or a sub-admin whose `permissions` is not `finance-only` |
| 409 | `CONFLICT` | A `payouts` row already exists for this `period` (reconciliation already ran) |
| 422 | `VALIDATION_FAILED` | `period` is absent or not `YYYY-MM` |
| 500 | `INTERNAL` | The transaction fails for a reason other than a refused connection |
| 503 | `UNAVAILABLE` | The database refuses the connection |

**Notes**

- No mock module exists for this story. `AdminFinance.tsx` today has no
  "run reconciliation" control at all — it only lists existing `payouts`
  rows and shows a "Mark paid" action per row. **Frontend change
  required**: a "Run reconciliation" action (period picker + button) is
  added to that screen, calling this endpoint and then refreshing the
  `payouts` table; this is new UI the backend step must add, not a
  rewire of an existing control, since the SRS's behaviour 3 ("Running
  reconciliation for a period creates `payouts` rows") has no screen
  control yet.
- Why reject the whole run rather than skip already-reconciled suppliers:
  the SRS's own AC-4 and the test suite both treat "a period" as the unit
  that is reconciled once; a partial-skip design would let one admin
  action produce a different row count depending on timing, which the
  test cases do not define behaviour for. Rejecting outright is the
  smaller, correct surface.

---

## 3.9.16 `GET /v1/admin/payouts` — List payout rows (ADMIN-005)

**Auth** — `admin`, full or sub-admin with `permissions = 'finance-only'`.

**Request**

```
GET /v1/admin/payouts?period=&limit=&cursor=
```

| Param | Type | Notes |
|---|---|---|
| `period` | string, `YYYY-MM` | Optional exact-match filter (test case, "Listing payouts filtered by period") |
| `limit` | integer, 1–100 | Default 20; over the max is rejected, never clamped — same rule as §3.8.11/§3.9.22 |
| `cursor` | string | Opaque, from a previous response's `next_cursor` |

Any other query parameter is `400 MALFORMED_REQUEST`.

**Behaviour**

```sql
SELECT p.id, p.supplier_id, s.name AS supplier_name, p.period, p.gross,
       p.commission, p.net, p.status, p.paid_on
FROM payouts p JOIN suppliers s ON s.id = p.supplier_id
WHERE ($period IS NULL OR p.period = $period)
ORDER BY p.period DESC, p.created_at DESC
```

cursor-paginated, using `idx_payouts_supplier_id` for the join and a scan
over `payouts` itself for the `period`/order filter — this table is one
row per supplier per reconciled period (erd.md §3.14 projection: low
volume, see erd.md §6), so no dedicated composite index is added for this
read.

**`supplier_name` is read via join, not a stored column** — `payouts` has
no `supplier_name` column (erd.md §3.14); the seed mock
(`code/frontend/src/data/payouts.json`) carries one as a flat denormalized
field, but storing it here would let a supplier rename silently
disagree with its own payout history. The join costs nothing extra at
this table's size and keeps one source of truth for the name.

**Response** — `200`

```json
{
  "data": [
    { "id": "...", "supplier_id": "...", "supplier_name": "Cửa Lò Beach Stays",
      "period": "2026-10", "gross": 9515000, "commission": 951500,
      "net": 8563500, "status": "Pending", "paid_on": null }
  ],
  "has_more": false,
  "next_cursor": null
}
```

No `404` for an empty or filtered-to-nothing result — `200` with `data:
[]`, `has_more: false`.

**Errors**

| Status | `error.code` | When |
|---|---|---|
| 400 | `MALFORMED_REQUEST` | A query parameter outside `period`/`limit`/`cursor` is present |
| 401 | `UNAUTHENTICATED` | No valid session token |
| 403 | `PERMISSION_DENIED` | Signed in, but not `admin`, or a sub-admin whose `permissions` is not `finance-only` |
| 422 | `VALIDATION_FAILED` | `limit` is present and >100 (never clamped) or ≤0, or `period` is present and not `YYYY-MM` |
| 500 | `INTERNAL` | The query fails for a reason other than a refused connection |
| 503 | `UNAVAILABLE` | The database refuses the connection |

**Notes**

- `AdminFinance.tsx`'s reconciliation table currently reads
  `useCollection("payouts", { page, pageSize, sort })` (the generic
  `data`-module reader, DATA-002) — unscoped by permission and with no
  `supplier_name` join. **Frontend change required**: that call moves to
  this story's own `lib/admin-commission-and-payout-reconciliation.ts`
  client against this endpoint, switching from page-number to cursor
  pagination in `DataTable`'s existing cursor-mode (the same migration
  §3.8.11's notes describe for `SupplierAccount.tsx`). The `gross`
  reducer feeding the "Gross booked"/"Owed to suppliers" stats keeps
  summing whatever page is loaded, unchanged — it is not this story's job
  to make those two stats period-exact across pages, only to serve
  `/admin/payouts` correctly; the "Platform revenue" stat's own fix is
  covered by the next note.
- "Platform revenue" (ADMIN-005.4, "sum of the commission column"
  across a period's `payouts` rows): `AdminFinance.tsx` currently hardcodes
  `formatPrice(0)`. **Frontend change required**: once a period is
  selected (or for the latest reconciled period by default), the stat
  sums `commission` across that period's rows from this endpoint's
  response — client-side arithmetic over an already-small, already-paged
  set, needing no new endpoint.

---

## 3.9.17 `POST /v1/admin/payouts/{id}/mark-paid` — Mark a payout paid
(ADMIN-005)

**Auth** — `admin`, full or sub-admin with `permissions = 'finance-only'`.

**Request** — no body.

```
POST /v1/admin/payouts/{id}/mark-paid
```

**Behaviour**

```sql
UPDATE payouts SET status = 'Paid', paid_on = CURRENT_DATE, updated_at = now()
WHERE id = $1 AND status = 'Pending'
RETURNING id, supplier_id, period, gross, commission, net, status, paid_on
```

plus one `audit` row (`action = 'marked payout paid'`, `target =` the
payout's `period`). Zero rows updated means either no `payouts` row with
that `id` exists, or it exists but is not `Pending` (already `Paid`) —
both collapse to `404`, the same ownership/not-found collapse this
project already uses elsewhere (e.g. §3.8.12's reply endpoint): a repeat
"Mark paid" click on an already-paid row is not a distinct state worth
its own error code, since the SRS names no "un-mark" action and no test
case exercises a second mark-paid call.

**Response** — `200` — the updated row, same shape as one item of
§3.9.16's `data` (minus `supplier_name`, re-fetched by the row's existing
id on the frontend, since this endpoint has no join and the caller
already has the row from the list it clicked "Mark paid" on).

```json
{
  "id": "...", "supplier_id": "...", "period": "2026-10",
  "gross": 9515000, "commission": 951500, "net": 8563500,
  "status": "Paid", "paid_on": "2026-11-02"
}
```

**Errors**

| Status | `error.code` | When |
|---|---|---|
| 401 | `UNAUTHENTICATED` | No valid session token |
| 403 | `PERMISSION_DENIED` | Signed in, but not `admin`, or a sub-admin whose `permissions` is not `finance-only` |
| 404 | `NOT_FOUND` | No `payouts` row with that `id`, or it is not currently `Pending` |
| 500 | `INTERNAL` | The update or audit insert fails for a reason other than a refused connection |
| 503 | `UNAVAILABLE` | The database refuses the connection |

**Notes**

- `AdminFinance.tsx`'s "Mark paid" button (`<button type="button">`)
  currently does nothing. **Frontend change required**: it calls this
  endpoint for the clicked row's `id`, then patches that one row's
  `status`/`paid_on` in the table in place (test case, "Clicking 'Mark
  paid'... updates its status in the table... without a full page
  reload... other rows' statuses are unchanged").

---

## 8.10 Migration plan — Admin commission and payout reconciliation (ADMIN-005)

No table, column, index or constraint change. Every value the five
endpoints above read or write already exists, ahead of this story:

- `settings` table and its seeded `"Global commission percent"` row
  (erd.md §3.19, `0008_seed_settings`) — read and written by §3.9.13 and
  read by §3.9.15.
- `suppliers.commission` and its `ck_suppliers_commission_range` check
  (erd.md §3.4) — read and written by §3.9.14, read by §3.9.15.
- `payouts` (erd.md §3.14) — `supplier_id`, `period`, `gross`,
  `commission`, `net`, `status`, `paid_on`, its `ck_payouts_status`
  check, and `uq_payouts_supplier_period` (the exact constraint §3.9.15's
  conflict check and insert rely on) — all written by `0007_finance_admin`.
  `idx_payouts_supplier_id` serves §3.9.16's join.
- `bookings.total`, `bookings.status`, `departures.date`,
  `products.supplier_id` and `idx_products_supplier_id` — read by
  §3.9.15's qualifying-bookings query, the same join §3.8.10 already
  walks.
- `audit` (erd.md §3.17) and `idx_audit_created_at` — written by all four
  state-changing endpoints above (§3.9.13, §3.9.14, §3.9.15, §3.9.17).

Five endpoints added: §3.9.13, §3.9.14, §3.9.15, §3.9.16, §3.9.17 above.

**Forward:** none to run — no DDL. **Backward:** none to run. **Safety
on a populated table:** not applicable, no DDL in this story.
