
# Story — Admin supplier and product approval queue

Module: `admin` · Requirement: ADMIN-001

## User story

As an **Admin**, I want to review pending supplier profiles and pending
products in one queue and approve them, reject them with a required
reason, or request edits, so that only reviewed suppliers and products
reach the storefront.

## Scope

**In scope**

- `/admin/queue` screen: two lists — `suppliers` rows with
  `verified = false`, and `products` rows with `status = 'pending'`.
- Approve action on a supplier row → `suppliers.verified = true`.
- Approve action on a product row → `products.status = 'approved'`.
- Reject action on either, requiring a non-empty reason; the reason is
  stored on that row and the row's queue counterpart (product) moves to
  `status = 'rejected'`. A rejected supplier stays `verified = false`
  with the reason recorded.
- "Request edits" on a product: reuses the same reject action and the
  same required-reason field; the product's status becomes `rejected`
  the same way — the only difference is which button label the admin
  clicked and the wording used in the reason/notice shown to the
  supplier (e.g. prefixed "Edits requested:"). This follows
  `decision` in `docs/admin/SRS.md` §7: the design has one "Reject with
  this reason" control, not two states.
- Empty state for the queue when nothing is pending.
- Enforcing `ADMIN-003`'s permission scoping: a sub-admin without
  moderation permission cannot reach this screen's actions (checked via
  the existing `RequireRole`/permissions pattern — this story wires the
  check, not the permission system itself).
- Concurrency guard: the second of two near-simultaneous decisions on
  the same row either (a) sees the row already decided and is told so,
  or (b) the update is a no-op because the row no longer matches the
  `pending`/`verified = false` precondition the write requires.

**Out of scope**

- The supplier's own submission UI for a profile or product —
  `suppliers` module (`SUPPLIERS-001`/`SUPPLIERS-002`); this story only
  consumes what is already submitted.
- The supplier-facing screen that shows the reason back to the
  submitter — that screen belongs to the `suppliers` module; this story
  is only responsible for the reason being stored so that screen can
  read it.
- Sending any notification that an approval/rejection triggers —
  `notifications` module.
- The audit-log row this action should create — `ADMIN-007`, a separate
  plan item (Admin platform settings and audit log); this story does not
  write to `audit`.
- Review moderation, user management, bookings/refunds, finance,
  content — each is its own plan item under this module's SRS.

## UI scope

Screen: `/admin/queue` (`AdminQueue.tsx` in the design), inside
`DashboardLayout`. States per the design system/SRS §5: **default**
(two lists, pending suppliers and pending products, each row with
Approve / Reject / Request edits actions) and **empty** (per-list empty
message when nothing is pending in that list). Reject and Request
edits open the same reason input (inline or a small panel — no modal
layer exists in the design system, §1.5) and block submission until the
reason is non-empty, per `--field-line`/Input states (§2.3). Rows read
from `DataTable`/badge components already in the design system (§2.9,
§2.10) — `Badge` tones never carry rejection/approval by colour, only by
mark shape, per §4's recorded deviation.

## Acceptance criteria

- **SC-1 [ADMIN-001 AC-1]:** Given a supplier row with `verified =
  false` on `/admin/queue`, when the admin clicks Approve, then
  `suppliers.verified` becomes `true` and the row leaves the pending
  list.
- **SC-2 [ADMIN-001 AC-2]:** Given a product row with `status =
  'pending'` on `/admin/queue`, when the admin clicks Approve, then
  `products.status` becomes `approved` and the row leaves the pending
  list.
- **SC-3 [ADMIN-001 AC-3]:** Given a product row with `status =
  'pending'`, when the admin rejects it with reason "Photos too dark",
  then `products.status` becomes `rejected` and that exact reason string
  is stored on the row, retrievable by the `suppliers` module's own
  screen.
- **SC-4 [ADMIN-001 AC-3]:** Given a supplier row with `verified =
  false`, when the admin rejects it with a reason, then `verified`
  stays `false`, the reason is stored on the supplier row, and it is
  retrievable the same way.
- **SC-5 [ADMIN-001 AC-4]:** Given the reject or request-edits panel is
  open, when the admin submits with an empty reason, then the submit is
  rejected client- and server-side, no status changes, and an inline
  error is shown.
- **SC-6 [ADMIN-001 behaviour §4.1.4]:** Given a pending product, when
  the admin clicks "Request edits" and enters a reason, then
  `products.status` becomes `rejected`, the reason is stored prefixed to
  distinguish it from an outright rejection in its wording only (no
  separate status value), per the recorded default.
- **SC-7 [ADMIN-001 permission row]:** Given a sub-admin signed in
  without moderation permission, when they call the approve/reject
  endpoint directly, then the request is rejected the same way
  `RequireRole` rejects a disallowed page.
- **SC-8 [ADMIN-001 boundary row]:** Given a product already decided by
  one admin, when a second admin's approve/reject request for the same
  row arrives afterward, then that second request fails with a
  conflict/already-decided response rather than silently overwriting
  the first decision.
- **SC-9 [ADMIN-001 §5 empty state]:** Given no suppliers awaiting
  verification and no products pending, when the admin opens
  `/admin/queue`, then both lists show their empty-state message instead
  of an empty table shell.

## Dependencies

- `auth` module: signed-in admin/sub-admin session and `permissions`
  value (ADMIN-003) — this story's permission check assumes that
  mechanism exists; if it lands after this story, the check is a
  placeholder guard until it does.
- `data` module: `suppliers` and `products` tables/read-write access.
- `suppliers` module: produces the rows this queue lists (a supplier
  profile submission, a product submission) — this story can be built
  and demoed against seeded/fixture rows if that module has not shipped
  yet, but the end-to-end flow needs both.
- Design: `AdminQueue.tsx`, `DashboardLayout`, `DataTable`, `Badge`,
  Input/Textarea components already in `design/design-system.md`.
