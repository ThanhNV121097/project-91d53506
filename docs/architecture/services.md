
---

## 3.9.20 `GET /v1/admin/settings` — List platform settings (ADMIN-007)

**Auth** — `admin` (full or sub-admin).
**Permissions** — `full`, any sub-admin `permissions` value (read-only —
every sub-admin may read this list even though only `full` may write it,
since other screens' "decisions waiting on you" context depends on it).

**Request**

```
GET /v1/admin/settings
```

No query parameters. Small table (erd.md §3.19, "always read in full"),
so no pagination — matches `AdminSystem.tsx`'s and `AdminHome.tsx`'s
`useCollection("settings", { pageSize: 10 })`, which reads the whole
table either way.

**Response** — `200`

```json
{
  "data": [
    { "id": "...", "name": "Default cancellation window", "value": null, "note": "..." }
  ]
}
```

**Errors**

| Status | `error.code` | When |
|---|---|---|
| 401 | `UNAUTHENTICATED` | No valid session token |
| 403 | `PERMISSION_DENIED` | Signed in, but not `admin` |
| 500 | `INTERNAL` | The query fails for a reason other than a refused connection |
| 503 | `UNAVAILABLE` | The database refuses the connection |

## 3.9.21 `PATCH /v1/admin/settings/{id}` — Set a platform setting's value (ADMIN-007)

**Auth** — `admin`, **full only** — no sub-admin `permissions` value
grants this write (failure table: "a sub-admin without system permission
attempts to change settings" is rejected regardless of scope).

**Request**

```json
{ "value": "48 hours" }
```

Only `value` is accepted; `name`/`note`/`id` are never written here. This
one endpoint also carries the terms-and-conditions and booking-
confirmation-email text (ADMIN-007.2): those are `settings` rows too
(`name = "Terms and conditions"` / `"Booking confirmation email"`,
`value` holding the long text), not a separate table or endpoint — the
column is already untyped `text` (erd.md §3.19), so a paragraph fits the
same `value` column a short setting does.

**Behaviour** — `UPDATE settings SET value = $2, updated_at = now() WHERE
id = $1 RETURNING *`; in the same transaction, insert one `audit` row
(`action = "set setting"`, `target = settings.name`, `actor_id` /
`actor_label` = the caller) — this is the one write every requirement in
this module makes that is *itself* ADMIN-007's own audited action, not a
different module's.

**Response** — `200` — the updated row, same shape as one item of
§3.9.20's `data`.

**Errors**

| Status | `error.code` | When |
|---|---|---|
| 400 | `MALFORMED_REQUEST` | A field other than `value` is present |
| 401 | `UNAUTHENTICATED` | No valid session token |
| 403 | `PERMISSION_DENIED` | Signed in, but not `admin`, or an `admin` whose `permissions` is anything other than full (no sub-admin scope grants this write) |
| 404 | `NOT_FOUND` | No `settings` row with that `id` |
| 422 | `VALIDATION_FAILED` | `value` is present and blank after trim (empty string) |
| 500 | `INTERNAL` | The update query fails for a reason other than a refused connection |
| 503 | `UNAVAILABLE` | The database refuses the connection |

## 3.9.22 `GET /v1/admin/audit` — Read the audit log, newest first (ADMIN-007)

**Auth** — `admin`, **full only** — no sub-admin `permissions` value may
read this log (test cases: a `finance-only` sub-admin's own read is
`403`, distinct from §3.9.20's read-only grant to every sub-admin).

**Request**

```
GET /v1/admin/audit?limit=&cursor=
```

| Param | Type | Notes |
|---|---|---|
| `limit` | integer, 1–100 | Default 20, matching the design's `t.size` default |
| `cursor` | string | Opaque, from a previous response's `next_cursor` — same scheme as §3.9.10/§3.9.11 |

**Response** — `200`

```json
{
  "data": [
    { "id": "...", "at": "...", "who": "...", "action": "approved", "target": "..." }
  ],
  "has_more": false,
  "next_cursor": null
}
```

`id` is `audit.id` (bigint, returned as a string per this contract's
existing convention); `at` is `audit.created_at`; `who` is
`audit.actor_label`; sorted `created_at DESC` (erd.md `idx_audit_created_at`).
No write endpoint exists on this path — `POST`/`PATCH`/`DELETE
/v1/admin/audit...` are not routes this contract defines, so the router's
own "no such route" handling (`404`, never a `200`/`201`) is what a caller
gets; this is a property of there being no handler, not a behaviour this
file specifies as a rejection rule.

**Errors**

| Status | `error.code` | When |
|---|---|---|
| 400 | `MALFORMED_REQUEST` | A query parameter outside `limit`/`cursor` is present |
| 401 | `UNAUTHENTICATED` | No valid session token |
| 403 | `PERMISSION_DENIED` | Signed in, but not `admin`, or an `admin` whose `permissions` is not full |
| 422 | `VALIDATION_FAILED` | `limit` present and >100 or ≤0 |
| 500 | `INTERNAL` | The query fails for a reason other than a refused connection |
| 503 | `UNAVAILABLE` | The database refuses the connection |

No `404` — an empty log is `200` with `data: []`, `has_more: false`.

**Notes**

- This story has no UI PR/mock — `AdminSystem.tsx` was built against the
  generic `data`-module `useCollection`/`useRecord` reader (DATA-002) for
  `settings`/`audit`/`notifications`; §3.9.20/§3.9.21/§3.9.22 above are a
  **narrower, dedicated contract** replacing that generic reader for
  `settings` (because its write needs the audit side-effect and the
  full-only write restriction DATA-002 never modelled) and for `audit`
  (because its read needs the full-only restriction and `admin`'s own
  auth, which the `data` module's public, role-less reads never enforce
  per `docs/data/SRS.md` §3 "Out of scope — Authentication and permission
  checks"). **Frontend change required** when this backend lands:
  `AdminSystem.tsx`'s `settings`/`audit` calls move from
  `useCollection("settings"/"audit", ...)` to this story's own
  `lib/admin-platform-settings-and-audit-log.ts` client against
  §3.9.20–22; its `notifications` panel keeps reading the generic `data`
  module reader unchanged (no permission or write concern there).
- Writes exactly one `audit` row per `PATCH /v1/admin/settings/{id}` call,
  matching §6's NFR ("every state-changing admin action produces exactly
  one `audit` row"). Every other admin endpoint in this file
  (§3.9.2–§3.9.5, §3.9.12, etc.) owes the same audit row on its own write;
  tracked as a cross-cutting note here since this story is the first to
  specify the `audit` table's own read/write contract, not a re-scope of
  those endpoints.

## 8.8 Migration plan — Admin platform settings and audit log (ADMIN-007)

No table, column, index or constraint change. `settings` (erd.md §3.19)
and `audit` (erd.md §3.17) already carry every column this story reads or
writes — `settings.name/value/note/updated_at`, `audit.actor_id/
actor_label/action/target/created_at` — and `idx_audit_created_at`
already serves §3.9.22's newest-first read. All written in the base ERD
migration (`0007_finance_admin`), ahead of this story.

One seed addition: a new migration, `0009_seed_admin_settings.up/down.sql`,
inserting five named `settings` rows this story's acceptance criteria
name that the base seed (`0008_seed_settings`, which seeds only "Default
cancellation window" and "Global commission percent") does not yet carry:
"Manual or instant confirmation", "Largest party a 15-minute hold covers",
"Departure scope", "Terms and conditions", "Booking confirmation email" —
all with `value = NULL` (erd.md §3.19's documented "not yet decided"
starting state).

Three endpoints added: §3.9.20, §3.9.21, §3.9.22 above.

**Forward:** `INSERT` the five named rows above with `value = NULL`.
**Backward:** `DELETE` those five named rows by name. **Safety on a
populated table:** safe — insert-only by name, no existing row's `value`
is touched, and the five names are guaranteed not to collide with
`0008`'s two (disjoint name sets).
