## 3.8.10 `GET /v1/supplier/revenue` — Revenue, commission and expected
payout (SUPPLIERS-007)

**Auth** — `supplier`. Figures are always the caller's own — resolved via
`suppliers.user_id = caller.id` — never another supplier's (SRS §6 "never
exposed to another supplier's session"). A `buyer` or `admin` session is
`403`: an admin's own view of supplier finances is a separate `admin`
module endpoint, not this one (test cases, "admin session cannot read
through the supplier-scoped endpoint").

**Request**

```
GET /v1/supplier/revenue
```

No query parameters — any present is rejected (test cases, `?foo=bar` →
`400`).

**Behaviour**

1. `revenue` = `SUM(bookings.total)`, joined `bookings → departures →
   products` where `products.supplier_id` is the caller's own supplier
   row, filtered to `bookings.status IN ('Paid','Confirmed','Completed')`
   (SUPPLIERS-007 behaviour 1) — `0` if none.
2. The applicable rate is the caller's own `suppliers.commission`
   override when non-null, else the `settings` row named `"Global
   commission percent"`'s `value`, else `0` (SUPPLIERS-007 behaviour 2,
   `decision.commission_rate`). That stored value is a percentage
   (`numeric(5,2)`, e.g. `10.0`); the response's `commission_rate` divides
   it by `100` (a `0`–`1` fraction — matches the merged test suite's
   `commission_rate: 0.10` for a stored `10.0`).
