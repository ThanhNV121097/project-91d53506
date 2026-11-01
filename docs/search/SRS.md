# SRS — search

Module: `search`
Design: [View the approved design](http://localhost:9400)
Design system: `design/design-system.md`

## 1. Purpose

The `search` module turns `/search`'s destination/date/travellers/price
filters into a query against real departure availability, so a result only
shows a product that actually has open seats for the date and party size
asked for — not just a product whose static fields happen to match.
Without it, `/search` filters on `products.destination`/`kind`/`price`
alone (as the mock does today) and can show a product with zero seats
left on the date a Buyer asked for.

## 2. Actors

| Actor | Who they are | What they may do in this module |
|---|---|---|
| Visitor | Any visitor, signed in or not | Search and filter products by destination, date, traveller count and price |

## 3. Scope

**In scope** — the function specified below, by its plan title:

- Search and filter trips by criteria

**Out of scope** — a reader would expect these here; they live elsewhere:

- The search row's own fields and the Home page's identical row — `site`
  module (SITE-001, SITE-005); this module is the `/search` results query
  behind it.
- The map pins on `/search`'s own map panel — already built against
  `products.map_x`/`map_y` by `site`'s design; this module does not change
  that rendering, only which products reach it.
- The departures table itself (`/departures`) — `site` module (SITE-003).

## 4. Functional requirements

### 4.1 Search and filter trips by criteria

**Requirement SEARCH-001 — Filter by destination, date, travellers and price**

*As a* visitor, *I want to* search by destination, travel date, number of
travellers and price range on `/search`, *so that* I only see trips I can
actually book for what I asked for.

Behaviour:

1. `where` (destination), `max` (price ceiling), `kind`, `duration` filter
   `products` as `/search` already does (exact/range match on the
   product's own fields).
2. When a `date` is given, a product is included only if it has at least
   one row in `departures` for that product whose `date` matches, whose
   `state` is `Open`, and whose `seats` is greater than or equal to the
   `people` count given (defaulting to the party size already in the URL
   as `people`). A product with no such departure row is excluded even if
   its static fields otherwise match.
3. When `date` is not given, the existing behaviour (matching on the
   product's own `destination`/`kind`/`price`/`duration` fields) is
   unchanged — this requirement narrows results only when a date is
   actually asked for.
4. The result count shown (`total`) reflects exactly the filtered set —
   never the unfiltered product count.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | A product has a `departures` row for `2026-12-24` with `seats = 1`, `state = 'Open'` | A visitor searches that destination, that date, `people = 2` | That product is excluded from the results |
| AC-2 | The same product also has a `departures` row for `2026-12-24` with `seats = 4`, `state = 'Open'` | A visitor searches that destination, that date, `people = 2` | That product is included |
| AC-3 | A product's only departure row for that date has `state = 'Blocked'` | A visitor searches that date | That product is excluded, regardless of its `seats` value |
| AC-4 | A visitor searches with `max = 1000000` | — | Only products whose price (or the matching departure's date-specific price, where a date is given) is at or below 1,000,000 remain |
| AC-5 | A visitor searches with no `date` set | — | Results are filtered by destination/kind/price/duration only, exactly as before this requirement |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Boundary | `people` exactly equals a departure's `seats` | The product is included (AC-2's inequality is `>=`, not `>`) |
| Empty result | No product matches the given filters | The design's existing "nothing matches" message renders (per SITE's `pages.search.none` copy), not an error |
| No permission case | Search is open to every visitor | Not applicable |

**Data touched**

| Field | Type | Required | Rule |
|---|---|---|---|
| departures.date, seats, state | date/number/text | yes | Read to decide inclusion when a search date is given |
| products.destination, kind, price, duration | text/number | yes | Read for the filters already in place |

## 5. Screens

| Screen | Section in the design | Functions it serves | States that must exist |
|---|---|---|---|
| Search (`/search`) | `Search.tsx` | SEARCH-001 | default, loading, empty |

## 6. Non-functional requirements

| Area | Requirement |
|---|---|
| Performance | A filtered search (with a date given) responds within 1.5s at the project's seeded data volume |

## 7. Dependencies and assumptions

- **Depends on:** `data` module, for the `products` and `departures`
  tables this module queries together.
- **Assumption:** "number of travelers" in a search means adults +
  children combined, matching how `departures.seats` is decremented by
  the `booking` module (BOOKING-001).

| Open question | Proposed default | Who decides |
|---|---|---|
| — | — | None open |

## 8. Traceability

| Plan item | Requirement ids | Test cases |
|---|---|---|
| Search and filter trips by criteria | SEARCH-001 | `test-cases/search-and-filter-trips-by-criteria.md` |
