# Test cases — Admin platform settings and audit log

Module: `admin` · Requirement: ADMIN-007 · Screen: `/admin/system`
(`AdminSystem.tsx`) · Endpoints: `GET /v1/admin/settings` (3.9.20),
`PATCH /v1/admin/settings/{id}` (3.9.21), `GET /v1/admin/audit` (3.9.22)

No story plan exists for this plan item yet; per process this artifact
covers the SRS's own acceptance criteria (ADMIN-007 AC-1/AC-2/AC-3), its
failure/boundary/permission table, §6's auditability NFR, and the
service contract's shared error rules as applied to §3.9.20–22.

Risk level: **medium**. Not a payment or booking path, but the audit log
is this platform's only record of who did what, and the settings page
is the platform's shared source of truth for defaults every other
module reads; a setting that silently fails to save, or an audit row
that can be edited or skipped, undermines every other module's own
test coverage. Full coverage on persistence of all four non-commission
settings and the two text fields, the audit log's read-only/newest-first
guarantee, and the permission/contract rules; no speculative cases
beyond what ADMIN-007 and §2.3/§2.5 already name.

---

## Settings — read and persist

**Scenario**: Listing settings shows the "decisions waiting on you" rows
**Given**: `settings` rows exist including "Default cancellation window" with `value = null`; signed in as an admin with `permissions = 'full'`
**When**: `GET /v1/admin/settings` is called
**Then**: `200` with `data` including an entry `{ "name": "Default cancellation window", "value": null, ... }`
**Traces**: SC (ADMIN-007.1, "lets the admin set each `settings` row's `value`")
**Check**: fetch_url

**Scenario**: Setting the default cancellation window for the first time
**Given**: A `settings` row named "Default cancellation window" with no value; signed in as an admin with `permissions = 'full'`
**When**: `PATCH /v1/admin/settings/{id}` is called with body `{ "value": "48 hours" }`
**Then**: `200` is returned with the updated row showing `value: "48 hours"`; a subsequent `GET /v1/admin/settings` shows that same row with `value: "48 hours"`
**Traces**: AC-1 (ADMIN-007 AC-1)
**Check**: fetch_url

