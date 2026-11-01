
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

**Behaviour** — a single conditional update, which also checks
`status = 'published'` in the same `WHERE` so a supplier can never reply
to a review on their own product that is currently `hidden` or
`reported` and thereby publish an endorsement of it before a moderation
decision is made:

```sql
UPDATE reviews SET reply = $2, updated_at = now()
WHERE id = $1 AND status = 'published'
  AND product_id IN (SELECT id FROM products WHERE supplier_id = (SELECT id FROM suppliers WHERE user_id = $3))
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

**Response** — `200` — the updated row, same shape as the sibling
`data` module's existing `GET /v1/reviews/{id}` read (erd.md §3.10:
`id`, `product_id`, `author`, `rating`, `reviewed_on`, `text`, `reply`,
`status`, `created_at`, `updated_at`).

```json
{
  "id": "...", "product_id": "...", "author": "...", "rating": 5,
  "reviewed_on": "...", "text": "...", "reply": "Thanks for staying with us!",
  "status": "published", "created_at": "...", "updated_at": "..."
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
  story has no mock").
- `SupplierReviews.tsx`'s reply form today calls nothing — its
  submit becomes this `fetch` call.
- Why `status = 'published'` is enforced here, not just at read time: the
  write itself must never create a reply on a review a moderator has
  since hidden or flagged.

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

**Forward:** none to run. **Backward:** none to run. **Safety on a
populated table:** not applicable — no DDL in this story.

---

## 3.9.20 `GET /v1/admin/settings` — List platform settings (ADMIN-007)

**Auth** — `admin` (full or sub-admin, any `permissions` value —
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
    { "id": "...", "name": "Default cancellation window", "value": "48 hours", "note": "...", "updated_at": "..." }
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

**Auth** — `admin`, `permissions = 'full'` only — no sub-admin scope
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

**Response** — `200` — the updated row, same shape as
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

**Auth** — `admin`, `permissions = 'full'` only — no sub-admin scope may
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
    { "id": "...", "at": "...", "who": "...", "action": "...", "target": "..." }
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
  §3.9.20's `settings` read; §3.9.21/§3.9.22 above are each a
  **narrower, dedicated contract** replacing that generic reader for
  settings' single-column write and for the full-only write restriction
  DATA-002 never modelled) and for `audit`'s dedicated newest-first read;
  §3.9.20's `notifications` panel keeps reading the generic `data`
  reader where no restriction applies.
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

## 3.12 The site as designed (SITE-001 … SITE-006)

**No new endpoint.** This story is the public storefront page shell (Home,
Trip detail, Departures board, Guides list/Guide, Header/Footer/
ContactDock, per-page SEO) and its own story plan states its UI scope
reads the mock JSON in `code/frontend/src/data/` directly, with no mock
module and no mock-swap step
(`docs/site/stories/the-site-as-designed.md`, "UI scope": "No backend
stage applies to this story... TL confirms in review that no mock swap is
required here"). Reviewed PR #23 confirms this — the only diff is a
content/header wiring fix (`nav.cta.href`); no `lib/mock/` file for this
story exists to replace.

Every record this story's screens read — `products` (status, name,
photo, itinerary, inclusions/exclusions, policy), `departures` (state,
date, season, seats, price), `destinations` (name, line, from_price),
`categories`, `guides` (slug, category, published_on, excerpt, body),
`reviews` (status, rating, author, text, reply) — is already in
`erd.md` §3.5–§3.10, each already traced to SITE-00x in that table's own
"Traces to" line. No column, table or index this story's six
requirements touch is missing.

When this story's data moves off the bundled JSON files, it does so
through the `data` module's generic reader (`GET /v1/<collection>`,
`GET /v1/<collection>/<id>` — DATA-002/DATA-003, plan item "Site data
from the database"), not through a bespoke endpoint built here — matching
the pattern the `data` module's own SRS already states: "every other
module's screens are built against `useCollection`/`useRecord` already;
this module is what makes those hooks real instead of reading a bundled
file, without changing a single component" (`docs/data/SRS.md` §1). This
story's pages need no change when that lands.

## 8.9 Migration plan — The site as designed (SITE-001 … SITE-006)

No schema change, no endpoint added. Every entity this story's six
requirements read (`products`, `departures`, `destinations`,
`categories`, `guides`, `reviews`) is already defined in the base ERD
migration (`erd.md` §8, `0004_catalogue`), each already tracing to its
SITE-00x requirement in that table's own "Traces to" line — this story
ships against the existing mock JSON in `code/frontend/src/data/`, per
its own story plan's UI scope ("no mock-swap step").

**Forward:** none to run. **Backward:** none to run. **Safety on a
populated table:** not applicable — no DDL in this story.

---

## 3.12 The site as designed (SITE-001 … SITE-006)

**No new endpoint.** This story is the public storefront page shell (Home,
Trip detail, Departures board, Guides list/Guide, Header/Footer/
ContactDock, per-page SEO) and its own story plan states its UI scope
reads the mock JSON in `code/frontend/src/data/` directly, with no mock
module and no mock-swap step
(`docs/site/stories/the-site-as-designed.md`, "UI scope": "No backend
stage applies to this story... TL confirms in review that no mock swap is
required here"). Reviewed PR #23 confirms this — the only diff is a
content/header wiring fix (`nav.cta.href`); no `lib/mock/` file for this
story exists to replace.

Every record this story's screens read — `products` (status, name,
photo, itinerary, inclusions/exclusions, policy), `departures` (state,
date, season, seats, price), `destinations` (name, line, from_price),
`categories`, `guides` (slug, category, published_on, excerpt, body),
`reviews` (status, rating, author, text, reply) — is already in
`erd.md` §3.5–§3.10, each already traced to SITE-00x in that table's own
"Traces to" line. No column, table or index this story's six
requirements touch is missing.

When this story's data moves off the bundled JSON files, it does so
through the `data` module's generic reader (`GET /v1/<collection>`,
`GET /v1/<collection>/<id>` — DATA-002/DATA-003, plan item "Site data
from the database"), not through a bespoke endpoint built here — matching
the pattern the `data` module's own SRS already states: "every other
module's screens are built against `useCollection`/`useRecord` already;
this module is what makes those hooks real instead of reading a bundled
file, without changing a single component" (`docs/data/SRS.md` §1). This
story's pages need no change when that lands.

## 8.9 Migration plan — The site as designed (SITE-001 … SITE-006)

No schema change, no endpoint added. Every entity this story's six
requirements read (`products`, `departures`, `destinations`,
`categories`, `guides`, `reviews`) is already defined in the base ERD
migration (`erd.md` §8, `0004_catalogue`), each already tracing to its
SITE-00x requirement in that table's own "Traces to" line — this story
ships against the existing mock JSON in `code/frontend/src/data/`, per
its own story plan's UI scope ("no mock-swap step").

**Forward:** none to run. **Backward:** none to run. **Safety on a
populated table:** not applicable — no DDL in this story.
