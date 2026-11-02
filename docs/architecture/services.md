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
`SupplierAccount.tsx`'s `{r.status}` already
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

## 8.10 Migration plan — Booking and approval notifications (NOTIF-001)

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
