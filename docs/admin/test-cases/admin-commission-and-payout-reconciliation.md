# Test cases — Admin commission and payout reconciliation

Module: `admin` · Requirement: ADMIN-005 · Screen: `/admin/finance`
(`AdminFinance.tsx`)

Contract endpoints exercised: `PATCH /v1/admin/commission` (3.9.13),
`PATCH /v1/admin/suppliers/{id}/commission` (3.9.14), `POST
/v1/admin/payouts/reconcile` (3.9.15), `GET /v1/admin/payouts` (3.9.16),
`POST /v1/admin/payouts/{id}/mark-paid` (3.9.17), read side of
`GET /v1/supplier/revenue` (3.8.10) for the cross-module AC-1 assertion.

Risk level: **high**. This function moves money figures (commission,
payout amounts) and gates what a supplier is told they are owed; a wrong
rate or a duplicated reconciliation run has a direct financial
consequence, so coverage goes deep on the arithmetic, the idempotency of
reconciliation, and the permission boundary — not just the happy path.

---

## Global commission rate

**Scenario**: Setting the global commission rate for the first time
**Given**: No commission rate is set (`settings` row "Global commission percent" has no value); signed in as `admin`
**When**: `PATCH /v1/admin/commission` is called with body `{ "rate": 10.0 }`
**Then**: `200` is returned with body `{ "rate": 10.0 }`; the `settings` row named "Global commission percent" now holds `10.0`
**Traces**: AC-1 (ADMIN-005 AC-1)
**Check**: fetch_url

**Scenario**: A new booking confirmed after the rate change reflects it in supplier revenue
**Given**: The global rate was just set to 10% (previous case); a supplier with no override has a booking confirmed after that change
**When**: `GET /v1/supplier/revenue` is called for that supplier
**Then**: `200` with `commission_rate: 0.10` and `commission` equal to `revenue * 0.10` for that supplier's confirmed bookings since the change
**Traces**: AC-1 (ADMIN-005 AC-1, cross-referencing SUPPLIERS-007 AC-1)
**Check**: fetch_url

**Scenario**: Commission rate set to exactly 0%
**Given**: Signed in as `admin`; no rate set yet
**When**: `PATCH /v1/admin/commission` is called with `{ "rate": 0 }`, then reconciliation is run for a period with confirmed bookings and no supplier override
**Then**: `200` on the rate change; the resulting payout row for that supplier has `commission: 0` and `net` equal to `gross`
**Traces**: Boundary row ("Commission rate set to 0%")
**Check**: fetch_url

**Scenario**: Commission rate rejected above the valid range
**Given**: Signed in as `admin`
**When**: `PATCH /v1/admin/commission` is called with `{ "rate": 150 }`
**Then**: `422 VALIDATION_FAILED`; the error body names the valid range (0–100); `settings` row is unchanged
**Traces**: Failure row ("Invalid input — Commission rate outside 0–100")
**Check**: fetch_url

**Scenario**: Commission rate rejected below the valid range
**Given**: Signed in as `admin`
**When**: `PATCH /v1/admin/commission` is called with `{ "rate": -5 }`
**Then**: `422 VALIDATION_FAILED`; the error body names the valid range (0–100); `settings` row is unchanged
**Traces**: Failure row ("Invalid input — Commission rate outside 0–100")
**Check**: fetch_url

**Scenario**: Commission rate rejected on a field the contract does not define
**Given**: Signed in as `admin`
**When**: `PATCH /v1/admin/commission` is called with `{ "rate": 10, "appliesTo": "tours" }`
**Then**: `400 MALFORMED_REQUEST` — the undefined `appliesTo` field is rejected, never silently ignored; `settings` row is unchanged
**Traces**: contract (PATCH /v1/admin/commission, §2.5 undefined-field rule)
**Check**: fetch_url

**Scenario**: A sub-admin without finance permission cannot set the global rate
**Given**: Signed in as a sub-admin with `permissions = 'moderation-only'`
**When**: `PATCH /v1/admin/commission` is called with `{ "rate": 12 }`
**Then**: `403 PERMISSION_DENIED`; `settings` row is unchanged
**Traces**: Failure row ("Not permitted — sub-admin without finance permission")
**Check**: fetch_url

**Scenario**: An unauthenticated caller cannot read or set the commission rate
**Given**: No session token sent
**When**: `PATCH /v1/admin/commission` is called with `{ "rate": 10 }`
**Then**: `401 UNAUTHENTICATED`
**Traces**: contract (PATCH /v1/admin/commission — admin-only auth)
**Check**: fetch_url

---

## Per-supplier commission override

**Scenario**: Setting a per-supplier override that differs from the global rate
**Given**: The global rate is 10%; supplier X has no override; signed in as `admin`
**When**: `PATCH /v1/admin/suppliers/{X's id}/commission` is called with `{ "rate": 15.0 }`
**Then**: `200` with the updated `suppliers` row showing `commission: 15.0`
**Traces**: AC-2 (ADMIN-005 AC-2, setup half)
**Check**: fetch_url

