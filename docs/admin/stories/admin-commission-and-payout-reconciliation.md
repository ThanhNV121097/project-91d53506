# Story — Admin commission and payout reconciliation

Module: `admin` · Requirement: ADMIN-005 · Screen: `/admin/finance`
(`AdminFinance.tsx`)

## User story

As an Admin, I want to set a global commission rate (with an optional
per-supplier override) and run payout reconciliation for a period, so
that suppliers are paid correctly and I can see platform revenue at a
glance.

## In scope

- `PATCH /v1/admin/commission` — set the global commission percentage
  (0–100), stored in the `settings` row "Global commission percent".
- `PATCH /v1/admin/suppliers/{id}/commission` — set or clear (`null`) a
  per-supplier override.
- `POST /v1/admin/payouts/reconcile` — create one `payouts` row per
  supplier with confirmed-booking activity in the given period, computed
  at that supplier's applicable rate (override, else global); rejects a
  second run for an already-reconciled period.
- `GET /v1/admin/payouts` — cursor-paginated list, filterable by
  `period`/`supplier_id`, backing both the reconciliation table and the
  "platform revenue" figure (sum of the `commission` column for the
  period in view).
- `POST /v1/admin/payouts/{id}/mark-paid` — flips a `Pending` payout to
  `Paid`, sets `paid_on`.
- `/admin/finance` UI: the commission form (global rate field, per-
  supplier override select), the three top stats (gross booked,
  platform revenue, owed to suppliers), and the payout reconciliation
  `DataTable` with its "Mark paid" row action — replacing
  `AdminFinance.tsx`'s current mock (hard-coded `formatPrice(0)` for
  platform revenue, no-op form submit, no-op "Mark paid" button) with
  real calls.
- Permission scoping: `full` and `finance-only` sub-admins only; every
  other sub-admin permission value is refused per ADMIN-003.
- Sub-admin denial covers all five endpoints above, not just the
  commission-setting ones.

## Out of scope

- A "run reconciliation" trigger control on the UI beyond what the test
  cases exercise — this story wires the table and the mark-paid action
  to the real endpoint; a dedicated "Run reconciliation for period X"
  button/period-picker is not in the current design (`AdminFinance.tsx`
  has no such control today) and is not added speculatively. If the
  stakeholder wants one, that is a follow-up `add_item`.
- Platform-wide revenue reporting beyond one period's sum (ADMIN-006's
  area, "Platform revenue reporting" in the plan, is a separate line).
- The supplier-side revenue figure that reads the same commission rate
  (SUPPLIERS-007) — this story only guarantees the rate is readable by
  that story; it does not touch `AdminFinance`'s supplier-facing
  counterpart.
- Any notification sent on mark-paid — `notifications` module.
- Audit-row creation triggered by these writes — covered by ADMIN-007,
  not re-implemented here (this story's writes must still produce the
  one `audit` row ADMIN-007 requires, but the audit mechanism itself is
  that story's own build).
- Approving/rejecting suppliers or products (ADMIN-001), review
  moderation (ADMIN-002), user locking (ADMIN-003), bookings search and
  refunds (ADMIN-004) — separate stories already in the plan.

## UI scope

Screen: `/admin/finance` (`AdminFinance.tsx`), states `default` only (per
the SRS screen table — no `empty` state is listed for this screen since
stats and the commission form always render; the payout table's own
`empty` state, "No payout period has closed yet.", is already built).

Touches:
- The commission form (`#rate` input, supplier override `<Select>`,
  "Save commission" submit) — currently a no-op `onSubmit`.
- The three `<Stat>` cards — "Platform revenue" currently hard-coded to
  `formatPrice(0)`.
- The `DataTable` reconciliation list and its "Mark paid" row action —
  currently a plain `<button>` with no handler.

No new screen, no new route.

## Acceptance criteria

- SC-1 [ADMIN-005 AC-1]: Submitting the "Global rate, %" field with a
  valid value (e.g. `10`) calls `PATCH /v1/admin/commission`; on success
  the field keeps that value, and bookings confirmed after this point
  compute commission at that rate (observed via `GET /v1/supplier/revenue`
  for an affected supplier).
- SC-2 [ADMIN-005 AC-2]: Setting a per-supplier override via the
  "Override for one supplier" select and a rate, then running
  reconciliation, produces that supplier's payout row at the override
  rate while every other supplier's row uses the global rate.
- SC-3 [ADMIN-005 AC-3]: `POST /v1/admin/payouts/reconcile` for a period
  with N suppliers having confirmed-booking activity creates exactly N
  `payouts` rows, each with `gross` = sum of that supplier's confirmed
  bookings in the period, `commission` = `gross × applicable rate`,
  `net` = `gross − commission`, `status = 'Pending'`.
- SC-4 [ADMIN-005 AC-4]: Changing the global commission rate after a
  period has been reconciled leaves that period's existing `payouts`
  rows (`commission`, `net`) unchanged — verified by re-reading via
  `GET /v1/admin/payouts?period=...` after the rate change.
- SC-5 [ADMIN-005 — boundary, rate = 0%]: Setting the global rate to `0`
  and reconciling a period yields payout rows with `commission: 0` and
  `net == gross`.
- SC-6 [ADMIN-005 — invalid input]: `PATCH /v1/admin/commission` or
  `PATCH /v1/admin/suppliers/{id}/commission` with `rate` outside 0–100
  returns `422 VALIDATION_FAILED` naming the valid range; no `settings`
  or `suppliers` row changes, and the UI form shows an inline error
  while keeping the typed value.
- SC-7 [ADMIN-005 — re-run rejected]: `POST /v1/admin/payouts/reconcile`
  called a second time for an already-reconciled period returns
  `409 CONFLICT` and creates no duplicate `payouts` rows.
- SC-8 [ADMIN-005.4]: The "Platform revenue" stat on `/admin/finance`,
  scoped to the period in view, equals the sum of the `commission`
  column across that period's `payouts` rows — never the sum of `gross`
  or `net`.
- SC-9 [ADMIN-005 — mark paid]: Clicking "Mark paid" on a `Pending`
  payout row calls `POST /v1/admin/payouts/{id}/mark-paid`; on success
  that row's status badge updates to "Paid" in place (no full reload)
  and `paid_on` is set; marking an already-`Paid` or non-existent payout
  returns `409 CONFLICT` / `404 NOT_FOUND` respectively.
- SC-10 [ADMIN-005 — permission]: A sub-admin whose `permissions` value
  is not `full` or `finance-only` receives `403 PERMISSION_DENIED` from
  every one of the five endpoints in scope, and the `/admin/finance`
  page itself is unreachable for that sub-admin per ADMIN-003 AC-3's
  nav/route scoping.
- SC-11 [ADMIN-005 — contract hygiene]: Any request body carrying a
  field the contract does not define (e.g. `appliesTo` on the commission
  PATCH, `force` on reconcile) is rejected `400 MALFORMED_REQUEST`, never
  silently ignored.

## Dependencies

- `auth` module: signed-in admin/sub-admin session and `permissions`
  value (ADMIN-003) — this story assumes that session/permission check
  exists and is enforceable by middleware.
- `data`/schema: `settings`, `suppliers.commission`, `payouts`, and the
  `bookings` rows reconciliation sums over — already defined in
  `docs/architecture/erd.md`.
- `docs/architecture/services.md` §3.9.13–3.9.17 — the five endpoint
  contracts this story implements; already written, not redesigned here.
- Reads (not writes) `GET /v1/supplier/revenue` (3.8.10) only for SC-1's
  cross-module observation — the Supplier revenue story owns that
  endpoint's own implementation.
