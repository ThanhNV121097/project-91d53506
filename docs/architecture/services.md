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
