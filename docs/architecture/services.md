
---

## 3.8.6 `POST /v1/supplier/products/{id}/departures` — Add a departure (SUPPLIERS-004)

**Auth** — `supplier`. Writes only a departure under a `products` row
owned by the caller (`products.supplier_id = (SELECT id FROM suppliers
WHERE user_id = caller.id)`) — never another supplier's product
(SUPPLIERS-004 failure table "Not permitted").

**Request**

```json
{ "date": "2026-12-24", "capacity": 20, "season": "Peak summer", "price": 2500000 }
```

`date` and `capacity` are required. `season` and `price` are optional —
omitted or `null` means standard pricing on that date (the Buyer-facing
price is then `products.price`, per erd.md §3.6's nullable convention).
No other field is accepted — in particular never `seats` (always starts
equal to `capacity`) or `state` (always starts `'Open'`); both are
derived/defaulted, never client-set on create.

**Behaviour**

1. `capacity` must be a positive integer (`ck_departures_capacity_positive`
   mirrors this at the database); a non-positive value is `422` before the
   insert is attempted (SUPPLIERS-004 AC "capacity is zero or negative").
2. A single ownership-scoped insert:

```sql
INSERT INTO departures (product_id, date, capacity, seats, price, season, state)
SELECT $1, $2, $3, $3, $4, $5, 'Open'
FROM products WHERE id = $1 AND supplier_id = $caller_supplier_id
RETURNING *
```

   Zero rows inserted because the `FROM products WHERE ...` matched
   nothing (product does not exist, or exists but is not owned by the
   caller) collapses to one `404` — the same ownership-vs-not-found
   pattern as SUPPLIERS-006B (§3.8.12 below).
3. A unique violation on `uq_departures_product_date` (a departure already
   exists for this product on this date) is `409 CONFLICT`, not a second
   row and not a silent merge.

**Response** — `201`, header `Location: /v1/supplier/departures/{id}`,
body = the created row:

```json
{
  "id": "...", "product_id": "...", "date": "2026-12-24",
  "capacity": 20, "seats": 20, "price": 2500000, "season": "Peak summer",
  "state": "Open", "created_at": "...", "updated_at": "..."
}
```

**Errors**

| Status | `error.code` | When |
|---|---|---|
| 400 | `MALFORMED_REQUEST` | A field the request body does not define is present (e.g. `seats`, `state`) |
| 401 | `UNAUTHENTICATED` | No valid session token |
| 403 | `PERMISSION_DENIED` | Signed in, but not role `supplier` |
| 404 | `NOT_FOUND` | No `products` row with that `id`, or it is not owned by the caller |
| 409 | `CONFLICT` | A `departures` row already exists for this product on this `date` (`uq_departures_product_date`) |
| 422 | `VALIDATION_FAILED` | `date` or `capacity` missing, or `capacity` ≤ 0 |
| 500 | `INTERNAL` | The insert fails for a reason other than a refused connection |
| 503 | `UNAVAILABLE` | The database refuses the connection |

---

## 3.8.7 `PATCH /v1/supplier/departures/{id}` — Edit a departure's capacity, price, season or state (SUPPLIERS-004)

**Auth** — `supplier`. Writes only a departure whose product belongs to
the caller (same ownership rule as §3.8.6).

**Request** — any subset of:

```json
{ "capacity": 8, "price": 2200000, "season": "Weekend", "state": "Blocked" }
```

No other field is accepted — in particular `seats` is always rejected
outright, present or not, because it is booking-module-derived
(SUPPLIERS-004.4; BOOKING-001 is the only writer of `seats`). `state`, if
present, must be `Open` or `Blocked` — any other value is `400`, not a
silently-ignored write.

**Behaviour**

1. Lock and read the row, scoped by ownership:

```sql
SELECT d.* FROM departures d
JOIN products p ON p.id = d.product_id
WHERE d.id = $1 AND p.supplier_id = $caller_supplier_id
FOR UPDATE
```

   Zero rows (departure does not exist, or its product is not owned by
   the caller) → `404`, collapsing both cases the same way §3.8.6 does.
2. Reject the whole request with `400 MALFORMED_REQUEST` before any write
   if: a field outside `capacity`/`price`/`season`/`state` is present
   (including `seats`), or `state` is present and not one of
   `Open`/`Blocked`.
3. If `capacity` is present: let `committed = current.capacity -
   current.seats` (seats already held/booked against this row, per
   erd.md §3.6 `ck_departures_seats_bounds`). If the new `capacity` <
   `committed`, reject with `422 VALIDATION_FAILED` naming `committed` as
   the minimum — capacity is never silently capped (SUPPLIERS-004
   failure table "Boundary"). Otherwise the new `seats` is recomputed as
   `new_capacity - committed`, in the same update, so `seats` keeps
   reflecting "remaining" under the new ceiling without a second query.
4. Any of `price`/`season`/`state` given replaces that column's value
   as-is (including explicit `null` for `price`/`season`, meaning "back
   to standard pricing" — matches the create endpoint's own nullable
   convention, not a different rule for update).
5. Single update, only the given fields touched:

```sql
UPDATE departures SET
  capacity = COALESCE($capacity, capacity),
  seats    = CASE WHEN $capacity IS NOT NULL
                   THEN $capacity - ($old_capacity - $old_seats)
                   ELSE seats END,
  price    = CASE WHEN $price_given  THEN $price  ELSE price  END,
  season   = CASE WHEN $season_given THEN $season ELSE season END,
  state    = COALESCE($state, state),
  updated_at = now()
WHERE id = $1
RETURNING *
```

**Response** — `200`, body = the updated row, same shape as §3.8.6's
create response.

**Errors**

| Status | `error.code` | When |
|---|---|---|
| 400 | `MALFORMED_REQUEST` | A field the request body does not define is present (e.g. `seats`), or `state` is present and not `Open`/`Blocked` |
| 401 | `UNAUTHENTICATED` | No valid session token |
| 403 | `PERMISSION_DENIED` | Signed in, but not role `supplier` |
| 404 | `NOT_FOUND` | No `departures` row with that `id`, or its product is not owned by the caller |
| 422 | `VALIDATION_FAILED` | `capacity` is present and below the number of seats already committed (`capacity - seats` on the current row) |
| 500 | `INTERNAL` | The update query fails for a reason other than a refused connection |
| 503 | `UNAVAILABLE` | The database refuses the connection |

**Notes (both endpoints)**

- No story plan or mock module exists for this item — same situation as
  SUPPLIERS-006B. The approved design's `DepartureEditor.tsx`
  (`/supplier/products/:id`) renders the departures table read-only
  today (no add-row form, no per-row edit control, no block/unblock
  toggle); it is built against the generic `useCollection<Departure>`
  reader (DATA-002), never against a mock written for this story. The
  shapes above are designed straight from `docs/suppliers/SRS.md` §4.3
  and the already-written `docs/suppliers/test-cases/supplier-calendar-
  and-seasonal-pricing.md`, which already names these two exact routes
  and request/response shapes — carried forward because that file,
  unlike a frontend mock, was written against this contract's own
  conventions from the start, not guessed at.
- **Frontend change required** when this backend lands: `SupplierProduct.tsx`
  /`DepartureEditor.tsx` need an "Add departure" form (date, capacity,
  optional season/price) calling §3.8.6, and a per-row action (edit
  season/price, block/unblock) calling §3.8.7 — none of that UI exists
  in the current merged frontend, so this is new frontend work in the
  BE story, not a mock-to-API swap of existing controls.
- Why `committed` is computed as `capacity - seats` rather than stored
  separately: no other requirement needs a standalone "seats booked"
  column, and deriving it from the two columns BOOKING-001 already
  maintains avoids a second source of truth that could drift from them.
- Deliberate difference from a plain "patch whatever is given": `seats`
  is rejected rather than silently ignored when present, because an
  accepted-but-ignored write on a money-and-capacity field is exactly the
  kind of bug a caller cannot detect from a `200` response — matching the
  project-wide `MALFORMED_REQUEST` convention for an undefined field
  rather than treating a *defined-but-forbidden* field more leniently.

## 8.9 Migration plan — Supplier calendar and seasonal pricing (SUPPLIERS-004)

No schema change. `departures` (erd.md §3.6) already carries every column
these endpoints read or write — `product_id`, `date`, `capacity`, `seats`,
`price`, `season`, `state` — with `ck_departures_capacity_positive`,
`ck_departures_seats_bounds`, `ck_departures_state` and
`uq_departures_product_date` already enforcing the invariants both
endpoints rely on (positive capacity, `0 ≤ seats ≤ capacity`, state in
`Open`/`Blocked`, one row per product per date) and `idx_departures_
product_id_date` already serving §3.8.6/§3.8.7's lookups. `products.
supplier_id` and `idx_products_supplier_id` (erd.md §3.5), used by the
ownership subquery/join above, are likewise already there. All of this
landed in the base ERD migration (`0004_catalogue`), ahead of this story.

Two endpoints added: §3.8.6, §3.8.7 above.

**Forward:** none to run — no DDL. **Backward:** none to run.
**Safety on a populated table:** not applicable, no DDL in this story.

---

## 3.8.12 `POST /v1/supplier/reviews/{id}/reply` — Reply to a guest review (SUPPLIERS-006B)

**Auth** — `supplier`. Writes only a review whose `product_id` belongs to
a `products` row owned by the caller (`products.supplier_id = (SELECT id
FROM suppliers WHERE user_id = caller.id)`) — never another supplier's
review (SUPPLIERS-006B AC-2).

**Request**

```json
{ "reply": "Thanks for staying with us!" }
```

No other field is accepted — in particular never `status`, which stays
`admin`-only (ADMIN-002, erd.md §3.10).

**Behaviour** — a single conditional update, scoped by ownership and
`status = 'published'` in the same `WHERE` so a supplier can never reply
to a review on their own product that is currently `hidden` or
`reported` and thereby publish an endorsement of it before a moderation
decision is made:

```sql
UPDATE reviews SET reply = $2, updated_at = now()
WHERE id = $1 AND status = 'published'
  AND product_id IN (SELECT id FROM products WHERE supplier_id = $caller_supplier_id)
RETURNING *
```

`reply` is trimmed and must be non-empty (AC below); it replaces any
existing value rather than appending to it (SUPPLIERS-006B AC-3 — there
is no "append" or "history" concept, one column, one current value).
Zero rows updated means either the review does not exist, belongs to
another supplier's product, or is not `published` — all three collapse
to the same `404` so a reply attempt never discloses which case it was
(matching the project's existing ownership-vs-not-found pattern, e.g.
BOOKING-004's sibling complaints endpoint, §3.5 notes).

**Response** — `200` — the updated `reviews` row, same shape as the
`data` module's existing `GET /v1/reviews/{id}` read (erd.md §3.10:
`id`, `product_id`, `author`, `rating`, `reviewed_on`, `text`, `reply`,
`status`, `created_at`, `updated_at`).

```json
{
  "id": "...", "product_id": "...", "author": "...", "rating": 5,
  "reviewed_on": "2026-10-02", "text": "...",
  "reply": "Thanks for staying with us!", "status": "published",
  "created_at": "...", "updated_at": "..."
}
```

**Errors**

| Status | `error.code` | When |
|---|---|---|
| 400 | `MALFORMED_REQUEST` | A field the request body does not define is present (e.g. `status`) |
| 401 | `UNAUTHENTICATED` | No valid session token |
| 403 | `PERMISSION_DENIED` | Signed in, but not role `supplier` |
| 404 | `NOT_FOUND` | No `reviews` row with that `id`, or its product is not owned by the caller, or its `status` is not `published` (a reply never targets a `hidden`/`reported` review) |
| 422 | `VALIDATION_FAILED` | `reply` is absent, or trims to empty |
| 500 | `INTERNAL` | The update query fails for a reason other than a refused connection |
| 503 | `UNAVAILABLE` | The database refuses the connection |

**Notes**

- No story plan or mock module exists for this item (per the task: "this
  story has no UI pull request"); the shape above is designed straight
  from `SupplierReviews.tsx` (already merged, reading the shared
  `reviews` collection) and the SRS's own §4.6 behaviour/AC list, not
  carried from any mock.
- `SupplierReviews.tsx`'s reply form today calls nothing — its
  `onSubmit={(e) => e.preventDefault()}` is a placeholder. Backend work
  on this story replaces that handler with a `fetch` to this endpoint,
  then refreshes the row (`useCollection`'s existing `reviews` read
  already re-renders the "Replied" badge and the "Awaiting your reply"
  count once the row's `reply` field is non-empty — no new client state
  needed beyond re-fetching the current page).
- Why `status = 'published'` is enforced here, not just at read time: the
  SRS's out-of-scope line says this module "never changes a review's
  visibility", but says nothing about it replying to a non-published
  one. A review in `reported`/`hidden` state is mid-moderation or already
  judged policy-violating — letting a supplier attach a public-facing
  reply to it before (or instead of) the admin's decision would make the
  reply outlive a review an admin is about to hide, or endorse one
  already hidden for cause. Rejecting with the same `404` a not-owned
  review gets keeps the error surface the same shape for both cases, and
  costs nothing extra in the `WHERE` clause already scoping by id and
  ownership.

## 8.7 Migration plan — Supplier review replies (SUPPLIERS-006B)

No schema change. `reviews.reply` (nullable `text`, no default — null
means no reply yet, a value replaces on resubmission, erd.md §3.10),
`reviews.status` and its `ck_reviews_status` constraint, and
`idx_reviews_product_id_status` (serves this endpoint's own
ownership+status check, the same index SITE-002's published-list read
already uses) all exist from the base ERD migration, ahead of this
story. `products.supplier_id` and `idx_products_supplier_id` (erd.md
§3.5), used by the subquery above, are likewise already there.

One endpoint added: §3.8.12 above (`POST /v1/supplier/reviews/{id}/reply`).

**Forward:** none to run — no DDL. **Backward:** none to run.
**Safety on a populated table:** not applicable, no DDL in this story.

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