**Scenario**: Setting the manual/instant confirmation mode persists and reads back
**Given**: A `settings` row named "Manual or instant confirmation" with no value; signed in as an admin with `permissions = 'full'`
**When**: `PATCH /v1/admin/settings/{id}` is called with body `{ "value": "Manual by default" }`
**Then**: `200` with `value: "Manual by default"`; a subsequent `GET /v1/admin/settings` shows that same value for that row
**Traces**: SC (ADMIN-007.1, the function's own "manual/instant confirmation mode" settings row)
**Check**: fetch_url

**Scenario**: Setting the hold party-size ceiling persists and reads back
**Given**: A `settings` row named "Largest party a 15-minute hold covers" with no value; signed in as an admin with `permissions = 'full'`
**When**: `PATCH /v1/admin/settings/{id}` is called with body `{ "value": "No ceiling beyond seats remaining" }`
**Then**: `200` with that value; a subsequent `GET /v1/admin/settings` shows the same row holding it
**Traces**: SC (ADMIN-007.1, the function's own "hold party-size ceiling" settings row)
**Check**: fetch_url

**Scenario**: Setting the departure scope persists and reads back
**Given**: A `settings` row named "Departure scope" with no value; signed in as an admin with `permissions = 'full'`
**When**: `PATCH /v1/admin/settings/{id}` is called with body `{ "value": "Nghệ An only" }`
**Then**: `200` with that value; a subsequent `GET /v1/admin/settings` shows the same row holding it
**Traces**: SC (ADMIN-007.1, the function's own "departure scope" settings row)
**Check**: fetch_url

**Scenario**: A settings value submitted empty is rejected and nothing is saved
**Given**: A `settings` row named "Default cancellation window" already holds "48 hours"; signed in as an admin with `permissions = 'full'`
**When**: `PATCH /v1/admin/settings/{id}` is called with body `{ "value": "" }`
**Then**: `422 VALIDATION_FAILED`; a subsequent `GET /v1/admin/settings` still shows that row holding "48 hours", unchanged
**Traces**: Failure row ("Invalid input — A settings value submitted empty where the field requires one → Inline error; not saved")
**Check**: fetch_url

**Scenario**: Setting a value on the `/admin/system` form shows the saved value on reload
**Given**: Signed in as an admin, viewing `/admin/system`, the "Default cancellation window" field showing its "Not set" placeholder
**When**: "48 hours" is typed into that field and the form is submitted, then the page is reloaded
**Then**: The field now shows "48 hours" as its value, not the placeholder
**Traces**: AC-1 (ADMIN-007 AC-1, exercised through the UI action `AdminSystem.tsx` exposes)
**Check**: interact_page

**Scenario**: Clearing a settings field to empty on the form shows an inline error and keeps the prior value
**Given**: Signed in as an admin, viewing `/admin/system`, a settings field already holding "48 hours"
**When**: The field is cleared to empty and the form is submitted
**Then**: An inline validation message is shown next to that field; the field's value is unchanged (still "48 hours") after the attempt
**Traces**: Failure row ("Invalid input — settings value submitted empty"), exercised through the UI
**Check**: interact_page

**Scenario**: Setting a non-existent settings row is rejected
**Given**: No `settings` row with id `does-not-exist`; signed in as an admin with `permissions = 'full'`
**When**: `PATCH /v1/admin/settings/does-not-exist` is called with body `{ "value": "anything" }`
**Then**: `404 NOT_FOUND`
**Traces**: contract (§3.9.21 errors, `NOT_FOUND` 404)
**Check**: fetch_url

**Scenario**: A field the contract does not define is rejected, not ignored
**Given**: A `settings` row exists; signed in as an admin with `permissions = 'full'`
**When**: `PATCH /v1/admin/settings/{id}` is called with body `{ "value": "48 hours", "appliesTo": "all" }`
**Then**: `400 MALFORMED_REQUEST`; the row's `value` is unchanged
**Traces**: contract (§2.5, "a field this contract does not define is rejected with 400 `MALFORMED_REQUEST`")
**Check**: fetch_url

**Scenario**: A sub-admin cannot change a platform setting, regardless of their permission scope
**Given**: A `settings` row exists; signed in as a sub-admin with `permissions = 'finance-only'`
**When**: `PATCH /v1/admin/settings/{id}` is called with body `{ "value": "anything" }`
**Then**: `403 PERMISSION_DENIED`; the row's `value` is unchanged
**Traces**: Failure row ("Not permitted — a sub-admin without system permission attempts to change settings"); contract (§3.9.21 Permissions, `full` only)
**Check**: fetch_url

**Scenario**: An unauthenticated caller cannot read or set a platform setting
**Given**: No session token or cookie sent
**When**: `GET /v1/admin/settings` is called, then `PATCH /v1/admin/settings/{id}` is called with `{ "value": "x" }`
**Then**: Both calls return `401 UNAUTHENTICATED`; the row's `value` is unchanged
**Traces**: contract (§2.3, `UNAUTHENTICATED` — missing session token)
**Check**: fetch_url

**Scenario**: Setting a platform value while the database is unreachable
**Given**: A `settings` row exists; signed in as an admin with `permissions = 'full'`; the database made unreachable (dependency refuses the connection)
**When**: `PATCH /v1/admin/settings/{id}` is called with body `{ "value": "48 hours" }`
**Then**: `503 UNAVAILABLE`; no partial write is recorded
**Traces**: contract (§2.3, `UNAVAILABLE` — "a dependency … refused the connection")
**Check**: fetch_url

**Scenario**: A store failure on the settings write path is reported as INTERNAL, not swallowed
**Given**: A `settings` row exists; signed in as an admin with `permissions = 'full'`; the underlying query for this write is made to fail (e.g. the target table/column renamed) while the database itself still accepts connections
**When**: `PATCH /v1/admin/settings/{id}` is called with body `{ "value": "48 hours" }`
**Then**: `500 INTERNAL`; the row's `value` is unchanged
**Traces**: contract (§2.3, `INTERNAL` — "Unexpected failure, including a query or insert that failed")
**Check**: manual — no tool available to this role can rename a column or otherwise force a query failure distinct from an unreachable database; the 503 case above is covered by `fetch_url` with the database taken down instead

---

## Terms, conditions and email-template text

**Scenario**: Saving the terms and conditions text persists and reads back
**Given**: Signed in as an admin with `permissions = 'full'`, no terms text saved yet
**When**: Terms text is submitted via the platform's settings write path for the "Terms and conditions" text field
**Then**: `200`; a subsequent read of that field returns the exact text submitted
**Traces**: AC-3-equivalent (ADMIN-007.2, "Editing the terms/conditions text … saves that text for later use")
**Check**: fetch_url

**Scenario**: Saving the booking confirmation email template persists and reads back
**Given**: Signed in as an admin with `permissions = 'full'`, no template text saved yet
**When**: Template text is submitted via the platform's settings write path for the "Booking confirmation email" field
**Then**: `200`; a subsequent read of that field returns the exact text submitted; an `audit` row is created recording the edit
**Traces**: AC-3 (ADMIN-007 AC-3)
**Check**: fetch_url

**Scenario**: Typing and saving terms text on `/admin/system` shows the saved text on reload
**Given**: Signed in as an admin, viewing `/admin/system`, the `#terms` field empty
**When**: Text is typed into `#terms` and "Save" is clicked, then the page is reloaded
**Then**: `#terms` shows the typed text as its value after reload, not empty
**Traces**: SC (ADMIN-007.2, exercised through the UI action `AdminSystem.tsx` exposes)
**Check**: interact_page

**Scenario**: Typing and saving the email template on `/admin/system` shows the saved text on reload
**Given**: Signed in as an admin, viewing `/admin/system`, the `#template` field empty
**When**: Text is typed into `#template` and "Save" is clicked, then the page is reloaded
**Then**: `#template` shows the typed text as its value after reload, not empty
**Traces**: AC-3 (ADMIN-007 AC-3, exercised through the UI action `AdminSystem.tsx` exposes)
**Check**: interact_page

**Scenario**: A sub-admin cannot edit the terms or email-template text
**Given**: Signed in as a sub-admin with `permissions = 'content-only'`
**When**: The terms-text write path is called with new text
**Then**: `403 PERMISSION_DENIED`; the stored text is unchanged
**Traces**: Failure row ("Not permitted — a sub-admin without system permission attempts to change settings")
**Check**: fetch_url

---

## Audit log — every write creates one row, read-only, newest-first

**Scenario**: Approving a product creates exactly one audit row recording it
**Given**: A product row with `status = 'pending'`; signed in as an admin with `permissions = 'full'`; no prior audit row for this action
**When**: `POST /v1/admin/products/{id}/approve` is called (ADMIN-001 AC-2)
**Then**: A subsequent `GET /v1/admin/audit` includes exactly one new row with `action` naming "approved" and `target` naming that product's id/name, and `who` naming the acting admin
**Traces**: AC-2 (ADMIN-007 AC-2)
**Check**: fetch_url

**Scenario**: Editing the booking confirmation email template creates an audit row
**Given**: Signed in as an admin with `permissions = 'full'`
**When**: The booking confirmation email template write path is called with new text
**Then**: A subsequent `GET /v1/admin/audit` includes a new row with `action` naming the edit and `target` naming the template setting
**Traces**: AC-3 (ADMIN-007 AC-3, "an `audit` row records the edit")
**Check**: fetch_url

**Scenario**: The audit log lists entries newest-first
**Given**: Two audit-producing actions happen in sequence — an older one, then a newer one — both visible to `GET /v1/admin/audit`
**When**: `GET /v1/admin/audit` is called
**Then**: `200` with the newer row appearing before the older row in the returned list, ordered by `created_at DESC`
**Traces**: Acceptance line ("the audit log lists entries newest-first")
**Check**: fetch_url

**Scenario**: The audit log on `/admin/system` renders newest-first and offers no add/edit/delete control
**Given**: Signed in as an admin, viewing `/admin/system`, with at least two audit rows of different ages
**When**: The audit log table on the page is inspected
**Then**: The newer row's `[data-record]`/table row appears above the older row's; no "Add", "Edit" or "Delete"/"Remove" control exists anywhere inside the audit log table
**Traces**: Acceptance line ("has no add/edit/delete control (entries are written by other actions, never typed in directly)")
**Check**: render_url

**Scenario**: There is no API endpoint to create, edit or delete an audit row directly
**Given**: Signed in as an admin with `permissions = 'full'`
**When**: `POST /v1/admin/audit`, `PATCH /v1/admin/audit/{id}` and `DELETE /v1/admin/audit/{id}` are each attempted
**Then**: Each is rejected — `404 NOT_FOUND` (no such route) or `405`/an equivalent method-not-allowed response per the router's own handling — never a `200`/`201` that writes or alters an `audit` row directly
**Traces**: §6 NFR ("Every state-changing admin action produces exactly one `audit` row; none is skipped and none is user-editable after the fact"); `audit.at, who, action, target` data rule ("created automatically — never a manual admin entry")
**Check**: fetch_url

**Scenario**: A sub-admin without system permission cannot change settings, but every sub-admin can still read the audit-feeding settings list
**Given**: Signed in as a sub-admin with `permissions = 'moderation-only'`
**When**: `GET /v1/admin/settings` is called
**Then**: `200` — read access is granted per §3.9.20's "any sub-admin permission (read-only)" rule, distinct from the write-denial above
**Traces**: contract (§3.9.20 Permissions, "`full`, any sub-admin permission (read-only)")
**Check**: fetch_url

**Scenario**: Only a full admin, not a sub-admin, may read the audit log
**Given**: Signed in as a sub-admin with `permissions = 'finance-only'`
**When**: `GET /v1/admin/audit` is called
**Then**: `403 PERMISSION_DENIED`
**Traces**: contract (§3.9.22 Permissions, "`full` only")
**Check**: fetch_url

**Scenario**: An unauthenticated caller cannot read the audit log
**Given**: No session token or cookie sent
**When**: `GET /v1/admin/audit` is called
**Then**: `401 UNAUTHENTICATED`
**Traces**: contract (§2.3, `UNAUTHENTICATED`)
**Check**: fetch_url

**Scenario**: A Buyer or Supplier role cannot read the audit log
**Given**: Signed in as a `buyer` (and separately as a `supplier`)
**When**: `GET /v1/admin/audit` is called
**Then**: `403 PERMISSION_DENIED` for both roles
**Traces**: SC (ADMIN-007, admin-only module per §3.9 "Auth — `admin`")
**Check**: fetch_url
