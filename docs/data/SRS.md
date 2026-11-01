# SRS — Data

Module: `data`
Design: [View the approved design](http://localhost:9400)
Design system: `design/design-system.md`

## 1. Purpose

The `data` module moves every record the design shows out of the static JSON
files in `code/frontend/src/data/` into the project's database, and serves
them through a paged, filterable REST API. Every other module reads and
writes through this API instead of a JSON file. Without it the site cannot
survive a restart, cannot have two visitors see the same booking, and cannot
be written to by any backend story.

## 2. Actors

| Actor | Who they are | What they may do in this module |
|---|---|---|
| Any caller (frontend) | The site's own frontend code | List and read records of any collection, paged and filtered |
| Backend modules (auth, booking, payments, suppliers, admin, …) | Other server-side modules | Write to the tables this module creates, through their own endpoints — this module itself exposes read-only `GET` routes |

This module has no end-user-facing permission model of its own: it is
infrastructure. Write access and its permission rules belong to the module
that owns each write (e.g. a booking's row is written by `booking`, a
product's by `suppliers`).

## 3. Scope

**In scope** — the one function specified below:

- Site data from the database

**In scope**, concretely:

- One PostgreSQL table per collection named in `code/frontend/src/data/schema.json`:
  `audit, bookings, campaigns, categories, complaints, departures,
  destinations, guides, notifications, payouts, products, reviews, settings,
  suppliers, users, vouchers`.
- A migration creating those tables, and a seed migration inserting every
  record from every `src/data/<name>.json` file exactly as it stands today.
- `GET /v1/<collection>` and `GET /v1/<collection>/<id>`.
- The rewrite of `code/frontend/src/data/index.ts` to call that API instead
  of reading the JSON files, keeping every existing export's name and return
  shape.
- Deleting every file in `src/data/` except `schema.json` once the rewrite is
  verified against the running API.

**Out of scope** — a reader would expect these here, and they live elsewhere:

- `POST`, `PUT`, `PATCH`, `DELETE` routes on any collection — each belongs to
  the module that owns that write (e.g. creating a booking is `booking`'s
  `POST /v1/bookings`, approving a product is `admin`'s own endpoint).
- The `POST /v1/media` upload endpoint for photos/documents — built by the
  `suppliers` module (Supplier product create/edit/approval).
- Authentication and session issuance — `auth` module.
- Real-time seat-hold decrement logic — `booking` module (this module stores
  the `departures.seats` column it reads and writes).

## 4. Functional requirements

### 4.1 Site data from the database

**Requirement DATA-001 — One table per collection, seeded from the JSON**

*As a* backend module, *I want to* read and write collection records in
PostgreSQL instead of a JSON file, *so that* data survives restarts and is
shared across every server process.

Behaviour:

1. A migration creates one table per collection in `schema.json`, one column
   per schema field: `text` and `longtext` → `text`; `number` → `numeric`;
   `price` → `numeric` (currency is fixed per schema, not stored per row);
   `image` and `url` → `text`; `list` → `text[]`; `bool` → `boolean`;
   `ref:<collection>` → a foreign key column referencing that table's `id`.
   `id` is the table's primary key, type `text`. `_source` becomes a column
   named `source`.
2. A seed migration inserts every record from every `src/data/<name>.json`
   file into its table, preserving every field's value exactly — no record is
   dropped, renamed or re-priced in the move.
3. Running the migrations twice does not duplicate rows (the seed migration
   is idempotent on `id`).

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | `src/data/products.json` has N records | The seed migration runs | The `products` table has exactly N rows, each matching its JSON record field for field |
| AC-2 | A field is typed `ref:suppliers` in `schema.json` | The migration creates that column | It is a foreign key to `suppliers.id` |
| AC-3 | The seed migration is run a second time | — | No row count changes; no error |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Boundary | A JSON record has an empty list field (`[]`) | The corresponding `text[]` column stores an empty array, not `NULL` |
| Upstream failure | The database is unreachable when a migration runs | The migration fails loudly (non-zero exit, logged error); it never leaves the schema half-created |

**Data touched** — every collection named in `schema.json`, field-for-field as that file defines them.

---

**Requirement DATA-002 — Paged, filterable read API**

*As a* caller, *I want to* list a collection's records a page at a time,
filtered by any of its own fields, *so that* a catalogue or a dashboard table
shows exactly the records it asked for.

Behaviour:

1. `GET /v1/<collection>?page=1&limit=12&<field>=<value>` returns
   `{"items": [...], "total": n, "page": p, "limit": l}`. `<field>=<value>`
   filters on an exact match of any field the collection's schema defines;
   repeating a field or passing a comma-separated value is "any of"; `total`
   counts every match, not just the page returned.
2. Records are returned in a stable order (the seed's insertion order) unless
   a `sort` parameter is given.
3. `limit` is capped at 100 regardless of what is requested.
4. `GET /v1/<collection>/<id>` returns that one record with the same field
   names the JSON file used, or 404 when no record with that id exists.
5. The edge strips the `/api` prefix: the browser calls
   `/api/v1/<collection>`, this server serves `/v1/<collection>`.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | A collection has 37 matching records and `limit=12` | `GET /v1/<collection>?page=2&limit=12` | `items` has 12 records (items 13–24), `total` is 37 |
| AC-2 | `limit=500` is requested | The same endpoint is called | At most 100 records are returned |
| AC-3 | A record with id `x` exists | `GET /v1/<collection>/x` | 200, the record, with its original field names |
| AC-4 | No record with id `x` exists | `GET /v1/<collection>/x` | 404 |
| AC-5 | `?status=approved&status=pending` is passed | `GET /v1/products` | Only records with `status` in `{approved, pending}` are returned |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Invalid input | `page` or `limit` is non-numeric or negative | The request falls back to `page=1`, the default `limit`; it does not 500 |
| Not found | Collection name does not exist in `schema.json` | 404, not a 500 or an empty 200 |
| Not found | Record id does not exist | 404 (AC-4) |

**Data touched** — read-only across every table created by DATA-001.

---

**Requirement DATA-003 — Frontend reads the API, mock files are deleted**

*As a* frontend page, *I want to* keep calling `useCollection`/`useRecord`
exactly as today, *so that* no component changes when the backend lands.

Behaviour:

1. `code/frontend/src/data/index.ts` is rewritten to call the API at
   `import.meta.env.VITE_API_URL ?? "/api"` instead of reading the bundled
   JSON files, while keeping every existing export's name, signature and
   return shape (`useCollection`, `useRecord`, `schema`, `Row`, `Field`,
   `Collection`, `Query`, `Source`).
2. `useCollection` fetches page by page: the first page loads on mount;
   `loadMore()` fetches and appends the next page. It exposes real `loading`
   and `error` states reflecting the in-flight request.
3. `useRecord` fetches the one record by id and exposes the same `loading`/`error` shape.
4. `schema.json` is kept; every other file in `src/data/` is deleted once the
   API is live and the frontend no longer imports them.
5. No component outside `src/data/index.ts` changes — paging and lazy
   loading were designed against this exact contract.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | The API is reachable | A page calls `useCollection("products", {...})` | The hook's return shape (`items`, `total`, `pages`, `page`, `hasMore`, `loading`, `error`, `loadMore`) is unchanged from the mock version |
| AC-2 | A request is in flight | A component reads `loading` | It is `true` until the response resolves |
| AC-3 | The API call fails (network error, 5xx) | A component reads `error` | It is a non-null `Error`, not a thrown exception that crashes the page |
| AC-4 | The rewrite is committed | `src/data/` is inspected | Only `index.ts` and `schema.json` remain |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Upstream failure | The API is unreachable | `useCollection`/`useRecord` set `error`, `items`/`item` stay empty/undefined; no exception escapes the hook |
| Not applicable | — | A loading or error state for this hook has no visual design of its own beyond what each consuming page already draws (per that page's own SRS) |

**Data touched** — none directly; this requirement is the client of DATA-002's API.

## 5. Screens

This module has no screen of its own — it is the data layer every screen in
`site` and every backend module reads through. No row is added here.

| Screen | Section in the design | Functions it serves | States that must exist |
|---|---|---|---|
| — | — | — | Not applicable: this module has no screen; see each consuming module's SRS §5 |

## 6. Non-functional requirements

| Area | Requirement |
|---|---|
| Performance | `GET /v1/<collection>` responds within 1s at a page size of 100, cold cache, on the project's seeded dataset |
| Data integrity | No record from any `src/data/<name>.json` file is lost, renamed, or has a value changed during the migration |

## 7. Dependencies and assumptions

- **Depends on:** nothing upstream; every other backend module depends on this one for its storage.
- **Assumption:** every collection's schema in `code/frontend/src/data/schema.json` is final as of this SRS; a later field addition to a collection is a revision to this document and its migration.

| Open question | Proposed default | Who decides |
|---|---|---|
| — | — | None open for this module |

## 8. Traceability

| Plan item | Requirement ids | Test cases |
|---|---|---|
| Site data from the database | DATA-001, DATA-002, DATA-003 | `test-cases/site-data-from-the-database.md` |
