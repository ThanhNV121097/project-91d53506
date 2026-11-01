# Test cases — Supplier revenue and payout reporting

Module: `suppliers`. Covers SUPPLIERS-007 (`/supplier` and
`/supplier/account` revenue, commission and payout figures). Traces to
`docs/suppliers/SRS.md` §4.5 and to `docs/architecture/services.md`
§3.8.10 (`GET /v1/supplier/revenue`), §3.8.11 (`GET /v1/supplier/payouts`)
and the cross-cutting contract in §2.

No story plan exists yet for this module (only the SRS), so the SRS's own
`AC-n` lists are the criteria this file covers, per the task's fallback
rule. Risk level: **medium-high** — these are money figures a supplier
relies on to know what they are owed, and the behaviour text names two
subtleties beyond the headline arithmetic (which booking statuses count,
and that "expected" payout must not double-count revenue already settled
in a closed period), so both get their own case alongside the AC table.

## SUPPLIERS-007 — Revenue, commission and payout figures

**Scenario**: Revenue, commission and expected payout reconcile for a straightforward rate
**Given**: A signed-in supplier whose `Confirmed` bookings on their own products total 10,000,000 and a 10% commission rate applies (no closed payout period yet covering that revenue)
**When**: `GET /v1/supplier/revenue` is called
**Then**: `200` is returned with `revenue: 10000000`, `commission_rate: 0.10`, `commission: 1000000`, `expected_payout: 9000000`
**Traces**: SUPPLIERS-007 AC-1; contract (`GET /v1/supplier/revenue`, §3.8.10)
**Check**: fetch_url

**Scenario**: Revenue sums only Paid, Confirmed and Completed bookings, excluding every other status
**Given**: A signed-in supplier with bookings on their own products in a mix of statuses — one `Paid` at 400,000, one `Confirmed` at 700,000, one `Completed` at 840,000, one `Awaiting payment` at 500,000, one `Cancelled` at 1,450,000 and one `Refunded` at 1,300,000
**When**: `GET /v1/supplier/revenue` is called
**Then**: `revenue` equals 1,940,000 (400,000 + 700,000 + 840,000 only) — the `Awaiting payment`, `Cancelled` and `Refunded` totals are not included
**Traces**: SUPPLIERS-007 behaviour 1 ("sum of the supplier's own Paid/Confirmed/Completed bookings' totals")
**Check**: fetch_url

**Scenario**: A supplier's own commission override rate is used in place of the global rate
**Given**: A signed-in supplier with 5,000,000 in qualifying bookings, a global commission rate of 10% and this supplier's own override rate set to 15%
**When**: `GET /v1/supplier/revenue` is called
**Then**: `commission_rate: 0.15`, `commission: 750000` and `expected_payout: 4250000` — the override, not the 10% global rate, is applied
**Traces**: SUPPLIERS-007 behaviour 2 ("global, or this supplier's override")
**Check**: fetch_url

**Scenario**: No commission rate set anywhere shows zero commission and a full-revenue expected payout
**Given**: A signed-in supplier with 6,600,000 in qualifying bookings, no global commission rate set and no override on this supplier's row
**When**: `GET /v1/supplier/revenue` is called
**Then**: `200` is returned with `commission_rate: 0`, `commission: 0` and `expected_payout: 6600000`
**Traces**: SUPPLIERS-007 AC-2; contract (`GET /v1/supplier/revenue`, §3.8.10 "When no rate is set")
**Check**: fetch_url

**Scenario**: The overview screen shows the "no rate set" note instead of a commission figure built from nothing
**Given**: The same signed-in supplier as above, with no commission rate set anywhere
**When**: `/supplier` is opened
**Then**: The "Platform commission" stat shows the note "No commission rate has been set yet." — the same wording the design already carries for this state
**Traces**: SUPPLIERS-007 AC-2
**Check**: render_url

**Scenario**: A commission rate explicitly set to exactly 0% behaves the same as an unset rate
**Given**: A signed-in supplier with 2,000,000 in qualifying bookings and a global commission rate explicitly saved as `0`
**When**: `GET /v1/supplier/revenue` is called
**Then**: `commission_rate: 0`, `commission: 0` and `expected_payout: 2000000`
**Traces**: SUPPLIERS-007 "Boundary" row ("Commission rate is exactly 0%")
**Check**: fetch_url