3. `commission` = `round(revenue * commission_rate)`.
4. `expected_payout` = `max(0, revenue - commission - settled)`, where
   `settled` is `SUM(payouts.net)` over the caller's own `payouts` rows —
   whatever a closed period already paid out is never counted again as
   still owed (SUPPLIERS-007 behaviour 3, and the merged test case
   "Expected payout excludes revenue already settled in a closed payout
   period"). This is the exact arithmetic the UI's own mock
   (`useSupplierRevenue`, PR #98) already computes against the `revenue`/
   `commission` values it derives the same way — carried forward
   unchanged, not redesigned, because both the shipped UI and the merged
   test cases already agree on it.

**Response** — `200`

```json
{
  "revenue": 10000000,
  "commission_rate": 0.10,
  "commission": 1000000,
  "expected_payout": 9000000
}
```

**Errors**

| Status | `error.code` | When |
|---|---|---|
| 400 | `MALFORMED_REQUEST` | Any query parameter is present (this endpoint takes none) |
| 401 | `UNAUTHENTICATED` | No valid session token |
| 403 | `PERMISSION_DENIED` | Signed in, but not role `supplier` |
| 500 | `INTERNAL` | The query fails for a reason other than a refused connection |
| 503 | `UNAVAILABLE` | The database refuses the connection |

**Notes — why no new index**

The revenue sum walks `products` (`idx_products_supplier_id`) →
`departures` (`idx_departures_product_id_date`, `product_id` prefix) →
`bookings` (`idx_bookings_departure_id`); the settled sum uses
`idx_payouts_supplier_id`. All four already exist (erd.md §3.5, §3.6,
§3.11, §3.14) and erd.md §5 row 15 already names `idx_payouts_supplier_id`
as serving "a supplier's payout history" — this endpoint and §3.8.11
below are that access pattern.

**Conflict with the mock, stated and resolved:** the UI's mock
(`lib/mock/supplier-revenue-and-payout-reporting.ts`, PR #98) returns
`rate` on a `0`–`100` scale and a field named `expectedPayout`
(camelCase). This contract returns `commission_rate` on a `0`–`1`
fraction and `expected_payout` (snake_case), matching this project's
other finance-reading endpoints (no endpoint elsewhere in this file
returns a raw percentage) and the already-merged test suite's own
assertions (`commission_rate: 0.10`, not `rate: 10`). The mock's
shape does not win here — nobody reviewed it (per this skill's own
rule) and the test cases, written after it, already chose the fraction.

**Frontend change required** when this backend lands: `SupplierHome.tsx`
and `SupplierAccount.tsx` stop importing `useSupplierRevenue` from the
mock module and instead call this story's own
`lib/supplier-revenue-and-payout-reporting.ts` against this endpoint and
§3.8.11. That client multiplies `commission_rate` by `100` before handing
it to the two pages' existing `rev.rate === 0` / `rev.rate > 0` checks (so
neither page's JSX needs to change), and renames `expected_payout` to the
`expectedPayout` key both pages already read. `revenue` and `commission`
need no rename.

---

## 3.8.11 `GET /v1/supplier/payouts` — Payout history (SUPPLIERS-007)

**Auth** — `supplier`, scoped to the caller's own `payouts` rows
(`payouts.supplier_id` = the caller's own `suppliers.id`) — never another
supplier's (SUPPLIERS-007 "Not permitted" row; test cases, "A supplier's
figures never include another supplier's bookings or payouts").

**Request**

```
GET /v1/supplier/payouts?limit=&cursor=
```

| Param | Type | Notes |
|---|---|---|
| `limit` | integer, 1–100 | Default 20; over the max is rejected, never clamped (test cases, `?limit=101` → `422`) |
| `cursor` | string | Opaque, from a previous response's `next_cursor` — same scheme as §3.8.8/§3.9.22 |

No `period` filter on this endpoint — `/supplier/account`'s table reads
the caller's own full history and sorts/paginates it through the shared
`DataTable` component; a per-period filter is `admin`'s own
`GET /v1/admin/payouts?period=` (§3.9.16), a different, admin-scoped
endpoint over every supplier's rows, not this one.

**Behaviour**

```sql
SELECT id, period, gross, commission, net, status, paid_on
FROM payouts
WHERE supplier_id = $caller_supplier_id
ORDER BY period DESC, created_at DESC
```

cursor-paginated, using the existing `idx_payouts_supplier_id` — a
supplier's own payout history is at most a few dozen rows (one per closed
period, erd.md §3.14's `uq_payouts_supplier_period`), so no composite
index is added for the `ORDER BY`.

**Response** — `200`

```json
{
  "data": [
    { "id": "...", "period": "2026-10-01", "gross": 9515000, "commission": 0, "net": 9515000, "status": "Pending", "paid_on": null }
  ],
  "has_more": false,
  "next_cursor": null
}
```

No `404` for an empty history — `200` with `data: []`, `has_more: false`
(matches `/supplier/account`'s own empty state, SRS §5, "No payout period
has closed yet.").

**Errors**

| Status | `error.code` | When |
|---|---|---|
| 400 | `MALFORMED_REQUEST` | A query parameter outside `limit`/`cursor` is present |
| 401 | `UNAUTHENTICATED` | No valid session token |
| 403 | `PERMISSION_DENIED` | Signed in, but not role `supplier` |
| 422 | `VALIDATION_FAILED` | `limit` is present and >100 (never clamped) or ≤0 |
| 500 | `INTERNAL` | The query fails for a reason other than a refused connection |
| 503 | `UNAVAILABLE` | The database refuses the connection |

**Conflict with the mock, stated and resolved:** the seed mock data
(`code/frontend/src/data/payouts.json`, PR #98) carries
`"status": "Awaiting commission rate"` on every row — a display string
the mock author invented for "this period's `commission` happens to read
`0`". `payouts.status` is a `CHECK`-constrained closed set,
`'Pending' | 'Paid'` (erd.md §3.14, written ahead of this story by
`0007_finance_admin`), and this endpoint is read-only — it has no reason
and no mechanism to write a third value into that column. A row with
commission `0` still reads `status: "Pending"` under this contract;
`SupplierAccount.tsx`'s `<Badge tone="warn">{r.status}</Badge>` already
renders whatever string the field holds with no special-casing, so
nothing in that component needs to change for this — only the mock's
invented seed value goes away with the mock file itself.

**Frontend change required** when this backend lands:
`SupplierAccount.tsx`'s payout-history table stops calling
`useCollection("payouts", ...)` (the generic `data`-module reader, which
has no ownership scoping) and instead reads this endpoint through
`lib/supplier-revenue-and-payout-reporting.ts` (the same client file as
§3.8.10 above) via cursor pagination in place of the generic reader's
page/sort params; the column render functions themselves are unchanged.

---

## 8.9 Migration plan — Supplier revenue and payout reporting
(SUPPLIERS-007)

No table, column, index or constraint change. Every value the two
endpoints above read already exists from earlier migrations, ahead of
this story:

- `suppliers.commission` and its `ck_suppliers_commission_range` check —
  `0003_suppliers`.
- `products.supplier_id`, `idx_products_supplier_id`; `departures.
  product_id`, `idx_departures_product_id_date` — `0004_catalogue`.
- `bookings.total`, `bookings.status`, `departures.id` via
  `bookings.departure_id`, `idx_bookings_departure_id` —
  `0006_booking_flow`.
- `payouts.supplier_id`, `.period`, `.gross`, `.commission`, `.net`,
  `.status`, `.paid_on`, `idx_payouts_supplier_id`,
  `uq_payouts_supplier_period`, `ck_payouts_status` — `0007_finance_admin`.
- `settings` table and the `"Global commission percent"` seed row —
  `0007_finance_admin` / `0008_seed_settings`.

Two endpoints added: §3.8.10 (`GET /v1/supplier/revenue`), §3.8.11
(`GET /v1/supplier/payouts`) above.

**Forward:** none to run — no DDL. **Backward:** none to run. **Safety on
a populated table:** not applicable, no DDL in this story.

---

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

---

## 3.7 Internal fan-out contract — `notify.Raise(event, payload)` (NOTIF-001)

**Not an HTTP endpoint.** This is the internal Go function other modules'
handlers call, in-process, right after the state change they are
reporting commits — never before, so a notification is never raised for
a transition that then rolls back. Callers today:

- `POST /v1/payments/vnpay/ipn` (§3.6.3), on a booking reaching `Confirmed`
- the hold-expiry sweep, on a booking reaching `Cancelled`
- `POST /v1/admin/suppliers/{id}/approve` / `POST
  /v1/admin/suppliers/{id}/reject` (§3.9.2/§3.9.3)
- `POST /v1/admin/products/{id}/approve` / `POST
  /v1/admin/products/{id}/reject` (§3.9.4/§3.9.5)

**Signature** — `notify.Raise(ctx, event string, template string)`, where
`event` already encodes the specific instance of the transition (e.g.
`"booking.confirmed:NA-5QJ81M"`, `"product.rejected:<product-id>"`) —
the same string every caller above builds from its own row's `code`/`id`,
so two different transitions on the same booking/product never collide
on the uniqueness guard below, and two deliveries of the *same*
transition always do.

**Behaviour** — for each of the three channels `Email`, `Zalo`,
`Dashboard`, in any order, independently:

1. Attempt the insert:
   ```sql
   INSERT INTO notifications (event, channel, template, status)
   VALUES ($event, $channel, $template, 'pending')
   ON CONFLICT ON CONSTRAINT uq_notifications_event_channel DO NOTHING
   RETURNING id
   ```
   A conflict (no row returned) means this exact event/channel pair was
   already notified by an earlier call — `Raise` returns for that channel
   without sending anything a second time (NOTIF-001 AC-3). This is the
   row-level de-dup; no application-side "have I seen this event" cache
   is needed or added.
2. If a row was inserted, attempt the channel's own delivery
   (`EMAIL_SMTP_*` for `Email`, `ZALO_OA_API_KEY` for `Zalo`; `Dashboard`
   always succeeds — it *is* the row just inserted, read back by
   `/admin/system`) and `UPDATE notifications SET status = $result WHERE
   id = $id`, `$result` being `'sent'` or `'failed'`.
3. One channel's provider call failing (step 2) is caught and recorded as
   that channel's own `'failed'` status; it neither raises an error to
   the caller nor skips or retries the other two channels (NOTIF-001
   AC-2, reliability row). `Raise` itself never returns an error for a
   delivery failure — only for a database failure on the insert/update
   above, which the caller (already inside its own request handler)
   surfaces as that endpoint's own `500`/`503`, not a separate one here.

**Why `ON CONFLICT ... DO NOTHING` and not a `SELECT` then `INSERT`** — a
read-then-write has a race between two near-simultaneous calls for the
same event (e.g. a genuinely retried webhook arriving while the first
delivery is still in flight); the constraint is the single source of
truth for "already notified", enforced by Postgres itself rather than by
a lock this code would otherwise have to take.

---

## 3.7.1 `GET /v1/admin/notifications` — Read the notification log (NOTIF-001)

**Auth** — `admin` with `full` or `content-only` permissions (the
`/admin/system` screen this list backs is reachable by any sub-admin
permission per ADMIN-007's own "read-only" rule for that screen's other
tables — but this file's test cases scope this specific endpoint to
`full`/`content-only` only, so a `moderation-only` or `finance-only`
sub-admin reading `/admin/system` sees every other panel on that page
load except this one's rows, same partial-visibility pattern the page
already uses per-section).

**Request**

```
GET /v1/admin/notifications?limit=&cursor=
```

| Param | Type | Notes |
|---|---|---|
| `limit` | integer, 1–100 | Default 20; over the max is rejected, never clamped |
| `cursor` | string | Opaque, from a previous response's `next_cursor` |

No other query parameter, and no request body — either is `400
MALFORMED_REQUEST`.

**Behaviour**

```sql
SELECT id, event, channel, template, status, created_at
FROM notifications
ORDER BY created_at DESC, id DESC
```

cursor-paginated using `idx_notifications_created_at` (erd.md §3.18) —
the same cursor scheme as §3.8.8/§3.8.11/§3.9.22.

**Response** — `200`

```json
{
  "data": [
    {
      "id": "...",
      "event": "booking.confirmed:NA-5QJ81M",
      "channel": "Email",
      "template": "booking-confirmed",
      "status": "sent",
      "created_at": "..."
    }
  ],
  "has_more": false,
  "next_cursor": null
}
```

No `404` for an empty log — `200` with `data: []`, `has_more: false`.

**Errors**

| Status | `error.code` | When |
|---|---|---|
| 400 | `MALFORMED_REQUEST` | A query parameter outside `limit`/`cursor` is present, or a request body is sent |
| 401 | `UNAUTHENTICATED` | No valid session token |
| 403 | `PERMISSION_DENIED` | Signed in, but not role `admin`, or an `admin` whose `permissions` is set to something other than `content-only` (e.g. `finance-only`, `moderation-only`) |
| 422 | `VALIDATION_FAILED` | `limit` is present and >100 (never clamped) or ≤0 |
| 500 | `INTERNAL` | The query fails for a reason other than a refused connection |
| 503 | `UNAVAILABLE` | The database refuses the connection |

**Conflict with the mock, stated and resolved:** none. The mock
(`lib/mock/booking-and-approval-notifications.ts`, PR #94) already uses
`id`, `event`, `channel` (`"Email" | "Zalo" | "Dashboard"`), `template`,
`status` (`"pending" | "sent" | "failed"`) — the exact column set and
value vocabulary of `notifications` (erd.md §3.18), because it was
written straight from that table. This contract's response adds only
`created_at` (needed for the sort/pagination the mock's static array
never had to do) and the list envelope (`data`/`has_more`/`next_cursor`)
every other list endpoint in this file already uses. No frontend field
is renamed or dropped.

**Frontend change required** when this backend lands: `AdminSystem.tsx`
stops reading the generic `data`-module `notifications` collection
(`useCollection("notifications", ...)`) for its notifications table and
instead reads this endpoint through a new
`lib/booking-and-approval-notifications.ts` client, cursor-paginated in
place of the generic reader's page params. The existing nit from PR #94's
review — the table's `Badge tone={r.status === "On" ? "good" : "neutral"}`
— is fixed in the same change to map `status`: `sent` → `good`, `failed`
→ `bad`, `pending` → `neutral`, since the real data now actually carries
those three values instead of the unrelated `"On"` the generic collection
happened to hold.

---

## 8.11 Migration plan — Booking and approval notifications (NOTIF-001)

No schema change. `notifications.event`, `.channel`, `.template`,
`.status`, `.created_at`, `ck_notifications_channel`,
`ck_notifications_status`, `uq_notifications_event_channel` (the de-dup
guard §3.7 relies on) and `idx_notifications_created_at` (serves this
story's own `ORDER BY created_at DESC` read) all already exist from the
base ERD, erd.md §3.18, written ahead of this story in the same
migration that created every other `admin`-module table
(`0007_finance_admin`).

One internal contract (§3.7, `notify.Raise`) and one endpoint (§3.7.1,
`GET /v1/admin/notifications`) added above. Neither needs a migration of
its own.

**Forward:** none to run — no DDL. **Backward:** none to run. **Safety on
a populated table:** not applicable, no DDL in this story.
