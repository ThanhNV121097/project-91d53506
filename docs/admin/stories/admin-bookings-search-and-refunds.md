# Story — Admin bookings search and refunds

Module: `admin`
Requirement: ADMIN-004 (`docs/admin/SRS.md` §4.4)

## User story

As an Admin, I want to see every booking, search by its exact code, and process a manual refund against a complaint, so that I can resolve disputes the automatic booking flow does not handle.

## Scope

**In scope**

- `/admin/bookings` screen: `DataTable` listing every `bookings` row.
- Filter by status and by date range.
- Search by booking code, product name, or supplier name (free-text).
- "Refund manually" action against a `complaints` row, which sets the
  matching booking's `status` to `Refunded` and the complaint's `status`
  to resolved/refunded.
- Permission scoping: a sub-admin without finance/dispute permission
  cannot reach this screen or its refund action.

**Out of scope**

- The buyer's own cancellation/rescheduling request that creates the
  complaint in the first place — `booking` module (BOOKING-004). This
  story only resolves a complaint already filed.
- Automatic refunds triggered by the booking/payment state machine
  (e.g. a supplier-initiated cancellation refund) — `booking`/`payments`
  modules. This story's refund is the manual, admin-triggered one only.
- Sending the email/Zalo notification that a refund triggers —
  `notifications` module.
- Commission/payout recalculation after a refund — `ADMIN-005`
  (Admin commission and payout reconciliation); a refunded booking's
  exclusion from the next payout run is that story's concern, not this
  one's.
- Viewing/editing a complaint's own detail beyond the one "Refund
  manually" action (e.g. complaint notes, internal comments) — not
  specified anywhere in the SRS for this module; not built.

## UI scope

Screen: `/admin/bookings` (`AdminBookings.tsx`, per the design's
`DataTable` + `TableFilters`/`SearchBox`/`DateRange` components, §2.10/§2.11
of the design system). Reached only through `DashboardLayout`'s nav, gated
by `RequireRole` to Admin / a sub-admin whose `permissions` grants this
section (ADMIN-003).

States required:

- **Default**: table of bookings, paginated, sortable columns (code,
  product, supplier, date, status), filter bar (status select, date
  range) and a search box above it.
- **Search result**: table filtered to the matching booking(s); no
  results renders the `DataTable` empty state with a plain message
  ("Nothing matches that search.").
- **Refund action**: a row with an associated open complaint shows a
  "Refund manually" control; clicking it updates the row's status badge
  to `Refunded` (Badge §2.9, `bad`/`neutral` tone per the design's
  no-colour-semantics rule) without a page reload.
- **Denied**: `RequireRole`'s denied state for a sub-admin without the
  needed permission, or for any non-admin role.

No modal/toast exists in this design system (§1.5) — the refund action's
confirmation, if one is wanted, is an inline state change on the row
itself, not a dialog.

## Acceptance criteria

- SC-1 [ADMIN-004 AC-1]: Given a booking with code `NA-7X42K9` exists among many bookings, when the admin searches for `NA-7X42K9`, then exactly that one booking is returned in the table.
- SC-2 [ADMIN-004 AC-2]: Given a complaint referencing booking `NA-7X42K9`, when the admin clicks "Refund manually" against that complaint, then `bookings.status` for `NA-7X42K9` becomes `Refunded` and the complaint's `status` reflects the resolution (resolved/refunded).
- SC-3 [ADMIN-004 AC-3]: Given a search code that matches no booking, when the admin searches it, then the table shows no results and no error.
- SC-4 [ADMIN-004 — not permitted]: Given a sub-admin whose `permissions` value does not grant finance/dispute access, when they attempt to view `/admin/bookings` or trigger a manual refund (including a direct API call), then the action is rejected and no data is returned/changed.
- SC-5 [ADMIN-004 — filter]: Given bookings across several statuses and dates, when the admin filters by status and/or a date range, then the table shows only bookings matching that filter.
- SC-6 [ADMIN-007 AC-2, derived]: Given the admin processes a manual refund (SC-2), when the action completes, then one `audit` row is created recording that admin, the action "refunded", and the booking as the target — per ADMIN-007's rule that every state-changing admin write produces exactly one audit row.

## Dependencies

- `auth` module: signed-in admin/sub-admin session and `permissions`
  value (ADMIN-003), already a dependency of this module per the SRS.
- `data` module: `bookings` and `complaints` tables must exist and be
  readable/writable via the backend's data layer.
- `booking` module (BOOKING-004): a complaint row must already exist to
  have something to refund against — this story does not create
  complaints, only acts on them.
- `admin` module's own ADMIN-007 (audit log): the audit row this story's
  SC-6 requires assumes that requirement's audit-write mechanism exists;
  if it lands after this story, this story's backend still writes the
  audit row itself (the mechanism is "every write creates one row", not
  a shared library this story must wait on).

No blocking question — SC-6 follows directly from ADMIN-007's existing
rule, and the rest of the SRS resolves every other decision this story
needed.