**Scenario**: Expected payout excludes revenue already settled in a closed payout period
**Given**: A signed-in supplier with 10,000,000 total in qualifying bookings, a 10% commission rate, and a closed payout period already covering 4,000,000 of that revenue (its own `payouts` row: gross 4,000,000, commission 400,000, net 3,600,000)
**When**: `GET /v1/supplier/revenue` is called
**Then**: `revenue: 10000000` (the lifetime total) but `expected_payout` reflects only the 6,000,000 not yet in a closed period minus its commission, i.e. `5400000` — not `9000000`, which would double-count the already-paid 3,600,000
**Traces**: SUPPLIERS-007 behaviour 3 ("Expected payout is revenue minus commission, for bookings not yet in a closed payout period")
**Check**: fetch_url

**Scenario**: A closed payout period's gross, commission and net appear in payout history
**Given**: A signed-in supplier with one closed payout period: gross 9,515,000, commission 0, net 9,515,000, status "Awaiting commission rate"
**When**: `GET /v1/supplier/payouts` is called
**Then**: `200` is returned with that period's `gross`, `commission`, `net` and `status` values present in the `data` array
**Traces**: SUPPLIERS-007 AC-3; contract (`GET /v1/supplier/payouts`, §3.8.11)
**Check**: fetch_url

**Scenario**: The payout history table on the account screen renders that period's figures
**Given**: The same signed-in supplier and closed payout period as above
**When**: `/supplier/account` is opened
**Then**: The payout history table shows a row with gross 9,515,000, commission 0, net 9,515,000 and the status "Awaiting commission rate"
**Traces**: SUPPLIERS-007 AC-3
**Check**: render_url

**Scenario**: No closed payout period yet shows the empty-history message, not an empty table with no explanation
**Given**: A signed-in supplier with no `payouts` rows at all
**When**: `/supplier/account` is opened
**Then**: The payout history section shows "No payout period has closed yet." and no table rows
**Traces**: SUPPLIERS-007 screen state "empty" (§5 Screens table, Profile & payouts)
**Check**: render_url

**Scenario**: A supplier's figures never include another supplier's bookings or payouts
**Given**: Supplier A with 3,000,000 in qualifying bookings and one closed payout period, and Supplier B with 8,000,000 in qualifying bookings and two closed payout periods, both signed in separately
**When**: Supplier A calls `GET /v1/supplier/revenue` and `GET /v1/supplier/payouts`
**Then**: `revenue` is 3,000,000 (not 11,000,000) and the payouts list contains only Supplier A's one period, with none of Supplier B's periods present
**Traces**: SUPPLIERS-007 "Not permitted" row; data rule "Summed per the owning supplier only"
**Check**: fetch_url

**Scenario**: An unauthenticated caller cannot read revenue or payout figures
**Given**: No session token sent
**When**: `GET /v1/supplier/revenue` and `GET /v1/supplier/payouts` are each called without an `Authorization` header or `session` cookie
**Then**: Both return `401 UNAUTHENTICATED`
**Traces**: contract (§2.2, §2.3 `UNAUTHENTICATED`)
**Check**: fetch_url

**Scenario**: A buyer session cannot read a supplier's revenue or payout figures
**Given**: A signed-in account with `role = 'buyer'`
**When**: `GET /v1/supplier/revenue` and `GET /v1/supplier/payouts` are each called
**Then**: Both return `403 PERMISSION_DENIED`
**Traces**: contract (§3.8 "Auth — `supplier`"; §2.3 `PERMISSION_DENIED`)
**Check**: fetch_url

**Scenario**: An admin session cannot read these figures through the supplier-scoped endpoint
**Given**: A signed-in account with `role = 'admin'`
**When**: `GET /v1/supplier/revenue` is called
**Then**: `403 PERMISSION_DENIED` is returned — an admin's own view of supplier finances is a separate `admin`-module endpoint, not this one
**Traces**: contract (§3.8 "Auth — `supplier`, scoped to the caller's own … rows, unless stated otherwise")
**Check**: fetch_url

**Scenario**: An unknown query parameter on the revenue endpoint is rejected, not ignored
**Given**: A signed-in supplier
**When**: `GET /v1/supplier/revenue?foo=bar` is called
**Then**: `400 MALFORMED_REQUEST` is returned
**Traces**: contract (§2.5 "an unknown query parameter on a non-`data`-module endpoint")
**Check**: fetch_url

**Scenario**: A payout-history page size over the maximum is rejected, not clamped
**Given**: A signed-in supplier
**When**: `GET /v1/supplier/payouts?limit=101` is called
**Then**: `422 VALIDATION_FAILED` is returned and no `data` array is returned
**Traces**: contract (§2.4 "Over the max limit — rejected … never clamped")
**Check**: fetch_url