**Scenario**: Reconciliation uses the supplier's override, not the global rate
**Given**: Supplier X has an override of 15% (previous case); the global rate is 10%; supplier X has confirmed bookings in period `2026-11`
**When**: `POST /v1/admin/payouts/reconcile` is called with `{ "period": "2026-11" }`
**Then**: `201`; supplier X's payout row in the response has `commission` computed at 15% of its gross, not 10%
**Traces**: AC-2 (ADMIN-005 AC-2)
**Check**: fetch_url

**Scenario**: Clearing a per-supplier override falls back to the global rate
**Given**: Supplier X has an override of 15%; signed in as `admin`
**When**: `PATCH /v1/admin/suppliers/{X's id}/commission` is called with `{ "rate": null }`
**Then**: `200`; the `suppliers` row's `commission` is cleared (`NULL`); the next reconciliation for supplier X uses the global rate
**Traces**: contract (PATCH /v1/admin/suppliers/{id}/commission — null-clears-override rule)
**Check**: fetch_url

**Scenario**: Override rejected outside the valid range
**Given**: Signed in as `admin`; supplier X exists
**When**: `PATCH /v1/admin/suppliers/{X's id}/commission` is called with `{ "rate": 101 }`
**Then**: `422 VALIDATION_FAILED`; `suppliers.commission` for X is unchanged
**Traces**: contract (PATCH /v1/admin/suppliers/{id}/commission — 0–100 rule)
**Check**: fetch_url

**Scenario**: Override rejected for a supplier that does not exist
**Given**: Signed in as `admin`; no supplier with id `does-not-exist`
**When**: `PATCH /v1/admin/suppliers/does-not-exist/commission` is called with `{ "rate": 12 }`
**Then**: `404 NOT_FOUND`
**Traces**: contract (PATCH /v1/admin/suppliers/{id}/commission — not-found row)
**Check**: fetch_url

---

## Reconciliation

**Scenario**: Reconciliation creates one payout row per active supplier
**Given**: 3 suppliers have confirmed bookings in period `2026-10` and 2 do not; signed in as `admin`
**When**: `POST /v1/admin/payouts/reconcile` is called with `{ "period": "2026-10" }`
**Then**: `201` with exactly 3 payout entries in the response, one per supplier with activity; each entry's `gross` equals the sum of that supplier's confirmed bookings for the period, `commission` equals `gross` × that supplier's applicable rate (override or global), `net` equals `gross - commission`, and `status` is `Pending`
**Traces**: AC-3 (ADMIN-005 AC-3)
**Check**: fetch_url

**Scenario**: Re-running reconciliation for an already-reconciled period is rejected
**Given**: Reconciliation already ran for period `2026-10` (previous case)
**When**: `POST /v1/admin/payouts/reconcile` is called again with `{ "period": "2026-10" }`
**Then**: `409 CONFLICT`; no duplicate `payouts` rows are created for that period/supplier pair
**Traces**: contract (POST /v1/admin/payouts/reconcile — uq_payouts_supplier_period)
**Check**: fetch_url

**Scenario**: A later commission change does not alter an already-reconciled period
**Given**: Reconciliation ran for period `2026-10` while the global rate was 10% (producing payout rows at that rate)
**When**: The global rate is changed to 20% via `PATCH /v1/admin/commission`, then `GET /v1/admin/payouts?period=2026-10` is called
**Then**: The `2026-10` payout rows still show `commission`/`net` computed at 10%, unchanged by the later rate change
**Traces**: AC-4 (ADMIN-005 AC-4)
**Check**: fetch_url

**Scenario**: Reconciliation rejects a malformed period value
**Given**: Signed in as `admin`
**When**: `POST /v1/admin/payouts/reconcile` is called with `{ "period": "October 2026" }`
**Then**: `422 VALIDATION_FAILED`
**Traces**: contract (POST /v1/admin/payouts/reconcile — period shape rule)
**Check**: fetch_url

**Scenario**: Reconciliation rejects a field the contract does not define
**Given**: Signed in as `admin`
**When**: `POST /v1/admin/payouts/reconcile` is called with `{ "period": "2026-12", "force": true }`
**Then**: `400 MALFORMED_REQUEST`; no `payouts` rows are created
**Traces**: contract (POST /v1/admin/payouts/reconcile, §2.5 undefined-field rule)
**Check**: fetch_url

**Scenario**: A sub-admin without finance permission cannot run reconciliation
**Given**: Signed in as a sub-admin with `permissions = 'content-only'`
**When**: `POST /v1/admin/payouts/reconcile` is called with `{ "period": "2026-12" }`
**Then**: `403 PERMISSION_DENIED`; no `payouts` rows are created
**Traces**: Failure row ("Not permitted — sub-admin without finance permission")
**Check**: fetch_url

