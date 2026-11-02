## 3.7 Internal fan-out contract — `notify.Raise(event, payload)` (NOTIF-001)

**Not an HTTP endpoint.** This is the internal Go function other modules'
handlers call, in-process, right after the state change they are
reporting commits — never before, so a notification is never raised for
a transition that then rolls back. Callers today:

- `POST /v1/payments/vnpay/ipn` (§3.6.3), on a booking reaching `Confirmed`
- the hold-expiry sweep, on a booking reaching `Cancelled`
- `POST /v1/admin/suppliers/{id}/approve` / `POST
  /v1/admin/suppliers/{id}/reject` (§3.9.2/§3.9.3)
- `POST /v1/admin/products/{id}/approve` / `POST
  /v1/admin/products/{id}/reject` (§3.9.4/§3.9.5)

**Signature** — `notify.Raise(ctx, event string, template string)`, where
`event` already encodes the specific instance of the transition (e.g.
`"booking.confirmed:NA-5QJ81M"`, `"product.rejected:<product-id>"`) —
the same string every caller above builds from its own row's `code`/`id`,
so two different transitions on the same booking/product never collide
on the uniqueness guard below, and two deliveries of the *same*
transition always do.

**Behaviour** — for each of the three channels `Email`, `Zalo`,
`Dashboard`, in any order, independently:

1. Attempt the insert:
   ```sql
   INSERT INTO notifications (event, channel, template, status)
   VALUES ($event, $channel, $template, 'pending')
   ON CONFLICT ON CONSTRAINT uq_notifications_event_channel DO NOTHING
   RETURNING id
   ```
   A conflict (no row returned) means this exact event/channel pair was
   already notified by an earlier call — `Raise` returns for that channel
   without sending anything a second time (NOTIF-001 AC-3). This is the
   row-level de-dup; no application-side "have I seen this event" cache
   is needed or added.
2. If a row was inserted, attempt the channel's own delivery
   (`EMAIL_SMTP_*` for `Email`, `ZALO_OA_API_KEY` for `Zalo`; `Dashboard`
   always succeeds — it *is* the row just inserted, read back by
   `/admin/system`) and `UPDATE notifications SET status = $result WHERE
   id = $id`, `$result` being `'sent'` or `'failed'`.
3. One channel's provider call failing (step 2) is caught and recorded as
   that channel's own `'failed'` status; it neither raises an error to
   the caller nor skips or retries the other two channels (NOTIF-001
   AC-2, reliability row). `Raise` itself never returns an error for a
   delivery failure — only for a database failure on the insert/update
   above, which the caller (already inside its own request handler)
   surfaces as that endpoint's own `500`/`503`, not a separate one here.

**Why `ON CONFLICT ... DO NOTHING` and not a `SELECT` then `INSERT`** — a
read-then-write has a race between two near-simultaneous calls for the
same event (e.g. a genuinely retried webhook arriving while the first
delivery is still in flight); the constraint is the single source of
truth for "already notified", enforced by Postgres itself rather than by
a lock this code would otherwise have to take.

---

## 3.7.1 `GET /v1/admin/notifications` — Read the notification log (NOTIF-001)

**Auth** — `admin` with `full` or `content-only` permissions (the
`/admin/system` screen this list backs is reachable by any sub-admin
permission per ADMIN-007's own "read-only" rule for that screen's other
tables — but this file's test cases scope this specific endpoint to
`full`/`content-only` only, so a `moderation-only` or `finance-only`
sub-admin reading `/admin/system` sees every other panel on that page
load except this one's rows, same partial-visibility pattern the page
already uses per-section).

**Request**

```
GET /v1/admin/notifications?limit=&cursor=
```

| Param | Type | Notes |
|---|---|---|
| `limit` | integer, 1–100 | Default 20; over the max is rejected, never clamped |
| `cursor` | string | Opaque, from a previous response's `next_cursor` |

No other query parameter, and no request body — either is `400
MALFORMED_REQUEST`.

**Behaviour**

```sql
SELECT id, event, channel, template, status, created_at
FROM notifications
ORDER BY created_at DESC, id DESC
```

cursor-paginated using `idx_notifications_created_at` (erd.md §3.18) —
the same cursor scheme as §3.8.8/§3.8.11/§3.9.22.

**Response** — `200`

```json
{
  "data": [
    {
      "id": "...",
      "event": "booking.confirmed:NA-5QJ81M",
      "channel": "Email",
      "template": "booking-confirmed",
      "status": "sent",
      "created_at": "..."
    }
  ],
  "has_more": false,
  "next_cursor": null
}
```

No `404` for an empty log — `200` with `data: []`, `has_more: false`.

**Errors**

| Status | `error.code` | When |
|---|---|---|
| 400 | `MALFORMED_REQUEST` | A query parameter outside `limit`/`cursor` is present, or a request body is sent |
| 401 | `UNAUTHENTICATED` | No valid session token |
| 403 | `PERMISSION_DENIED` | Signed in, but not role `admin`, or an `admin` whose `permissions` is set to something other than `content-only` (e.g. `finance-only`, `moderation-only`) |
| 422 | `VALIDATION_FAILED` | `limit` is present and >100 (never clamped) or ≤0 |
| 500 | `INTERNAL` | The query fails for a reason other than a refused connection |
| 503 | `UNAVAILABLE` | The database refuses the connection |

**Conflict with the mock, stated and resolved:** none. The mock
(`lib/mock/booking-and-approval-notifications.ts`, PR #94) already uses
`id`, `event`, `channel` (`"Email" | "Zalo" | "Dashboard"`), `template`,
`status` (`"pending" | "sent" | "failed"`) — the exact column set and
value vocabulary of `notifications` (erd.md §3.18), because it was
written straight from that table. This contract's response adds only
`created_at` (needed for the sort/pagination the mock's static array
never had to do) and the list envelope (`data`/`has_more`/`next_cursor`)
every other list endpoint in this file already uses. No frontend field
is renamed or dropped.

**Frontend change required** when this backend lands: `AdminSystem.tsx`
stops reading the generic `data`-module `notifications` collection
(`useCollection("notifications", ...)`) for its notifications table and
instead reads this endpoint through a new
`lib/booking-and-approval-notifications.ts` client, cursor-paginated in
place of the generic reader's page params. The existing nit from PR #94's
review — the table's `Badge tone={r.status === "On" ? "good" : "neutral"}`
— is fixed in the same change to map `status`: `sent` → `good`, `failed`
→ `bad`, `pending` → `neutral`, since the real data now actually carries
those three values instead of the unrelated `"On"` the generic collection
happened to hold.

---

## 8.11 Migration plan — Booking and approval notifications (NOTIF-001)

No schema change. `notifications.event`, `.channel`, `.template`,
`.status`, `.created_at`, `ck_notifications_channel`,
`ck_notifications_status`, `uq_notifications_event_channel` (the de-dup
guard §3.7 relies on) and `idx_notifications_created_at` (serves this
story's own `ORDER BY created_at DESC` read) all already exist from the
base ERD, erd.md §3.18, written ahead of this story in the same
migration that created every other `admin`-module table
(`0007_finance_admin`).

One internal contract (§3.7, `notify.Raise`) and one endpoint (§3.7.1,
`GET /v1/admin/notifications`) added above. Neither needs a migration of
its own.

**Forward:** none to run — no DDL. **Backward:** none to run. **Safety on
a populated table:** not applicable, no DDL in this story.
