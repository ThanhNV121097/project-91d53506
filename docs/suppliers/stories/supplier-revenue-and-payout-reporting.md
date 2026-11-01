# Story: Supplier revenue and payout reporting

Module: `suppliers`
Requirement: SUPPLIERS-007
Screens: `/supplier` (`SupplierHome.tsx`), `/supplier/account` (`SupplierAccount.tsx`)

## User story

As a Supplier, I want to see my revenue, the platform commission taken, my
expected payout, and my past payout history, so that I know what I am owed
and can reconcile it myself.

## Scope

**In scope**

- Computing revenue as the sum of the signed-in supplier's own
  `Paid`/`Confirmed`/`Completed` bookings' totals.
- Computing commission as revenue × the applicable commission rate (global
  rate, or this supplier's override if set) — reading that rate, never
  writing it (SUPPLIERS-007 behaviour 2; the rate itself is `admin`
  module's `decision.commission_rate`).
- Computing expected payout as revenue minus commission, for bookings not
  yet closed into a payout period.
- Listing this supplier's own `payouts` rows (period, gross, commission,
  net, status, paid-on date) as payout history.
- Rendering these figures on `/supplier` (overview) and `/supplier/account`
  (payout history section), per the screens table in the SRS.
- The "no commission rate set yet" state: commission shows 0 with the
  design's existing copy for that case.

**Out of scope**

- Setting or changing the commission rate — `admin` module
  (SUPPLIERS-007 behaviour 2; this module only reads it).
- Creating or closing a payout period, or marking a payout as paid —
  `admin` module's commission and payout reconciliation function; this
  story only displays `payouts` rows already written there.
- Any other supplier screen's data (products, bookings, departures,
  reviews) — covered by their own stories.
- Statistics on views, booking conversion rate, and review counts (brief
  lists these as non-MVP "Statistics" items, not part of SUPPLIERS-007's
  revenue/commission/payout figures).

## UI scope

- `/supplier` (`SupplierHome.tsx`): the overview's revenue, commission and
  expected-payout stats replace their mock numbers with the real computed
  figures for the signed-in supplier. Default state only — the design has
  no loading/error state beyond what `Stat` already draws.
- `/supplier/account` (`SupplierAccount.tsx`): the payout-history table
  replaces its mock rows with the supplier's own `payouts` rows. States:
  default (rows present) and empty (no closed payout period yet — "Nothing
  to show." per the `DataTable` empty-state convention).
- No new screen, no new component: both screens and their `Stat`/
  `DataTable` components already exist in the approved design; this story
  wires them to real data.

## Acceptance criteria

- SC-1 [SUPPLIERS-007 AC-1]: Given a supplier with `Confirmed` bookings
  totalling 10,000,000đ and a 10% commission rate (global or their own
  override) applies, when they view `/supplier`, then revenue shows
  10,000,000đ, commission shows 1,000,000đ, and expected payout shows
  9,000,000đ.
- SC-2 [SUPPLIERS-007 AC-2]: Given no commission rate has been set
  globally or for this supplier, when they view `/supplier`, then
  commission shows 0 and the screen shows the design's existing
  no-rate-set note instead of a computed percentage.
- SC-3 [SUPPLIERS-007 AC-3]: Given a closed payout period exists for this
  supplier, when they view `/supplier/account`, then that period's gross,
  commission and net amounts appear in the payout history table.
- SC-4 [SUPPLIERS-007 — Not permitted]: Given Supplier A and Supplier B
  each have bookings and payouts, when Supplier A views `/supplier` or
  `/supplier/account`, then only Supplier A's own bookings and payouts are
  summed and listed — Supplier B's figures never appear and are never
  included in Supplier A's totals.
- SC-5 [SUPPLIERS-007 — Boundary]: Given the applicable commission rate is
  exactly 0%, when the supplier views `/supplier`, then commission shows
  0 and expected payout equals revenue exactly.
- SC-6 [SUPPLIERS-007 — Empty]: Given this supplier has no closed payout
  period yet, when they view `/supplier/account`, then the payout history
  table shows its empty state, not an error or a blank table.

## Dependencies

- `auth` module: the signed-in supplier session (role `supplier`) that
  scopes every sum and list to the caller's own `suppliers` row.
- `data` module: `bookings`, `payouts`, `suppliers` tables.
- `admin` module: the commission rate (`decision.commission_rate` —
  global rate, with a per-supplier override field on `suppliers`) this
  story reads but never writes; and the payout period/closing action that
  produces the `payouts` rows this story lists.
- Booking totals depend on `booking`/`payments` modules having written
  `bookings.status`/`bookings.total` correctly — this story only reads
  them.