**Scenario**: A database failure during reconciliation surfaces as a 500, not a silent success
**Given**: The `payouts` table write fails at the data layer (e.g. a store failure arranged by renaming the table or failing the insert) while the backend process itself is up
**When**: `POST /v1/admin/payouts/reconcile` is called with a valid, previously-unreconciled `{ "period": "2027-01" }`
**Then**: `500 INTERNAL`; no partial `payouts` rows are left for that period
**Traces**: contract (§2.3 — failed query/insert maps to INTERNAL, never silently dropped)
**Check**: fetch_url

**Scenario**: Reconciliation is unavailable when the database itself refuses the connection
**Given**: The database is made unreachable (connection refused) while the backend process keeps running
**When**: `POST /v1/admin/payouts/reconcile` is called with `{ "period": "2027-02" }`
**Then**: `503 UNAVAILABLE`
**Traces**: contract (§2.3 — a refused dependency connection maps to UNAVAILABLE, not INTERNAL)
**Check**: fetch_url

---

## Payout history, platform revenue and marking paid

**Scenario**: Listing payouts filtered by period
**Given**: Payout rows exist for periods `2026-09` and `2026-10`; signed in as `admin`
**When**: `GET /v1/admin/payouts?period=2026-10` is called
**Then**: `200` with only `2026-10` payout rows returned, cursor-paginated
**Traces**: contract (GET /v1/admin/payouts)
**Check**: fetch_url

**Scenario**: Platform revenue for a period is the sum of the commission column
**Given**: Period `2026-10` has 3 payout rows with commission `100,000`, `150,000` and `50,000`
**When**: `/admin/finance` is loaded for an admin, filtered/scoped to that period
**Then**: The page's "Platform revenue" figure reads `300,000` — the sum of those three commission values, not the sum of gross or net
**Traces**: ADMIN-005.4 (requirement text, "Platform revenue for a period is the sum of the commission column")
**Check**: render_url

**Scenario**: Marking a pending payout as paid
**Given**: A payout row with `status = 'Pending'`; signed in as `admin`
**When**: `POST /v1/admin/payouts/{that id}/mark-paid` is called
**Then**: `200`; the row's `status` becomes `Paid` and `paid_on` is set to today's date
**Traces**: contract (POST /v1/admin/payouts/{id}/mark-paid)
**Check**: fetch_url

**Scenario**: Marking a non-existent payout as paid is rejected
**Given**: No payout row with id `does-not-exist`; signed in as `admin`
**When**: `POST /v1/admin/payouts/does-not-exist/mark-paid` is called
**Then**: `404 NOT_FOUND`
**Traces**: contract (POST /v1/admin/payouts/{id}/mark-paid — not-found row)
**Check**: fetch_url

**Scenario**: A sub-admin without finance permission cannot list payouts or mark one paid
**Given**: Signed in as a sub-admin with `permissions = 'users-only'`
**When**: `GET /v1/admin/payouts` is called, then `POST /v1/admin/payouts/{an existing id}/mark-paid` is called
**Then**: Both calls return `403 PERMISSION_DENIED`; the payout row's `status` is unchanged
**Traces**: Failure row ("Not permitted — sub-admin without finance permission")
**Check**: fetch_url

---

## UI interaction on `/admin/finance`

**Scenario**: Submitting the commission form with a valid rate updates the page
**Given**: Signed in as `admin`, viewing `/admin/finance`, "Global rate, %" field empty
**When**: `10` is typed into the `#rate` field and "Save commission" is clicked
**Then**: The field's value reads `10` after submit, and the "Platform revenue" stat and the Commission/Payout columns in the reconciliation table update to reflect a 10% rate on the visible payout rows
**Traces**: AC-1 (ADMIN-005 AC-1)
**Check**: interact_page

**Scenario**: Submitting the commission form with an out-of-range value shows an inline error and keeps the typed value
**Given**: Signed in as `admin`, viewing `/admin/finance`
**When**: `150` is typed into the `#rate` field and "Save commission" is clicked
**Then**: An inline error naming the valid range (0–100) is shown next to the field; the field still shows `150` (the input is not cleared); no commission value is saved
**Traces**: Failure row ("Invalid input — Commission rate outside 0–100")
**Check**: interact_page

**Scenario**: Selecting a supplier override from the dropdown and saving applies to that supplier only
**Given**: Signed in as `admin`, viewing `/admin/finance`, global rate already 10%
**When**: "Cửa Lò Beach Stays" is selected in the "Override for one supplier" field, `15` is typed as its rate, and "Save commission" is clicked
**Then**: Only that supplier's row in the reconciliation table reflects a 15% commission; every other supplier's row still reflects the 10% global rate
**Traces**: AC-2 (ADMIN-005 AC-2)
**Check**: interact_page

**Scenario**: Clicking "Mark paid" on a pending payout updates its status in the table
**Given**: Signed in as `admin`, viewing `/admin/finance`, a payout row showing status "Pending" (or the design's current placeholder status) for a closed period
**When**: "Mark paid" is clicked for that row
**Then**: That row's status badge changes to "Paid" without a full page reload; other rows' statuses are unchanged
**Traces**: contract (POST /v1/admin/payouts/{id}/mark-paid)
**Check**: interact_page
