# Test cases — Booking and approval notifications

Module: `notifications` · Requirement: NOTIF-001
Contract: internal `notify.Raise(event, payload)` fan-out (§3.7, §4), read
endpoint `GET /v1/admin/notifications` (§3.7.1), callers `POST
/v1/payments/vnpay/ipn` (§3.6.3), hold-expiry sweep, `POST
/v1/admin/products/{id}/approve`, `POST /v1/admin/products/{id}/reject`
(§3.9.4/3.9.5), `POST /v1/admin/suppliers/{id}/reject` (§3.9.3).

No story plan was supplied for this plan item; per process, NOTIF-001's own
AC-1 to AC-4 plus its failure/boundary table are the list this file covers,
together with the service contract's rules for `GET
/v1/admin/notifications` (§2.2 permissions, §2.3 error catalog, §2.4
pagination) and the ERD's `uq_notifications_event_channel` de-dup
constraint (§3.18).

Risk assigned: **medium-high**. Nothing here is user-facing money movement
directly, but a silently-dropped notification (AC-2) or a duplicate send
(AC-3) both read as "the platform told the wrong story" to a buyer or
supplier, so the per-channel independence and the de-dup guard get as much
coverage as the happy path.

---

**Scenario**: Booking confirmation raises one row per channel
**Given**: A booking `NA-5QJ81M` in status `Awaiting Payment`, signed in as an admin with `full` permissions
**When**: The booking transitions to `Confirmed` (via `POST /v1/payments/vnpay/ipn` with a verified success signal for that booking), then `GET /v1/admin/notifications` is called
**Then**: `200` lists exactly three rows for event `"booking.confirmed:NA-5QJ81M"` — one `channel: "Email"`, one `channel: "Zalo"`, one `channel: "Dashboard"` — each with a `status` of `sent` or `failed` and a `template` value
**Traces**: SC/AC-1 (NOTIF-001 AC-1)
**Check**: fetch_url

---

**Scenario**: Email provider down still records Zalo and Dashboard independently
**Given**: The SMTP provider is made unreachable (its configured endpoint refuses connections) while the backend stays up; a booking `NA-6K2P03` in status `Awaiting Payment`
**When**: The booking transitions to `Confirmed`, then `GET /v1/admin/notifications` is called
**Then**: `200` lists a row for event `"booking.confirmed:NA-6K2P03"` with `channel: "Email"` and `status: "failed"`, and separate rows for `channel: "Zalo"` and `channel: "Dashboard"` each with `status: "sent"` — the Email failure does not change the other two channels' status
**Traces**: SC/AC-2 (NOTIF-001 AC-2)
**Check**: fetch_url

---

**Scenario**: A retried confirmation signal does not duplicate notification rows
**Given**: Booking `NA-5QJ81M` already transitioned to `Confirmed` and its three notification rows already recorded (per the first scenario)
**When**: A duplicate confirmation signal for the same booking arrives again (e.g. a replayed VNPay IPN with `vnp_ResponseCode = "00"` on the already-`succeeded` payment), then `GET /v1/admin/notifications` is called
**Then**: `200` still lists exactly three rows total for event `"booking.confirmed:NA-5QJ81M"` (one per channel) — no fourth, fifth or sixth row is added
**Traces**: SC/AC-3 (NOTIF-001 AC-3)
**Check**: fetch_url

---

**Scenario**: A product rejected with a reason notifies the supplier
**Given**: A `products` row with `status: "pending"` owned by supplier `S-01`, signed in as an admin with `full` permissions
**When**: `POST /v1/admin/products/{id}/reject` is called with `{ "reason": "Photos too dark" }`, then `GET /v1/admin/notifications` is called
**Then**: `200` lists a row for event `"product.rejected:<product-id>"` with `channel: "Email"` (or `"Zalo"`) and a `status` of `sent`/`failed`, and a row with `channel: "Dashboard"` — all reaching the event created by this rejection
**Traces**: SC/AC-4 (NOTIF-001 AC-4)
**Check**: fetch_url

---

**Scenario**: A product approval also raises its own notification event
**Given**: A `products` row with `status: "pending"`, signed in as an admin with `full` permissions
**When**: `POST /v1/admin/products/{id}/approve` is called, then `GET /v1/admin/notifications` is called
**Then**: `200` lists three rows (Email, Zalo, Dashboard) for event `"product.approved:<product-id>"`, each with a recorded `status`
**Traces**: NOTIF-001.1 (behaviour — "a supplier/product is approved/rejected" triggers the same logging rule as AC-4's rejection case)
**Check**: fetch_url

---

**Scenario**: A booking cancelled by hold expiry raises a notification event
**Given**: A booking created more than 15 minutes ago, still `Awaiting Payment`, past `held_until`
**When**: The hold-expiry sweep runs and sets that booking to `Cancelled`, then `GET /v1/admin/notifications` is called
**Then**: `200` lists rows for an event naming that booking's cancellation (e.g. `"booking.cancelled:<booking-id>"`), one per channel, each with a recorded `status`
**Traces**: NOTIF-001.1 (behaviour — "a booking is confirmed/cancelled" triggers one logged notification per channel)
**Check**: fetch_url

---

**Scenario**: The failed channel's row is never silently missing
**Given**: Both the SMTP provider and the Zalo OA API are made unreachable while the backend stays up; a booking `NA-9Q1X77` in status `Awaiting Payment`
**When**: The booking transitions to `Confirmed`, then `GET /v1/admin/notifications` is called
**Then**: `200` still lists exactly three rows for event `"booking.confirmed:NA-9Q1X77"` — `channel: "Email"` and `channel: "Zalo"` both `status: "failed"`, `channel: "Dashboard"` `status: "sent"` — no channel's row is absent from the response
**Traces**: Non-functional reliability row ("A failed channel never silently drops without a logged `failed` status")
**Check**: fetch_url

---

**Scenario**: Admin reads the notification log on `/admin/system`
**Given**: An admin signed in with `full` permissions; at least one notification row exists from a prior confirmed booking
**When**: The admin opens `/admin/system`
**Then**: The notifications table on the page shows a row whose event, channel and status match what `GET /v1/admin/notifications` returned for that booking
**Traces**: SC/AC-1 (NOTIF-001 AC-1, screen requirement §5)
**Check**: render_url

---

**Scenario**: Listing notifications is denied to a sub-admin without the right permission
**Given**: A signed-in sub-admin whose `permissions` value is `finance-only`
**When**: `GET /v1/admin/notifications` is sent authenticated as that sub-admin
**Then**: `403` is returned with `error.code = "PERMISSION_DENIED"`
**Traces**: Contract §3.7.1 (permissions: `full`, `content-only`)
**Check**: fetch_url

---

**Scenario**: An unauthenticated request to list notifications is rejected
**Given**: No session token or cookie is sent
**When**: `GET /v1/admin/notifications` is sent with no `Authorization` header and no `session` cookie
**Then**: `401` is returned with `error.code = "UNAUTHENTICATED"`
**Traces**: Contract §2.2/§2.3
**Check**: fetch_url

---

**Scenario**: A buyer or supplier token is denied reading the notification log
**Given**: A session token resolving to a `buyer` row (or a `supplier` row)
**When**: `GET /v1/admin/notifications` is sent with that token
**Then**: `403` is returned with `error.code = "PERMISSION_DENIED"`
**Traces**: Contract §3.7.1 (Auth: admin with `full`/`content-only`), RBAC
**Check**: fetch_url

---

**Scenario**: A request body field the contract does not define is rejected
**Given**: An admin signed in with `full` permissions
**When**: `GET /v1/admin/notifications` is sent with a JSON body containing a field the contract does not define, e.g. `{"foo":"bar"}`
**Then**: `400` is returned with `error.code = "MALFORMED_REQUEST"` — the request is rejected, not silently processed with the extra field dropped
**Traces**: Contract (§2.3 error catalog, `MALFORMED_REQUEST`)
**Check**: fetch_url

---

**Scenario**: An undefined query parameter on the notifications list is rejected
**Given**: An admin signed in with `full` permissions
**When**: `GET /v1/admin/notifications?event_type=booking.confirmed` is sent (the contract defines only `limit` and `cursor` as query parameters)
**Then**: `400` is returned with `error.code = "MALFORMED_REQUEST"`
**Traces**: Contract §2.3/§3.7.1 (query parameters: `limit`, `cursor` only)
**Check**: fetch_url

---

**Scenario**: A database failure on the notifications log read is reported as an internal error
**Given**: The `notifications` table/query is made to fail (e.g. a renamed table) while the backend process stays up; an admin signed in with `full` permissions
**When**: `GET /v1/admin/notifications` is requested
**Then**: `500` is returned with `error.code = "INTERNAL"`
**Traces**: Contract (§2.3 error catalog, `INTERNAL`)
**Check**: fetch_url

---

**Scenario**: Database unreachable on the notifications log read is reported as unavailable
**Given**: The database is made to refuse connections while the backend process stays up (`set_db_available` off); an admin signed in with `full` permissions
**When**: `GET /v1/admin/notifications` is requested
**Then**: `503` is returned with `error.code = "UNAVAILABLE"`
**Traces**: Contract (§2.3 error catalog, `UNAVAILABLE`)
**Check**: fetch_url

---

**Scenario**: Notifications list is sorted newest first and paginates by cursor
**Given**: An admin signed in with `full` permissions; more notification rows exist than one page's `limit`
**When**: `GET /v1/admin/notifications?limit=2` is called, then the returned `next_cursor` is used for a second call
**Then**: The first call's two rows are sorted by `created_at` descending, `has_more: true`, and the second call returns the next rows in the same descending order with no row repeated between the two calls
**Traces**: Contract §2.4 (cursor pagination), §3.7.1 ("sorted `created_at DESC`")
**Check**: fetch_url
