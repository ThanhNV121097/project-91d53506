itle: Test cases — Admin platform settings and audit log

# Test cases — Admin platform settings and audit log

Module: `admin` · Requirement: ADMIN-007 · Endpoints: `GET /v1/admin/settings` (3.9.20), `PATCH /v1/admin/settings/{id}` (3.9.21), `GET /v1/admin/audit` (3.9.22)

No story plan exists for this plan item yet; per process this artifact covers the SRS's own acceptance criteria (ADMIN-007 AC-1/AC-2/AC-3), its failure/boundary/permission table, §6's auditability NFR, and the service contract's shared error rules as applied to §3.9.20–§3.9.22. The terms-and-conditions and email-template text fields are UI-only text areas in `AdminSystem.tsx` with no endpoint of their own in the current contract (§3.9.21 only names a `settings` row's `value`); where the contract has no endpoint for a field named in the SRS, this file covers it at the UI layer only and flags the gap rather than inventing an endpoint.

Risk level: **medium**. Nothing here touches money or inventory directly, but the audit log is the platform's only record of who did what, and ADMIN-007's own NFR says "none is skipped and none is user-editable after the fact" — a silently missing log row or an editable one undermines every other module's accountability. Full coverage of the four non-commission settings fields' persistence, the terms/email-template text persistence, the audit log's read-only newest-first behaviour, and the permission/contract rules; no case beyond what ADMIN-007, ADMIN-003's scoping and §2.3/§2.5's contract rules already name.

---

**Scenario**: Admin sets the default cancellation window setting
**Given**: A `settings` row named "Default cancellation window" with `value = null`, signed in as an admin with `permissions = 'full'`
**When**: `PATCH /v1/admin/settings/{id}` is sent with body `{ "value": "48 hours" }`
**Then**: `200` is returned with the updated row showing `value: "48 hours"`
**Traces**: SC (ADMIN-007 AC-1)
**Check**: fetch_url

---

**Scenario**: A set setting value is readable back from the list endpoint
**Given**: The "Default cancellation window" row from the previous case now holds `value = "48 hours"`
**When**: `GET /v1/admin/settings` is sent
**Then**: `200` is returned with one item whose `name = "Default cancellation window"` and `value = "48 hours"`
**Traces**: SC (ADMIN-007 AC-1, "persists and is readable back"), contract (3.9.20)
**Check**: fetch_url

---

**Scenario**: A set setting value is readable back on the System page
**Given**: The "Default cancellation window" row holds `value = "48 hours"`, signed in as an admin with `permissions = 'full'`
**When**: `/admin/system` is loaded
**Then**: The input labelled "Default cancellation window" (`[data-record="settings:<id>"]`) shows the value "48 hours", not the "Not set" placeholder
**Traces**: SC (ADMIN-007 AC-1, "readable back")
**Check**: render_url

---

**Scenario**: Admin sets the manual/instant confirmation mode setting
**Given**: A `settings` row named "Confirmation mode" with `value = null`, signed in as an admin with `permissions = 'full'`
**When**: `PATCH /v1/admin/settings/{id}` is sent with body `{ "value": "Manual" }`
**Then**: `200` is returned with `value: "Manual"`; a subsequent `GET /v1/admin/settings` shows that same row with `value: "Manual"`
**Traces**: SC (ADMIN-007 behaviour §1, "non-commission settings … persists and is readable back" — confirmation mode)
**Check**: fetch_url

---

**Scenario**: Admin sets the hold party-size ceiling setting
**Given**: A `settings` row named "Hold party-size ceiling" with `value = null`, signed in as an admin with `permissions = 'full'`
**When**: `PATCH /v1/admin/settings/{id}` is sent with body `{ "value": "40" }`
**Then**: `200` is returned with `value: "40"`; a subsequent `GET /v1/admin/settings` shows that same row with `value: "40"`
**Traces**: SC (ADMIN-007 behaviour §1 — hold party-size ceiling)
**Check**: fetch_url

---

**Scenario**: Admin sets the departure scope setting
**Given**: A `settings` row named "Departure scope" with `value = null`, signed in as an admin with `permissions = 'full'`
**When**: `PATCH /v1/admin/settings/{id}` is sent with body `{ "value": "Nghệ An only" }`
**Then**: `200` is returned with `value: "Nghệ An only"`; a subsequent `GET /v1/admin/settings` shows that same row with `value: "Nghệ An only"`
**Traces**: SC (ADMIN-007 behaviour §1 — departure scope)
**Check**: fetch_url

