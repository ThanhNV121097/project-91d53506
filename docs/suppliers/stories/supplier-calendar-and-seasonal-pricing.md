# Story — Supplier calendar and seasonal pricing

Module: `suppliers` · Requirement: `SUPPLIERS-004` · Screen:
`/supplier/products/:id` (`SupplierProduct.tsx`, `DepartureEditor.tsx`)

## User story

As a Supplier, I want to add departure dates with their own capacity and
price on my product's edit screen, mark some dates with a seasonal pricing
rule, and block specific dates, so that Buyers always see the right price
and the right availability for the date they pick.

## Scope

**In scope**

- `POST /v1/products/:id/departures` — add a departure (date, capacity,
  price override, season) to one of the signed-in supplier's own products.
- `PATCH /v1/departures/:id` — edit a departure's capacity, price, season
  or state (`Open`/`Blocked`), scoped to the owning supplier.
- Seasonal price override: a non-null `price` on a departure row wins over
  `products.price` for that date only; every other date keeps reading the
  product's base price.
- Blocking: setting `state = 'Blocked'` removes that date from `/search`
  (SEARCH-001) and from the bookable dates `DepartureEditor`/`Trip.tsx`'s
  calendar shows.
- Capacity rule: `capacity` can never be set below the seats already
  committed on that row (`capacity - seats` ≥ 0 stays true after the
  edit); a `capacity ≤ 0` write is rejected.
- Permission: a supplier may add/edit/block a departure only on a product
  whose `supplier_id` is their own.
- Wiring `DepartureEditor.tsx`'s existing "add departure" affordance (today
  mock data only) to these two endpoints, replacing the mock with real
  reads/writes through `useCollection`/`useRecord`.

**Out of scope**

- Seat decrement/increment on booking or hold release — that is `booking`
  module (BOOKING-001); this story only enforces the ceiling
  `seats ≤ capacity`, never moves `seats` itself.
- `/search`'s own query logic excluding a blocked date — `search` module
  (SEARCH-001); this story is the write side that makes a date
  excludable, not the read side that excludes it.
- Approving/rejecting a product, or re-approval triggers from a price/
  content edit on the product itself — SUPPLIERS-002, already a separate
  plan item. Editing a departure's price/capacity/season/state does not
  touch `products.status` at all: departure fields are schedule and price
  data, not the content/price fields SUPPLIERS-002.3 names.
- Deleting a departure row — not in the brief or the design; a date that
  should stop being sold is blocked, matching the ERD's hard-delete-never
  lifecycle for this table.
- The upload endpoint (`POST /v1/media`) — built by "Supplier product
  create edit and approval".

## UI scope

Both states already exist in the approved design on
`/supplier/products/:id`:

- `DepartureEditor.tsx`'s table (default: rows of existing departures;
  empty: zero rows, "no dates yet" per the component's existing empty-state
  convention) — this story wires its reads to the real `departures`
  collection, already partially done (`useCollection<Departure>` in
  `SupplierProduct.tsx`).
- An add-departure control the design shows on this screen, extended with
  a season field and a "block this date" toggle on each existing row —
  this story's only new UI surface is that small form/row-action set,
  using the project's existing `Input`/`Select`/`Badge` components; no new
  screen, no new route.

No other screen is touched — a trip's own `/tours/:id` calendar already
reads `departures` and simply stops showing a `Blocked` row's date once
this story ships, no code change needed there.

## Acceptance criteria

- SC-1 [SUPPLIERS-004 AC-1]: Supplier adds a departure for `2026-12-24`,
  capacity 20, season "Peak summer", price 2,500,000 on their own product;
  after save, a `departures` row exists with those exact values and
  `seats = 20`.
- SC-2 [SUPPLIERS-004 AC-2]: On a product with an existing weekday
  departure at the base price, the supplier marks one specific Saturday
  with "Weekend" pricing and a higher price; only that Saturday's row
  shows the higher price, every weekday row is unchanged.
- SC-3 [SUPPLIERS-004 AC-3]: Supplier blocks a departure row (sets
  `state = 'Blocked'`); that date no longer appears as pickable in
  `DepartureEditor`/`Trip.tsx`'s calendar read of `departures`.
- SC-4 [SUPPLIERS-004 Invalid input row]: Supplier submits capacity `0` or
  negative on a new or edited departure; the write is rejected with a
  message naming the minimum, and no row is written/changed.
- SC-5 [SUPPLIERS-004 Boundary row]: Supplier tries to lower an existing
  departure's capacity below the seats already committed on that row
  (`capacity < committed`, i.e. `capacity - seats < 0` would result); the
  write is rejected rather than silently capping `seats` below zero or
  letting the row overbook.
- SC-6 [SUPPLIERS-004 Not permitted row]: Supplier A attempts to add or
  edit a departure on a product whose `supplier_id` belongs to Supplier B;
  the request is rejected (403/404), and no row is written under Supplier
  A's session.

## Dependencies

- Depends on `auth` module (signed-in supplier session, item 3) — reuses
  the existing session/role check already live on `/supplier/*`.
- Depends on `data` module (item 2) having moved `departures`/`products`
  into the database and served through the paged API — this story adds
  the two write endpoints beside that read contract, on the same tables.
- Depends on the ERD's `departures` table as already specified
  (`docs/architecture/erd.md` §3.6: `capacity`, `seats`, `price`, `season`,
  `state`, the `ck_departures_seats_bounds` and
  `ck_departures_capacity_positive` constraints) — this story's technical
  design step extends `docs/architecture/services.md` with the two
  endpoints above against that existing table, it does not redesign it.
- No dependency on "Supplier booking and passenger management" or
  "Booking creation with inventory hold" — this story never moves `seats`,
  only `capacity`, `price`, `season` and `state`.
