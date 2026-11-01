# Story — Site data from the database

Module: `data`
SRS: [docs/data/SRS.md](../SRS.md)

## User story

As any caller already using `useCollection`/`useRecord` (every storefront
and CMS screen built against the approved design), I want every record
collection served from the project's database through a paged, filterable
read API, so that a write any other module makes (a new product, an
approved supplier, a confirmed booking) is visible to every reader without
a redeploy, and every screen already built keeps working unchanged.

## Scope

**In scope:**
- One PostgreSQL table per collection named in
  `code/frontend/src/data/schema.json`: `audit`, `bookings`, `campaigns`,
  `categories`, `complaints`, `departures`, `destinations`, `guides`,
  `notifications`, `payouts`, `products`, `reviews`, `settings`,
  `suppliers`, `users`, `vouchers`. One column per schema field, typed per
  the mapping in DATA-001 (`price`→numeric, `image`/`url`→text, `list`→
  `text[]`, `ref:<collection>`→foreign key to that table's `id`,
  `bool`→boolean, `id`→text primary key, `_source`→column `source`).
- A migration creating those 16 tables.
- A seed migration inserting every record of every existing
  `code/frontend/src/data/<name>.json` file into its table, unchanged.
- `GET /v1/<collection>?page=&limit=&<field>=<value>` returning
  `{"items":[...],"total":n,"page":p,"limit":l}`, exact-match filtering on
  any schema field, `limit` capped at 100 (default 12 unless the mock
  already asks for a different default for that collection), stable
  seed-insertion order, empty `items` (not an error) past the last page.
- `GET /v1/<collection>/<id>` returning the record or 404.
- 404 for a `<collection>` path segment not present in `schema.json`.
- Rewriting `code/frontend/src/data/index.ts` only: `useCollection`,
  `useRecord`, `schema`, and every exported type keep their current name
  and return shape; the base URL is
  `import.meta.env.VITE_API_URL ?? "/api"`; `useCollection` fetches page 1
  on mount and appends on `loadMore()`; both hooks expose real `loading`/
  `error` driven by the request outcome.
- Keeping `schema.json`; deleting every other file in
  `code/frontend/src/data/` once the API-backed `index.ts` ships.

**Out of scope:**
- Any write endpoint (creating/editing a product, confirming a booking,
  approving a supplier, etc.) — specified in the module that performs that
  write (`suppliers`, `admin`, `booking`, …), per SRS §3.
- Auth/permission checks on these endpoints — every endpoint here is a
  public read, matching what the storefront shows every visitor today
  (`auth` module, per SRS §3).
- The inventory hold, seat decrement, and booking/product state machines —
  `booking` and `suppliers`/`admin` modules.
- Free-text search (`q`) and range filters beyond exact match — SRS §7
  leaves this an open question for TL; this story ships exact-match
  filtering only, which is the SRS's floor requirement (DATA-002). If TL's
  architecture decision extends filtering to `q`/ranges during technical
  design, that is this story's own BE step implementing TL's decision, not
  a second story.
- Any change to a component file under `code/frontend/src/components` or
  `code/frontend/src/pages` — DATA-004 AC-4 requires zero component
  changes; this story touches only `src/data/index.ts` and (by deletion)
  its sibling JSON files.

## UI scope

None. This module ships no screen of its own (SRS §5); every existing
screen already calls `useCollection`/`useRecord` against the design's mock
and is unchanged by this story. No story UI stage produces a new
component — the FE half of this story is the `src/data/index.ts` rewrite
only, reviewed as a backend-contract change rather than a visual one.

## Acceptance criteria

SC-1 [DATA-001 AC-1]: After migrations run, every collection named in
`schema.json` (16 collections) has a matching PostgreSQL table with one
column per schema field, typed per the mapping in SRS §4 DATA-001.

SC-2 [DATA-001 AC-2]: For every record that existed in
`code/frontend/src/data/<name>.json` before migration, a record with the
same `id` and the same field values exists in that collection's table
after the seed migration runs — no record lost, renamed, or re-priced.

SC-3 [DATA-002 AC-1]: Given a collection with more than 12 records,
`GET /v1/<collection>?page=1&limit=12` returns exactly 12 items in
`items`, the collection's real row count in `total`, `page` 1 and `limit`
12.

SC-4 [DATA-002 AC-2]: Given a collection with a field present in its
schema (e.g. `status`), `GET /v1/<collection>?status=<value>` returns only
records whose `status` equals `<value>` exactly; a query parameter not
matching a field on that collection is ignored, not an error.

SC-5 [DATA-002 AC-3]: `GET /v1/<collection>?limit=500` returns at most 100
items in `items`.

SC-6 [DATA-002 AC-4]: Given a collection with 25 records at `limit=12`,
`GET /v1/<collection>?page=5&limit=12` returns `items: []` and `total:
25` with a 200 status, not an error.

SC-7 [DATA-002 failure]: `GET /v1/<collection>` for a `<collection>` not
named in `schema.json` returns 404.

SC-8 [DATA-003 AC-1]: `GET /v1/products/<id>` for an `<id>` that exists
returns that record with every field `schema.json` defines for
`products`, under the same field names the JSON file used.

SC-9 [DATA-003 AC-2]: `GET /v1/<collection>/<id>` for an `<id>` with no
matching record returns 404.

SC-10 [DATA-004 AC-1]: While a component's `useCollection(...)` request is
in flight, the hook's `loading` is `true` and `items` holds whatever
page(s) already resolved (not stale/empty on every re-render).

SC-11 [DATA-004 AC-2]: When the API request fails (network error or 5xx),
`useCollection`/`useRecord` set `error` to an `Error` instance and
`loading` becomes `false`.

SC-12 [DATA-004 AC-3]: Calling `loadMore()` on a `useCollection` whose next
page resolves appends that page's items to the existing `items` array —
the previous items are kept, not replaced.

SC-13 [DATA-004 AC-4]: After the rewrite ships, every existing import of
`useCollection`, `useRecord`, `schema`, or a type from `src/data` resolves
to the same name and the same shape, and no file under
`code/frontend/src/components` or `code/frontend/src/pages` changes.

SC-14 [DATA-004 behaviour]: `schema.json` remains in
`code/frontend/src/data/`; every other file previously in that directory
is deleted in this story's PR.

## Dependencies

- `code/frontend/src/data/schema.json` as the single source of collection
  and field definitions (SRS §7) — this story does not change it.
- `docs/architecture/overview.md`'s committed backend skeleton
  (`cmd/api/main.go`, `internal/migrate`, `migrations/`) — this story is
  the first to add product migrations and Go packages beyond `0001_init`.
- No dependency on any other story: this is the foundation every other
  module's backend work (suppliers, booking, admin, payments) reads
  through, so it is sequenced first among the backend stories.
