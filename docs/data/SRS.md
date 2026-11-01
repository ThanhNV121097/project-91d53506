# SRS — data

Module: `data`
Design: [View the approved design](http://localhost:9400)
Design system: `design/design-system.md`

## 1. Purpose

The `data` module moves every record collection the storefront and
dashboards read — audit, bookings, campaigns, categories, complaints,
departures, destinations, guides, notifications, payouts, products,
reviews, settings, suppliers, users, vouchers — out of the static JSON
files in `code/frontend/src/data/` and into the project's database, served
through a paged, filterable API. Every other module's screens are built
against `useCollection`/`useRecord` already; this module is what makes
those hooks real instead of reading a bundled file, without changing a
single component. Without it, the site can never show a record anyone
else wrote after the design shipped.

## 2. Actors

| Actor | Who they are | What they may do in this module |
|---|---|---|
| Any caller (frontend) | Every page/component using `useCollection`/`useRecord` | Read a page of a collection, or one record by id, through the public API |

This module has no write endpoints of its own — every collection it serves
is read-only here. Writes to these same tables belong to the module that
owns that action (e.g. `suppliers` writes products, `admin` writes
supplier/product status) and are specified there. It does carry one role
distinction on reads: nine collections — `audit`, `bookings`,
`campaigns`, `complaints`, `notifications`, `payouts`, `settings`,
`users`, `vouchers` — are private and require a signed-in caller; every
page in the approved design that reads one of them is itself behind
sign-in, or no page reads it at all. The remaining collections
(`categories`, `departures`, `destinations`, `guides`, `products`,
`reviews`, `suppliers`) stay public, unauthenticated reads, matching what
the storefront already shows to every visitor today.

## 3. Scope

**In scope** — the function specified below, by its plan title:

- Site data from the database

**In scope, concretely:**
- One PostgreSQL table per `schema.json` collection, one migration creating
  them, one seed migration inserting every record from every
  `src/data/<name>.json` file exactly as it stands today.
- `GET /v1/<collection>?page=&limit=&<field>=<value>` and
  `GET /v1/<collection>/<id>`, as specified in the plan item.
- Rewriting `code/frontend/src/data/index.ts` to call this API instead of
  reading the bundled JSON files, keeping every export's name and return
  shape unchanged.
- Deleting every JSON data file except `schema.json` once the API is live.

**Out of scope** — a reader would expect these here; they live elsewhere:

- Any write to a collection (creating a product, confirming a booking,
  approving a supplier) — specified in the module that owns that action.
- The authentication mechanism itself (login, session/token issuance) —
  `auth` module. This module enforces the resulting sign-in requirement at
  its own endpoints (DATA-002, DATA-003) for the nine private collections
  listed there, but does not implement sign-in.
- The inventory hold, seat decrement and booking state machine — `booking`
  module.

## 4. Functional requirements

### 4.1 Site data from the database

**Requirement DATA-001 — Collection storage**

*As the* platform, *I want* every record collection stored in the
database rather than a bundled file, *so that* a write by any other module
is visible to every reader without a new deployment.

Behaviour:

1. A migration creates one table per collection in `schema.json`, one
   column per schema field, typed per the plan item's mapping (price →
   numeric; image/url → text; list → text[]; `ref:<collection>` → a
   foreign key to that table's `id`; bool → boolean; the record's `id` is
   the table's text primary key; `_source` becomes a `source` column).
2. A seed migration inserts every record of every existing
   `src/data/<name>.json` file into its table, unchanged — no record is
   lost, renamed or re-priced.
3. Nine collections — `audit`, `bookings`, `campaigns`, `complaints`,
   `notifications`, `payouts`, `settings`, `users`, `vouchers` — are marked
   private; the other seven (`categories`, `departures`, `destinations`,
   `guides`, `products`, `reviews`, `suppliers`) stay public. This mapping
   is what DATA-002 and DATA-003 enforce at the list and record endpoints.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | The migrations have run | — | Every collection named in `schema.json` has a matching table with one column per schema field |
| AC-2 | A record existed in `src/data/<name>.json` before migration | The seed migration runs | That exact record (same id, same field values) exists in the matching table |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Permission/access-scoping | A caller with no valid session or token requests any endpoint for one of the nine private collections (`audit`, `bookings`, `campaigns`, `complaints`, `notifications`, `payouts`, `settings`, `users`, `vouchers`) | 401; a signed-in caller without the required role/ownership for that collection gets 403. These cases are specified and tested at the endpoint level, DATA-002 and DATA-003 |

**Data touched** — every field of every collection named in
`code/frontend/src/data/schema.json`, as that file defines them.

**Requirement DATA-002 — List endpoint**

*As a* caller, *I want to* `GET /v1/<collection>?page=&limit=&<field>=<value>`,
*so that* I can read one page of a collection, optionally filtered by any
of its own fields, in the seed's stable order.

Behaviour:

1. The endpoint returns `{"items": [...], "total": n, "page": p, "limit": l}`.
2. Any schema field may be given as a query parameter to filter by exact
   match; filters not given are not applied.
3. `limit` is capped at 100; when not given, the field's own sensible
   default (matching what the frontend already requests, e.g. 12) applies.
4. Records are returned in the seed's insertion order when no sort is
   requested, and with the same field names the JSON file used.
5. `page` beyond the last page returns an empty `items` array with the
   correct `total`, not an error.
6. The public-read rule applies to every `/v1/<collection>` list endpoint
   **except** the nine private collections named in DATA-001 (`audit`,
   `bookings`, `campaigns`, `complaints`, `notifications`, `payouts`,
   `settings`, `users`, `vouchers`), which require a signed-in caller and
   return 401/403 as specified below instead of a list.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | A collection has 25 records | `GET /v1/<collection>?page=1&limit=12` | `items` has 12 records, `total` is 25, `page` is 1, `limit` is 12 |
| AC-2 | A collection has a field `status` | `GET /v1/<collection>?status=approved` | `items` contains only records whose `status` equals `approved` |
| AC-3 | A client requests `limit=500` | — | The server returns at most 100 items per page |
| AC-4 | A collection has 25 records, 12 per page | `GET /v1/<collection>?page=5&limit=12` | `items` is `[]` and `total` is 25 |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Unknown collection | The path names a collection not in `schema.json` | 404 response |
| Unknown filter field | A query parameter does not match any field on that collection | Ignored; it does not error and does not filter |
| Unauthenticated access | `<collection>` is one of the nine private collections (`audit`, `bookings`, `campaigns`, `complaints`, `notifications`, `payouts`, `settings`, `users`, `vouchers`) and the caller has no valid session or token | 401 |
| Unauthorized access | `<collection>` is one of the nine private collections and the caller is signed in but lacks the role/ownership that collection requires | 403 |
| Public collection | `<collection>` is any collection other than the nine listed above | No session required; list proceeds as a public read |

**Data touched** — every field of the requested collection, returned as
given in `schema.json` (same field names).

**Requirement DATA-003 — Record endpoint**

*As a* caller, *I want to* `GET /v1/<collection>/<id>`, *so that* I can
read one record by its id.

Behaviour:

1. The endpoint returns the record matching `<id>` in `<collection>`.
2. An id with no matching record returns 404.
3. The public-read rule applies to every `/v1/<collection>/<id>` record
   endpoint **except** the nine private collections named in DATA-001
   (`audit`, `bookings`, `campaigns`, `complaints`, `notifications`,
   `payouts`, `settings`, `users`, `vouchers`), which require a signed-in
   caller and return 401/403 as specified below instead of the record.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | A record with id `cua-lo-beach-2n1d` exists in `products` | `GET /v1/products/cua-lo-beach-2n1d` | The record is returned with every field `schema.json` defines for `products` |
| AC-2 | No record with that id exists | `GET /v1/products/does-not-exist` | 404 response |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Not found | Id does not exist in the collection | 404, matching DATA-003 AC-2 |
| Unauthenticated access | `<collection>` is one of the nine private collections (`audit`, `bookings`, `campaigns`, `complaints`, `notifications`, `payouts`, `settings`, `users`, `vouchers`) and the caller has no valid session or token | 401 |
| Unauthorized access | `<collection>` is one of the nine private collections and the caller is signed in but lacks the role/ownership that collection requires | 403 |
| Public collection | `<collection>` is any collection other than the nine listed above | No session required; record read proceeds as a public read |

**Data touched** — one record's worth of whatever fields that collection's
schema defines.

**Requirement DATA-004 — Frontend reads the API**

*As a* component already built against `useCollection`/`useRecord`, *I
want* those hooks to fetch from the API instead of a bundled file, with no
change to my own code, *so that* every screen already built keeps working
once the backend lands.

Behaviour:

1. `src/data/index.ts` is rewritten to call `GET <base>/v1/<name>?...` and
   `GET <base>/v1/<name>/<id>`, where `base` is
   `import.meta.env.VITE_API_URL ?? "/api"`.
2. Every export's name and return shape is unchanged: `useCollection`
   returns `{ items, total, pages, page, hasMore, loading, error, loadMore }`;
   `useRecord` returns `{ item, loading, error }`; `schema` and the `Row`/
   `Field`/`Collection` types are unchanged.
3. `useCollection` fetches the first page on mount; `loadMore()` fetches
   and appends the next page. Both expose real `loading` and `error`
   states driven by the request's outcome, not the mock's fixed `false`/
   `null`.
4. `schema.json` is kept; every other file in `src/data/` is deleted once
   the API is live.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | A component calls `useCollection("products", {...})` | The request is in flight | `loading` is `true` and `items` is the page(s) already loaded |
| AC-2 | The API request fails (network error, 5xx) | — | `error` is set to an `Error`, `loading` becomes `false`, and the page's own error UI (where one exists) is reached |
| AC-3 | A component calls `loadMore()` | The next page resolves | `items` holds the previous items plus the new page, not a replacement |
| AC-4 | Any existing component imports `useCollection`, `useRecord`, `schema` or a type from `src/data` | The rewrite ships | The import still resolves to the same name and the same shape; no component file changes |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Upstream failure | The API is unreachable or returns an error status | `error` is populated and `loading` is `false`; no component is specified here to retry automatically, since no such control exists in the design today |
| No permission case | The hooks themselves hold no role logic | Not applicable |

**Data touched** — none beyond what DATA-002/DATA-003 already define; this
requirement is about the client call, not new fields.

## 5. Screens

This module has no screen of its own: it is the data layer every other
module's screens read through. See each module's own §5 for how its
screens use `useCollection`/`useRecord` against this API.

| Screen | Section in the design | Functions it serves | States that must exist |
|---|---|---|---|
| — | — | — | Not applicable: this module ships no screen; it is consumed by every other module's existing screens unchanged |

## 6. Non-functional requirements

| Area | Requirement |
|---|---|
| Performance | `GET /v1/<collection>` responds within 1s at cold cache, for a collection under 1,000 rows and a result page of 100 or fewer records |
| Data integrity | The seed migration must reproduce every record in every current `src/data/*.json` file losslessly — same id, same values, same field names |

## 7. Dependencies and assumptions

- **Depends on:** `code/frontend/src/data/schema.json` as the single source
  of collection and field definitions; a schema change is a decision made
  elsewhere, not by this module.
- **Assumption:** no collection in `schema.json` needs a write endpoint
  from this module itself — every write belongs to the module that
  performs that action and is specified in that module's own SRS.

| Open question | Proposed default | Who decides |
|---|---|---|
| Should `GET /v1/<collection>` support free-text search (`q`) and ranges, as `src/data/index.ts`'s `Query` type already allows for the mock? | Yes, matching the mock's existing `q`/`search`/range filter shapes, since several screens (search box, date range) already call them against the mock and must keep working once the mock is replaced | TL (architecture detail; this SRS requires exact-match filtering as the floor, and existing component behaviour sets the ceiling) |

## 8. Traceability

| Plan item | Requirement ids | Test cases |
|---|---|---|
| Site data from the database | DATA-001, DATA-002, DATA-003, DATA-004 | `test-cases/site-data-from-the-database.md` |