---

**Scenario**: Admin edits the terms and conditions text through the dashboard form
**Given**: Signed in as an admin with `permissions = 'full'`, `/admin/system` loaded, the "Terms and conditions" textarea (`#terms`) showing its current text
**When**: The textarea is cleared and typed with "Updated terms text for Nghệ An Departures" and the form's "Save" button is clicked
**Then**: The "Terms and conditions" textarea's value reads "Updated terms text for Nghệ An Departures" after save completes
**Traces**: SC (ADMIN-007 AC's own "terms/conditions text … saves that text", behaviour §2)
**Check**: interact_page

---

**Scenario**: Saved terms and conditions text is readable back after a reload
**Given**: The terms and conditions text was saved as "Updated terms text for Nghệ An Departures" in the previous case
**When**: `/admin/system` is reloaded
**Then**: The "Terms and conditions" textarea (`#terms`) shows "Updated terms text for Nghệ An Departures", not blank or stale text
**Traces**: SC (ADMIN-007 — "persists and is readable back", terms text)
**Check**: render_url

---

**Scenario**: Admin edits the booking confirmation email template through the dashboard form
**Given**: Signed in as an admin with `permissions = 'full'`, `/admin/system` loaded, the "Booking confirmation email" textarea (`#template`) showing its current text
**When**: The textarea is cleared and typed with "Thanks for booking, {{code}}!" and the form's "Save" button is clicked
**Then**: The "Booking confirmation email" textarea's value reads "Thanks for booking, {{code}}!" after save completes
**Traces**: SC (ADMIN-007 AC-3)
**Check**: interact_page

---

**Scenario**: Saved email template text is readable back after a reload
**Given**: The booking confirmation email template was saved as "Thanks for booking, {{code}}!" in the previous case
**When**: `/admin/system` is reloaded
**Then**: The "Booking confirmation email" textarea (`#template`) shows "Thanks for booking, {{code}}!", not blank or stale text
**Traces**: SC (ADMIN-007 AC-3, "the new template text is stored")
**Check**: render_url

---

**Scenario**: Editing the email template writes exactly one audit row
**Given**: Signed in as an admin named "Admin Lan", `/admin/system` loaded, the current count of `audit` rows noted via `GET /v1/admin/audit`
**When**: The "Booking confirmation email" textarea is edited and the form's "Save" button is clicked
**Then**: A subsequent `GET /v1/admin/audit` shows exactly one new row with `actor_label` identifying "Admin Lan", `action` naming an edit of the template, and `target` naming the email template
**Traces**: SC (ADMIN-007 AC-3, "an `audit` row records the edit")
**Check**: fetch_url

---

**Scenario**: Approving a product writes an audit row visible in the log
**Given**: A `products` row with `status = 'pending'`, signed in as an admin named "Admin Lan"
**When**: `POST /v1/admin/products/{id}/approve` is sent, then `GET /v1/admin/audit` is sent
**Then**: The audit list's newest row shows `actor_label` identifying "Admin Lan", `action = "approved"`, and `target` naming that product
**Traces**: SC (ADMIN-007 AC-2)
**Check**: fetch_url

---

**Scenario**: The audit log lists entries newest-first
**Given**: Two audit rows exist — one created at an earlier time with `action = "approved"`, one created afterward with `action = "locked"`
**When**: `GET /v1/admin/audit` is sent
**Then**: `200` is returned with `data[0].action = "locked"` (the later row) ordered before `data[1].action = "approved"` (the earlier row)
**Traces**: SC (ADMIN-007 acceptance: "the audit log lists entries newest-first"), contract (3.9.22, "`created_at DESC`")
**Check**: fetch_url

---

**Scenario**: The audit log reads newest-first on the System page
**Given**: The same two audit rows as the previous case, signed in as an admin with `permissions = 'full'`
**When**: `/admin/system` is loaded
**Then**: In the "Audit log" table, the row reading action "locked" appears above the row reading action "approved"
**Traces**: SC (ADMIN-007 acceptance: "newest-first"), SRS screen states (`AdminSystem.tsx`, default)
**Check**: render_url

---

**Scenario**: The audit log page has no add, edit or delete control
**Given**: Signed in as an admin with `permissions = 'full'`, `/admin/system` loaded with the "Audit log" table showing rows
**When**: The "Audit log" section of the page is inspected
**Then**: No button or control labelled "Add", "Edit", "Delete" or "Remove" exists within the audit log table or its caption area — only column headers (When/Who/Action/On), sort controls and pagination controls are present
**Traces**: SC (ADMIN-007 acceptance: "has no add/edit/delete control")
**Check**: render_url

---

**Scenario**: There is no API endpoint to create an audit row directly
**Given**: Signed in as an admin with `permissions = 'full'`
**When**: `POST /v1/admin/audit` is sent with body `{ "action": "manual entry", "target": "nothing" }`
**Then**: `404` is returned (no such route registered) — the audit log has no write endpoint of its own; entries are created only as a side effect of other admin actions (3.9.2–3.9.21 etc.)
**Traces**: SC (ADMIN-007 acceptance: "entries are written by other actions, never typed in directly")
**Check**: fetch_url

---

**Scenario**: There is no API endpoint to edit an existing audit row
**Given**: An `audit` row exists with `id = <aid>`, signed in as an admin with `permissions = 'full'`
**When**: `PATCH /v1/admin/audit/<aid>` is sent with body `{ "action": "changed" }`
**Then**: `404` is returned (no such route registered); a subsequent `GET /v1/admin/audit` shows the row's `action` unchanged
**Traces**: SC (ADMIN-007 NFR §6, "none is user-editable after the fact")
**Check**: fetch_url

---

**Scenario**: Setting a value with an empty string is rejected
**Given**: A `settings` row named "Default cancellation window" with `value = "48 hours"`, signed in as an admin with `permissions = 'full'`
**When**: `PATCH /v1/admin/settings/{id}` is sent with body `{ "value": "" }`
**Then**: `422` is returned with `error.code = "VALIDATION_FAILED"`; the row's `value` remains `"48 hours"`
**Traces**: SC (ADMIN-007 failure/boundary table, "Invalid input — a settings value submitted empty where the field requires one → inline error; not saved"), contract (3.9.21, "`VALIDATION_FAILED` (422) if `value` blank")
**Check**: fetch_url

---

**Scenario**: Submitting an empty settings value through the dashboard form shows an inline error and does not save
**Given**: Signed in as an admin with `permissions = 'full'`, `/admin/system` loaded, a settings input showing value "48 hours"
**When**: The value is cleared to empty and the input is blurred/submitted
**Then**: An inline validation message is shown next to that setting's input and the setting's stored value remains "48 hours" — no new value is saved
**Traces**: SC (ADMIN-007 failure/boundary table, "Invalid input"), SRS behaviour (interact_page exercise of the same rule)
**Check**: interact_page

---

**Scenario**: A sub-admin without system permission is denied setting a value
**Given**: A `settings` row exists, signed in as a sub-admin with `permissions = 'moderation-only'`
**When**: `PATCH /v1/admin/settings/{id}` is sent with body `{ "value": "48 hours" }`
**Then**: `403` is returned with `error.code = "PERMISSION_DENIED"`; the row's `value` is unchanged
**Traces**: SC (ADMIN-007 failure/boundary table, "Not permitted — a sub-admin without system permission attempts to change settings"), contract (3.9.21, "Permissions — `full` only")
**Check**: fetch_url

---

**Scenario**: A sub-admin with any permission can still read the settings list
**Given**: A `settings` row exists, signed in as a sub-admin with `permissions = 'finance-only'`
**When**: `GET /v1/admin/settings` is sent
**Then**: `200` is returned with the full settings list — read access is not restricted per-permission
**Traces**: contract (3.9.20, "`full`, any sub-admin permission (read-only)")
**Check**: fetch_url

---

**Scenario**: A sub-admin without full permission is denied reading the audit log
**Given**: Signed in as a sub-admin with `permissions = 'content-only'`
**When**: `GET /v1/admin/audit` is sent
**Then**: `403` is returned with `error.code = "PERMISSION_DENIED"`
**Traces**: contract (3.9.22, "Permissions — `full` only")
**Check**: fetch_url

---

**Scenario**: A Buyer or Supplier cannot read or write platform settings
**Given**: A `settings` row exists, signed in as a `buyer` (and separately as a `supplier`)
**When**: `GET /v1/admin/settings` is sent, then `PATCH /v1/admin/settings/{id}` is sent with body `{ "value": "Hack" }`
**Then**: `403` is returned with `error.code = "PERMISSION_DENIED"` for both calls, for both roles; the row's `value` is unchanged
**Traces**: SC (ADMIN-007, admin-only module per §3.9 "Auth — `admin`")
**Check**: fetch_url

---

**Scenario**: An unauthenticated request to set a setting value is rejected
**Given**: A `settings` row exists; no session token or cookie sent
**When**: `PATCH /v1/admin/settings/{id}` is sent with body `{ "value": "Hack" }`
**Then**: `401` is returned with `error.code = "UNAUTHENTICATED"`; the row's `value` is unchanged
**Traces**: contract (§2.3, `UNAUTHENTICATED`)
**Check**: fetch_url

---

**Scenario**: An unauthenticated request to read the audit log is rejected
**Given**: No session token or cookie sent
**When**: `GET /v1/admin/audit` is sent
**Then**: `401` is returned with `error.code = "UNAUTHENTICATED"`
**Traces**: contract (§2.3, `UNAUTHENTICATED`)
**Check**: fetch_url

---

**Scenario**: A field the contract does not define is rejected, not ignored, when setting a value
**Given**: A `settings` row exists, signed in as an admin with `permissions = 'full'`
**When**: `PATCH /v1/admin/settings/{id}` is sent with body `{ "value": "48 hours", "internal_note": "do not show" }`
**Then**: `400` is returned with `error.code = "MALFORMED_REQUEST"`; the row's `value` is unchanged
**Traces**: contract (§2.5, "a field this contract does not define is rejected with `400 MALFORMED_REQUEST` — never accepted and silently ignored")
**Check**: fetch_url

---

**Scenario**: Setting a value for a settings row that does not exist
**Given**: No `settings` row with `id = "does-not-exist"`, signed in as an admin with `permissions = 'full'`
**When**: `PATCH /v1/admin/settings/does-not-exist` is sent with body `{ "value": "anything" }`
**Then**: `404` is returned with `error.code = "NOT_FOUND"`
**Traces**: contract (3.9.21 errors, `NOT_FOUND` 404)
**Check**: fetch_url

---

**Scenario**: An out-of-range cursor `limit` on the audit log is rejected, not clamped
**Given**: Signed in as an admin with `permissions = 'full'`
**When**: `GET /v1/admin/audit?limit=500` is sent
**Then**: `422` is returned with `error.code = "VALIDATION_FAILED"`
**Traces**: contract (§2.4, "Over the max limit — rejected with `VALIDATION_FAILED`, never clamped")
**Check**: fetch_url

---

**Scenario**: Setting a value while the database is unreachable
**Given**: A `settings` row exists, signed in as an admin with `permissions = 'full'`, the database made unreachable (dependency refuses the connection)
**When**: `PATCH /v1/admin/settings/{id}` is sent with body `{ "value": "48 hours" }`
**Then**: `503` is returned with `error.code = "UNAVAILABLE"`; no partial write is recorded
**Traces**: contract (§2.3, `UNAVAILABLE` — "a dependency … refused the connection")
**Check**: fetch_url

---

**Scenario**: A store failure on the settings write path is reported as INTERNAL, not swallowed
**Given**: A `settings` row exists, signed in as an admin with `permissions = 'full'`, the underlying query for this write is made to fail (e.g. the target table/column renamed) while the database itself still accepts connections
**When**: `PATCH /v1/admin/settings/{id}` is sent with body `{ "value": "48 hours" }`
**Then**: `500` is returned with `error.code = "INTERNAL"`; the row's `value` is unchanged
**Traces**: contract (§2.3, `INTERNAL` — "Unexpected failure, including a query or insert that failed")
**Check**: manual — no tool available to this role can rename a column or otherwise force a query failure distinct from an unreachable database; the 503 case above is covered by `fetch_url` with the database taken down instead

---

**Scenario**: Gap flagged — terms and email-template text have no documented API endpoint
**Given**: `docs/architecture/services.md` §3.9.20–§3.9.22 names only `GET/PATCH /v1/admin/settings*` and `GET /v1/admin/audit`; no endpoint is documented for the terms-and-conditions or email-template text fields that `AdminSystem.tsx` renders as separate textareas
**When**: Technical design for this story's backend runs
**Then**: The service contract must add an endpoint (or fold these into the `settings` table as named rows) before the BE story is built, so the persistence cases above ("Saved … text is readable back after a reload") have a real endpoint to call rather than an assumed one
**Traces**: contract gap — flagged for TL at technical design, not invented here
**Check**: manual — a documentation gap, not an observable runtime behaviour
