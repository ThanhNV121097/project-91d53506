
# Story — Admin platform settings and audit log

Module: `admin` · Requirement: ADMIN-007 · Screen: `/admin/system`

## User story

As an Admin, I want to set the platform's non-commission operating
defaults, edit the terms/conditions and booking-confirmation-email
template text, and see a read-only, newest-first log of every change
anyone has made on the platform, so that the platform has one place for
its shared defaults and one trustworthy record of who did what.

## In scope

- The four non-commission `settings` rows `/admin/system` lists under
  "Decisions waiting on you": manual/instant confirmation mode, default
  cancellation window, hold party-size ceiling, departure scope — each
  settable via its own input and readable back after a reload.
- The "Terms and conditions" and "Booking confirmation email" text
  fields on the same screen: each persists and reads back.
- The audit log table on `/admin/system`: lists `audit` rows
  newest-first, has no add/edit/delete control, and is fed only by other
  modules' writes (ADMIN-001 through ADMIN-006, and this story's own
  settings/template edits) — never by a direct admin entry.
- Permission scoping: only `permissions = 'full'` may write a setting or
  the template text; a sub-admin's own scoped permission grants read of
  the settings list (per the existing `/admin/settings` read contract)
  but never a write, and the audit log itself is `full`-admin-only per
  the SRS's screen list.
- Validation: an empty value submitted for a setting or a template field
  is rejected inline; nothing is saved.

## Out of scope

- Commission rate (`ADMIN-005`, `/admin/finance`) — a different
  requirement, different screen, already its own plan item.
- Review moderation, approval queue, user management, bookings/refunds,
  content/homepage management (`ADMIN-001`–`ADMIN-006`) — this story
  only *consumes* their writes as audit-log entries; it implements none
  of their own actions.
- Sending the email that uses the saved template, or applying the saved
  cancellation-window/confirmation-mode/hold-ceiling values inside the
  booking or notification flow — those are `notifications` and
  `booking` module concerns; this story only stores the text/values and
  makes them readable.
- The notifications list shown lower on `/admin/system` — read-only
  display already covered by the `data` module's read layer; no write
  path of its own in this story.
- Any UI redesign of `/admin/system` — the approved design's layout
  (`AdminSystem.tsx`) is built as-is; this story wires it to real data.

## UI scope

Screen: `/admin/system` (`AdminSystem.tsx`), already built as static UI
in "The site as designed" against mock data. This story's UI work is the
story's backend half replacing that mock: the three sections — settings
list, terms/template form, audit log table — read and write through the
real endpoints instead. No new screen, no new route. States: default
(rows/entries present) and empty (no settings rows yet, no audit rows
yet) per the SRS's screen table.

## Acceptance criteria

- SC-1 [ADMIN-007 AC-1]: Given a `settings` row named "Default
  cancellation window" with no value, when the admin sets it to "48
  hours" on `/admin/system` and the page is reloaded, then the field
  shows "48 hours", not the placeholder.
- SC-2 [ADMIN-007.1]: Given a `settings` row named "Manual or instant
  confirmation" with no value, when the admin sets it and reloads, then
  the saved value reads back unchanged.
- SC-3 [ADMIN-007.1]: Given a `settings` row named "Largest party a
  15-minute hold covers" with no value, when the admin sets it and
  reloads, then the saved value reads back unchanged.
- SC-4 [ADMIN-007.1]: Given a `settings` row named "Departure scope"
  with no value, when the admin sets it and reloads, then the saved
  value reads back unchanged.
- SC-5 [ADMIN-007 AC-3]: Given the "Booking confirmation email" template
  field empty, when the admin types text and clicks Save, then a
  subsequent read of that field returns the exact text submitted, and
  one `audit` row is created recording the edit.
- SC-6 [ADMIN-007.2]: Given the "Terms and conditions" field empty, when
  the admin types text and clicks Save, then a subsequent read of that
  field returns the exact text submitted.
- SC-7 [ADMIN-007 AC-1 failure row]: Given a settings field already
  holding a value, when it is cleared to empty and submitted, then an
  inline validation error is shown and the field's prior value is
  unchanged.
- SC-8 [ADMIN-007 AC-2]: Given an admin approves a product (ADMIN-001
  AC-2) or performs any other state-changing write in this module, when
  that write completes, then exactly one new `audit` row appears on
  `/admin/system` recording when, who, the action, and the target.
- SC-9 [Acceptance line, "lists entries newest-first"]: Given at least
  two audit rows of different ages, when `/admin/system`'s audit table
  is viewed, then the newer row appears above the older row.
- SC-10 [Acceptance line, "no add/edit/delete control"]: Given the audit
  log table on `/admin/system`, when it is inspected, then no
  Add/Edit/Delete control exists anywhere inside it, and no API route
  exists to create, edit or delete an `audit` row directly (each such
  attempt returns 404/405, never 200/201).
- SC-11 [ADMIN-007 failure row, "Not permitted"]: Given a sub-admin
  whose `permissions` value is not `full`, when they attempt to write a
  setting or the template text, then the write is rejected
  (403 PERMISSION_DENIED); given the same sub-admin reads the settings
  list, the read succeeds.
- SC-12 [SRS §5 screen table, admin-only]: Given a sub-admin (any
  restricted `permissions` value) or a Buyer/Supplier session, when
  `GET /v1/admin/audit` is called, then it is rejected
  (403 PERMISSION_DENIED) — the audit log itself is `full`-admin-only.

## Dependencies

- `auth` module: the signed-in admin/sub-admin session and its
  `permissions` value — required for every permission check above.
- `data` module: the `settings` and `audit` tables/collections this
  story reads and writes.
- Consumes, does not implement: every other `admin` plan item's writes
  (ADMIN-001–006) as the source of the audit rows SC-8/SC-9 verify —
  this story's own audit-row creation only has to prove itself through
  one such write (product approval, already built) plus its own
  settings/template edits.
- `docs/architecture/erd.md` / `services.md` for the `settings` and
  `audit` table shapes and the `/v1/admin/settings` and `/v1/admin/audit`
  endpoint contracts already referenced by the existing test cases.
