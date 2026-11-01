
# Story — Search and filter trips by criteria

Module: `search`
Requirement: SEARCH-001 (`docs/search/SRS.md`)

## User story

As a Visitor, I want to search `/search` by destination, travel date,
number of travellers and price range and see only trips that actually have
open seats for what I asked, so that I don't pick a trip I can't book.

## Scope

**In scope**

- The `/search` results query: `GET` endpoint backing the search row
  already built by `site` (SITE-001/005), filtering `products` joined
  against `departures` per SEARCH-001.
- Destination/kind/duration/price filtering on `products`' own fields
  (existing behaviour, carried over from the mock).
- Date-aware filtering: when `date` is given, only include a product that
  has a matching `departures` row with `state = 'Open'` and
  `seats >= people`.
- `total` reflecting the exact filtered count.
- The three UI states already defined for `Search.tsx` in the design:
  default, loading, empty — wiring them to the real endpoint's response
  instead of the mock.

**Out of scope**

- The search row's fields and markup, and the identical row on Home —
  `site` module (SITE-001, SITE-005). This story does not touch that
  component, only the data it calls.
- The map panel/pins — unchanged rendering, already built against
  `products.map_x`/`map_y`; this story only changes which products reach
  it.
- The `/departures` table page — `site` module (SITE-003).
- Ratings/review-count filtering — not in SEARCH-001's filter list (only
  destination, date, travellers, price; `kind`/`duration` already existed
  on the product fields and are carried over, not added).
- Writing or changing `departures`/`products` data — this story only reads.

## UI scope

`Search.tsx` (`/search`) already renders the three states (default,
loading, empty) against mock data per the design. This story swaps the
mock call for the real `GET /v1/search` endpoint; no new screen, state, or
component is added. The "nothing matches" empty-state copy is the design's
existing `pages.search.none` string — unchanged.

## Acceptance criteria

- SC-1 [SEARCH-001 AC-1]: Given a product's only `departures` row for the
  searched date has `seats = 1` and `state = 'Open'`, when a visitor
  searches that destination/date with `people = 2`, then the product is
  excluded from the results.
- SC-2 [SEARCH-001 AC-2]: Given the same product also has a `departures`
  row for that date with `seats = 4` and `state = 'Open'`, when the
  visitor searches that destination/date with `people = 2`, then the
  product is included.
- SC-3 [SEARCH-001 AC-3]: Given a product's only `departures` row for the
  searched date has `state = 'Blocked'`, when a visitor searches that
  date, then the product is excluded regardless of its `seats` value.
- SC-4 [SEARCH-001 AC-4]: Given a visitor searches with `max = 1000000`,
  then only products whose price (or the matching departure's date-specific
  price, when a date is given) is at or below 1,000,000 remain in the
  results.
- SC-5 [SEARCH-001 AC-5]: Given a visitor searches with no `date` set,
  then results are filtered by destination/kind/price/duration only,
  identical to pre-SEARCH-001 behaviour.
- SC-6 [SEARCH-001 boundary]: Given `people` exactly equals a matching
  departure's `seats`, then the product is included (inequality is `>=`).
- SC-7 [SEARCH-001 empty-result]: Given no product matches the given
  filters, then the response yields an empty result set and `Search.tsx`
  renders its existing "nothing matches" state — not an error.
- SC-8 [SEARCH-001 perf]: A filtered search with a `date` given responds
  within 1.5s at the project's seeded data volume.

## Dependencies

- `data` module: `products` and `departures` tables must exist and be
  seeded before this story's backend can query them.
- `site` module (SITE-001/005): the `/search` search row and its URL
  params (`where`, `date`, `people`, `max`, `kind`, `duration`) must
  already exist — this story only replaces what answers them.
