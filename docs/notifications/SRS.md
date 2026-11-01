# SRS — Notifications

Module: `notifications`
Design: [View the approved design](http://localhost:9400)
Design system: `design/design-system.md`

## 1. Purpose

Sends Email and Zalo OA messages, and records an in-dashboard alert, for
booking confirmation, supplier/product approval or rejection, and booking
cancellation — backing `/admin/system`'s notifications table with real
delivery instead of static rows.

## 2. Actors

| Actor | Who they are | What they may do in this module |
|---|---|---|
| System | Other modules raising an event | Trigger a notification |
| Admin | Platform operator | Read the notification log on `/admin/system` |

## 3. Scope

**In scope**: Booking and approval notifications.

**Out of scope**: the `/admin/system` table layout — `site`/`admin` module;
deciding the policy/email-template text — `admin` module (Admin platform
settings and audit log).

## 4. Functional requirements

### 4.1 Booking and approval notifications

**Requirement NOTIF-001 — Log and send a notification per triggering event**

*As the* System, *I want to* send Email and Zalo OA messages and record an
in-dashboard alert whenever a booking is confirmed/cancelled or a
supplier/product is approved/rejected, *so that* the right person is told.

Behaviour:

1. Each of these events creates exactly one `notifications` row per channel
   attempted (Email, Zalo, in-dashboard), recording the event, channel,
   template used, and delivery status (sent/failed).
2. A delivery failure on one channel does not block the others — Email
   failing does not prevent the in-dashboard alert from being recorded.
3. The same booking/approval event is never notified twice for the same
   transition (no duplicate sends on a retry of the same state change).

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | A booking reaches `Confirmed` | The transition completes | A `notifications` row exists for that event with channel `Email` and a delivery status, and one for `Zalo`, and one in-dashboard |
| AC-2 | The Email provider is down | A booking is confirmed | The Email row records `failed`; the Zalo and in-dashboard rows still record their own outcome independently |
| AC-3 | The same confirmation event is processed twice (e.g. a retried webhook) | — | No duplicate notification rows are created for that same transition |
| AC-4 | A product is rejected with a reason | The rejection is saved | A notification row is created for that event, reaching the supplier |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Upstream failure | A channel's provider is unreachable | That channel's row records `failed`; other channels are unaffected (AC-2) |
| Conflict | Duplicate event delivery | De-duplicated (AC-3) |

**Data touched** — `notifications.event, channel, template, status`, created by this requirement.

## 5. Screens

| Screen | Section in the design | Functions it serves | States that must exist |
|---|---|---|---|
| System (`/admin/system`, notifications table) | System | NOTIF-001 | default |

## 6. Non-functional requirements

| Area | Requirement |
|---|---|
| Reliability | A failed channel never silently drops without a logged `failed` status |

## 7. Dependencies and assumptions

- **Depends on:** `data` module for `notifications`; `booking`, `payments`, `suppliers`, `admin` modules as the events' sources.
- **Depends on:** an email-sending account and a Zalo OA account/API key, requested separately from the stakeholder.

| Open question | Proposed default | Who decides |
|---|---|---|
| — | — | None open |

## 8. Traceability

| Plan item | Requirement ids | Test cases |
|---|---|---|
| Booking and approval notifications | NOTIF-001 | `test-cases/booking-and-approval-notifications.md` |
