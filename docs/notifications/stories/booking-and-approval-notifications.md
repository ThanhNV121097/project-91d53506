# Story: Booking and approval notifications

Module: `notifications`
SRS: [docs/notifications/SRS.md](../SRS.md)

## User story

As the System, I want to send Email and Zalo OA messages and record an
in-dashboard alert whenever a booking is confirmed or cancelled, or a
supplier/product is approved or rejected, so that the right person is told
through every channel and the event is never lost even if one channel fails.

## Scope

**In scope**

- A `notifications` table and a Go package (`internal/notifications`) that
  other modules call to raise an event (booking confirmed, booking
  cancelled, supplier approved, supplier rejected, product approved,
  product rejected).
- One row written per channel attempted (Email, Zalo, in-dashboard) per
  event, each with its own `status` (`sent`/`failed`).
- Real Email sending via SMTP (`EMAIL_SMTP_*`, already declared in
  `code/backend/.env.example`) and real Zalo OA sending via
  `ZALO_OA_API_KEY` (already declared) — not simulated.
- Idempotency: the same booking/approval transition (identified by
  `event` + the entity id it concerns + the transition it represents) is
  never notified twice, including on a retried trigger.
- A failure on one channel is isolated: it does not stop the other
  channels' attempts or their own row from being written.
- A read endpoint (`GET /v1/notifications`) backing the `/admin/system`
  notifications table with real rows, paginated, newest first.

**Out of scope**

- The `/admin/system` page layout, table component and its other sections
  (policies, email templates, audit log) — `admin` module, already covered
  by "Admin platform settings and audit log".
- Deciding or editing the wording of each template (subject lines, body
  copy) — `admin` module owns template configuration; this story sends
  with a fixed, hardcoded template per event type so the pipe is real end
  to end, and a later admin story may make the body editable without
  changing this module's contract.
- The triggering transitions themselves (booking confirmed/cancelled,
  supplier/product approved/rejected) — those belong to `booking`,
  `suppliers` and `admin` respectively. This story only adds the single
  call each of those makes once its own transition is committed.
- Any additional channel beyond Email, Zalo OA and in-dashboard (e.g. SMS).
- Push/webhook delivery confirmation (read receipts) from Email or Zalo.

## UI scope

None new. `/admin/system`'s notifications table already exists as a
screen owned by the `admin` module (design: Section "System", `DataTable`
component, §2.10 of the design system). This story only makes the rows it
reads real instead of static — same table, same columns, no new screen or
state. `GET /v1/notifications` is consumed by that existing table.

## Acceptance criteria

- SC-1 [NOTIF-001 AC-1]: When a booking transitions to `Confirmed`, three
  `notifications` rows are created for that event — one with channel
  `Email`, one with channel `Zalo`, one `in-dashboard` — each carrying the
  event, the template used, and a delivery status.
- SC-2 [NOTIF-001 AC-2]: When the Email send fails (SMTP unreachable or
  rejects), that row's status is `failed` while the Zalo and in-dashboard
  rows for the same event are each written with their own outcome,
  independent of the Email failure.
- SC-3 [NOTIF-001 AC-3]: When the same booking-confirmed transition is
  submitted twice (e.g. a retried webhook calling the notify function
  again for the same booking id and the same target state), no additional
  `notifications` rows are created the second time.
- SC-4 [NOTIF-001 AC-4]: When a product is rejected with a reason, a
  notification row reaching the supplier is created for that event (Email,
  Zalo, in-dashboard, each per SC-1), via the same call path as booking
  events.
- SC-5 [NOTIF-001]: When a booking is cancelled, or a supplier/product is
  approved, the same three-row-per-event behaviour as SC-1 applies — one
  `internal/notifications` entry point serves all five event types listed
  in scope, not a booking-only one.
- SC-6 [NOTIF-001]: `GET /v1/notifications` returns the logged rows
  (event, channel, template, status, created_at) paginated newest first,
  for `/admin/system` to render.

## Dependencies

- Depends on: `booking` module's confirm/cancel transition code existing
  to call this module (stories "Booking creation with inventory hold" and
  "Buyer booking history and status"/cancellation story) — until that
  lands, this story's own test coverage triggers the entry point directly
  rather than through a live booking flow.
- Depends on: `suppliers` and `admin` modules' approve/reject transitions
  for the same reason (supplier verification story, admin approval queue
  story).
- Depends on: `data` module for the `notifications` table existing in the
  shared schema (per `docs/architecture/overview.md` §4's 17-table list).
- Depends on: `EMAIL_SMTP_*` and `ZALO_OA_API_KEY` credentials — already
  declared in `code/backend/.env.example` per the architecture overview;
  this story is the first to actually read and use them.
