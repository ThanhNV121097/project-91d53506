## 3.9.18 `GET/POST/PATCH/DELETE /v1/admin/destinations` — Manage destinations (ADMIN-006)

**Auth** — `admin` (full or sub-admin).
**Permissions** — `full`, `content-only`. Any other `permissions` value,
and any non-admin role, is denied.

`destinations` is the Home page's destination-tile table (erd.md §3.7) —
small, read in full by the public Home page; these four endpoints are
this module's own CRUD surface over it, distinct from the `data`
module's public `GET /v1/destinations` reader (DATA-002), which stays
read-only and unauthenticated. `/admin/content` calls these.

### `GET /v1/admin/destinations` — list

**Request** — no query parameters; the table is small enough to read in
full (erd.md §3.7's own note), matching the design's single content
panel with no paging control.

**Response** — `200`

```json
{ "data": [
  { "id": "...", "name": "Cửa Lò", "line": "...", "image": null, "from_price": 890000, "updated_at": "..." }
] }
```

**Errors**

| Status | `error.code` | When |
|---|---|---|
| 401 | `UNAUTHENTICATED` | No valid session token |
| 403 | `PERMISSION_DENIED` | Signed in, but not `admin`, or an `admin` whose `permissions` is neither `full` nor `content-only` |
| 500 | `INTERNAL` | The query fails for a reason other than a refused connection |
| 503 | `UNAVAILABLE` | The database refuses the connection |

### `GET /v1/admin/destinations/{id}` — one record

**Response** — `200`, the same shape as one element of the list above.

**Errors** — as the list endpoint, plus:

| Status | `error.code` | When |
|---|---|---|
| 404 | `NOT_FOUND` | No `destinations` row with that `id` |

### `POST /v1/admin/destinations` — create

**Request**

```json
{ "name": "Pù Mát", "line": "...", "image": "https://cdn.../a.jpg", "from_price": 650000 }
```

`name` is required; `line`, `image`, `from_price` are optional and take
their column defaults (`''`, `NULL`, `0`) when omitted.

**Response** — `201`, the created row (same shape as the list element).

**Errors**

| Status | `error.code` | When |
|---|---|---|
| 400 | `MALFORMED_REQUEST` | A field this contract does not define is present |
| 401 | `UNAUTHENTICATED` | No valid session token |
| 403 | `PERMISSION_DENIED` | Signed in, but not `admin`, or an `admin` whose `permissions` is neither `full` nor `content-only` |
| 409 | `CONFLICT` | `name` already exists (`destinations.name` is unique, erd.md §3.7) |
| 422 | `VALIDATION_FAILED` | `name` is absent, or trims to empty |
| 500 | `INTERNAL` | The insert fails for a reason other than a refused connection |
| 503 | `UNAVAILABLE` | The database refuses the connection |

### `PATCH /v1/admin/destinations/{id}` — edit

**Request** — any subset of `name`, `line`, `image`, `from_price`. A
field omitted is left unchanged (matching §3.8.2's own rule for the same
kind of partial update).

**Response** — `200`, the updated row.

**Errors**

| Status | `error.code` | When |
|---|---|---|
| 400 | `MALFORMED_REQUEST` | A field this contract does not define is present (e.g. `owner_note`) |
| 401 | `UNAUTHENTICATED` | No valid session token |
| 403 | `PERMISSION_DENIED` | Signed in, but not `admin`, or an `admin` whose `permissions` is neither `full` nor `content-only` |
| 404 | `NOT_FOUND` | No `destinations` row with that `id` |
| 409 | `CONFLICT` | `name` is present and collides with another row's `name` |
| 422 | `VALIDATION_FAILED` | `name` is present and trims to empty (AC per SRS failure table) |
| 500 | `INTERNAL` | The update fails for a reason other than a refused connection |
| 503 | `UNAVAILABLE` | The database refuses the connection |

### `DELETE /v1/admin/destinations/{id}` — remove

**Behaviour** — hard delete (erd.md §3.7's own lifecycle note: "safe
because nothing else foreign-keys to this table").

**Response** — `204`, empty body.

**Errors**

| Status | `error.code` | When |
|---|---|---|
| 401 | `UNAUTHENTICATED` | No valid session token |
| 403 | `PERMISSION_DENIED` | Signed in, but not `admin`, or an `admin` whose `permissions` is neither `full` nor `content-only` |
| 404 | `NOT_FOUND` | No `destinations` row with that `id` |
| 500 | `INTERNAL` | The delete fails for a reason other than a refused connection |
| 503 | `UNAVAILABLE` | The database refuses the connection |

---

## 3.9.19 `GET/POST/PATCH/DELETE /v1/admin/categories` — Manage categories (ADMIN-006)

**Auth** — `admin` (full or sub-admin).
**Permissions** — `full`, `content-only`.

`categories` is the product-type chip table (erd.md §3.8) — same
small/read-in-full shape as `destinations` above, and the same split
from the `data` module's public `GET /v1/categories` reader.

### `GET /v1/admin/categories` — list

**Request** — no query parameters.

**Response** — `200`

```json
{ "data": [ { "id": "...", "name": "Homestay", "icon": "home", "updated_at": "..." } ] }
```

**Errors** — same four rows as `GET /v1/admin/destinations` above.

### `GET /v1/admin/categories/{id}` — one record

**Response** — `200`, one element of the list above.
**Errors** — as the list endpoint, plus `404 NOT_FOUND`.

### `POST /v1/admin/categories` — create

**Request**

```json
{ "name": "Homestay", "icon": "home" }
```

`name` is required; `icon` is optional (`NULL` when omitted — erd.md
§3.8 "no icon chosen yet" is a legitimate state).

**Response** — `201`, the created row.

**Errors**

| Status | `error.code` | When |
|---|---|---|
| 400 | `MALFORMED_REQUEST` | A field this contract does not define is present |
| 401 | `UNAUTHENTICATED` | No valid session token |
| 403 | `PERMISSION_DENIED` | Signed in, but not `admin`, or an `admin` whose `permissions` is neither `full` nor `content-only` |
| 409 | `CONFLICT` | `name` already exists (`categories.name` is unique, erd.md §3.8) |
| 422 | `VALIDATION_FAILED` | `name` is absent, or trims to empty |
| 500 | `INTERNAL` | The insert fails for a reason other than a refused connection |
| 503 | `UNAVAILABLE` | The database refuses the connection |

### `PATCH /v1/admin/categories/{id}` — edit

**Request** — any subset of `name`, `icon`; a field omitted is left
unchanged.

**Response** — `200`, the updated row.

**Errors** — same six rows as `PATCH /v1/admin/destinations/{id}` above,
read against `categories`.

### `DELETE /v1/admin/categories/{id}` — remove

**Behaviour** — hard delete (erd.md §3.8's own lifecycle note:
"`products.kind` is a free-text label, not an FK" — nothing references
this table).

**Response** — `204`, empty body.
**Errors** — same five rows as `DELETE /v1/admin/destinations/{id}`
above, read against `categories`.

---

## 8.7 Migration plan — Admin content and homepage management (ADMIN-006)

No schema change. `destinations` (erd.md §3.7) and `categories` (erd.md
§3.8) already have every column these ten endpoints read or write —
`name`, `line`, `image`, `from_price` and `name`, `icon` respectively —
plus each table's own unique index on `name`, which this story's `409
CONFLICT` check on create/rename uses directly. Both tables were written
in migration group 3 (`0004_catalogue.up/down.sql`, erd.md §8) ahead of
this story.

No new table, column, index or constraint. Ten endpoints added:
`GET/GET-by-id/POST/PATCH/DELETE` on `/v1/admin/destinations` and the
same five on `/v1/admin/categories`, §3.9.18–§3.9.19 above.

**Forward:** none to run. **Backward:** none to run. **Safety on a
populated table:** not applicable — no DDL in this story.

---
