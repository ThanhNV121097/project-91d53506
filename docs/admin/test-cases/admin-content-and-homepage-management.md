# Test cases — Admin content and homepage management

Module: `admin` · Requirement: ADMIN-006 · Endpoints:
`GET/POST/PATCH/DELETE /v1/admin/destinations`,
`GET/POST/PATCH/DELETE /v1/admin/categories`
(`docs/architecture/services.md` §3.9.18, §3.9.19)

No story plan exists for this plan item yet; per process this artifact
covers the SRS's own acceptance criteria (ADMIN-006 AC-1/AC-2/AC-3), its
failure/boundary/permission table, §6's privacy NFR, and the service
contract's shared error rules as applied to §3.9.18/§3.9.19.

Risk level: **medium**. Not a payment or inventory path, but every
change here is immediately visible on the public Home page (SITE-001
AC-2) with no publish step, so a bad write or a missed permission check
shows up to every visitor, not just inside the dashboard. Full coverage
for the write paths (destinations and categories), the Home-page
reflection named explicitly by AC-1–AC-3, and the permission/contract
rules; no case beyond what ADMIN-006, ADMIN-003's scoping and §2.3/§2.5's
contract rules already name.

---

**Scenario**: Admin edits a destination's name and from-price
**Given**: A `destinations` row exists with `name = "Cửa Lò"`, `from_price = 890000`, signed in as an admin with `permissions = 'full'`
**When**: `PATCH /v1/admin/destinations/{id}` is sent with body `{ "name": "Cửa Lò Beach", "from_price": 950000 }`
**Then**: `200` is returned with the updated row showing `name: "Cửa Lò Beach"`, `from_price: 950000`
**Traces**: SC (ADMIN-006 AC-1)
**Check**: fetch_url

---

**Scenario**: An edited destination shows its new name and price on the Home page
**Given**: The destination from the previous case now holds `name = "Cửa Lò Beach"`, `from_price = 950000`
**When**: `/` is loaded
**Then**: The destinations grid tile `[data-record="destinations:<id>"]` shows the text "Cửa Lò Beach" and the price "950000" rendered from that same row, with no stale "Cửa Lò" / "890000" anywhere on the tile
**Traces**: SC (ADMIN-006 AC-1, "`/` shows the updated name and price for that destination")
**Check**: render_url

---

**Scenario**: Admin adds a new category
**Given**: No `categories` row named "Homestay", signed in as an admin with `permissions = 'full'`
**When**: `POST /v1/admin/categories` is sent with body `{ "name": "Homestay", "icon": "home" }`
**Then**: `201` is returned with the created row showing `name: "Homestay"`, `icon: "home"`, and a generated `id`
**Traces**: SC (ADMIN-006 AC-2)
**Check**: fetch_url

---

**Scenario**: A newly added category appears as a Home chip linking to its search filter
**Given**: The category from the previous case now exists with `id = <cid>`, `name = "Homestay"`
**When**: `/` is loaded
**Then**: The category chip row includes an element `[data-record="categories:<cid>"]` whose text reads "Homestay" and whose link target is `/search?kind=<cid>`
**Traces**: SC (ADMIN-006 AC-2, "the category chip row includes the new category, linking to `/search?kind=<id>`")
**Check**: render_url

---

**Scenario**: Admin removes a destination
**Given**: A `destinations` row exists with `id = <did>`, `name = "Pù Mát"`, signed in as an admin with `permissions = 'full'`
**When**: `DELETE /v1/admin/destinations/{id}` is sent for `<did>`
**Then**: `204` is returned with an empty body; a subsequent `GET /v1/admin/destinations/{id}` for `<did>` returns `404 NOT_FOUND`
**Traces**: SC (ADMIN-006 AC-3)
**Check**: fetch_url

---

**Scenario**: A removed destination no longer appears on the Home page
**Given**: The destination `<did>` ("Pù Mát") from the previous case has been deleted
**When**: `/` is loaded
**Then**: No element `[data-record="destinations:<did>"]` exists anywhere in the destinations grid
**Traces**: SC (ADMIN-006 AC-3, "it no longer appears on `/`'s destinations grid")
**Check**: render_url

---

**Scenario**: Editing a destination through the dashboard form updates the row shown
**Given**: Signed in as an admin with `permissions = 'full'`, `/admin/content` loaded with a destination row showing name "Thanh Chương Tea Island" and an "Edit" action
**When**: The "Edit" button is clicked, the name field is changed to "Thanh Chương Tea Hills" and the form is saved
**Then**: The destinations list row now reads "Thanh Chương Tea Hills" with no page reload required
**Traces**: SC (ADMIN-006 AC-1, exercised through the UI action `AdminContent.tsx` exposes)
**Check**: interact_page

---

**Scenario**: Removing a destination through the dashboard form drops it from the list
**Given**: Signed in as an admin with `permissions = 'full'`, `/admin/content` loaded with a destination row showing a "Remove" action
**When**: The "Remove" button for that row is clicked (and any confirmation step completed)
**Then**: That destination's row is no longer present in the destinations list on the page
**Traces**: SC (ADMIN-006 AC-3, exercised through the UI action `AdminContent.tsx` exposes)
**Check**: interact_page

---

**Scenario**: Saving a destination with an empty name shows an inline error and does not save
**Given**: Signed in as an admin with `permissions = 'full'`, `/admin/content` loaded, the "Edit" form open for an existing destination
**When**: The name field is cleared to empty and the form is submitted
**Then**: An inline validation message is shown next to the name field and the destination's row still shows its original (pre-edit) name — no new value is saved
**Traces**: SC (ADMIN-006 failure/boundary table, "Invalid input — destination name left empty on save → inline error; not saved")
**Check**: interact_page

---

**Scenario**: Submitting an empty destination name to the API is rejected
**Given**: A `destinations` row exists with `name = "Kim Liên"`, signed in as an admin with `permissions = 'full'`
**When**: `PATCH /v1/admin/destinations/{id}` is sent with body `{ "name": "" }`
**Then**: `422` is returned with `error.code = "VALIDATION_FAILED"`; the row's `name` remains `"Kim Liên"`
**Traces**: SC (ADMIN-006 failure/boundary table, "Invalid input"), contract (§3.9.18, "`VALIDATION_FAILED` (422) if `name` blank")
**Check**: fetch_url

---

**Scenario**: Sub-admin scoped to content-only can edit a destination
**Given**: A `destinations` row exists, signed in as a sub-admin with `permissions = 'content-only'`
**When**: `PATCH /v1/admin/destinations/{id}` is sent with body `{ "name": "Updated Name" }`
**Then**: `200` is returned with `name: "Updated Name"` — the same success shape as the `full` admin case
**Traces**: SC (ADMIN-006 §3.9.18 "Permissions — `full`, `content-only`")
**Check**: fetch_url

---

**Scenario**: Sub-admin without content permission is denied on destinations
**Given**: A `destinations` row exists, signed in as a sub-admin with `permissions = 'finance-only'`
**When**: `PATCH /v1/admin/destinations/{id}` is sent with body `{ "name": "Updated Name" }`
**Then**: `403` is returned with `error.code = "PERMISSION_DENIED"`; the row's `name` is unchanged
**Traces**: SC (ADMIN-006 failure/boundary table, "Not permitted — a sub-admin without content permission attempts this"), contract (§3.9.18 Permissions)
**Check**: fetch_url

---

**Scenario**: Sub-admin without content permission is denied on categories
**Given**: Signed in as a sub-admin with `permissions = 'moderation-only'`
**When**: `POST /v1/admin/categories` is sent with body `{ "name": "Transport" }`
**Then**: `403` is returned with `error.code = "PERMISSION_DENIED"`; no `categories` row named "Transport" is created
**Traces**: SC (ADMIN-006 failure/boundary table), contract (§3.9.19 Permissions)
**Check**: fetch_url

---

**Scenario**: A Buyer or Supplier role cannot write to destinations or categories
**Given**: A `destinations` row exists, signed in as a `buyer` (and separately as a `supplier`)
**When**: `PATCH /v1/admin/destinations/{id}` is sent with body `{ "name": "Hack" }`
**Then**: `403` is returned with `error.code = "PERMISSION_DENIED"` for both roles; the row's `name` is unchanged
**Traces**: SC (ADMIN-006, admin-only endpoint per §3.9 "Auth — `admin`")
**Check**: fetch_url

---

**Scenario**: An unauthenticated request to edit a destination is rejected
**Given**: A `destinations` row exists; no session token or cookie sent
**When**: `PATCH /v1/admin/destinations/{id}` is sent with body `{ "name": "Hack" }`
**Then**: `401` is returned with `error.code = "UNAUTHENTICATED"`; the row's `name` is unchanged
**Traces**: contract (§2.3, `UNAUTHENTICATED` — missing session token)
**Check**: fetch_url

---

**Scenario**: An unauthenticated request to add a category is rejected
**Given**: No session token or cookie sent
**When**: `POST /v1/admin/categories` is sent with body `{ "name": "Transport" }`
**Then**: `401` is returned with `error.code = "UNAUTHENTICATED"`; no `categories` row named "Transport" is created
**Traces**: contract (§2.3, `UNAUTHENTICATED`)
**Check**: fetch_url

---

**Scenario**: A field the contract does not define is rejected, not ignored
**Given**: A `destinations` row exists, signed in as an admin with `permissions = 'full'`
**When**: `PATCH /v1/admin/destinations/{id}` is sent with body `{ "name": "Valid Name", "owner_note": "internal only" }`
**Then**: `400` is returned with `error.code = "MALFORMED_REQUEST"`; the row's `name` is unchanged
**Traces**: contract (§2.5, "a field this contract does not define is rejected with `400 MALFORMED_REQUEST` — never accepted and silently ignored")
**Check**: fetch_url

---

**Scenario**: Creating a category with a duplicate name is rejected
**Given**: A `categories` row already exists with `name = "Tours"`, signed in as an admin with `permissions = 'full'`
**When**: `POST /v1/admin/categories` is sent with body `{ "name": "Tours" }`
**Then**: `409` is returned with `error.code = "CONFLICT"`; no second `categories` row named "Tours" is created
**Traces**: contract (§3.9.18/§3.9.19, "`CONFLICT` (409) on POST if `name` already exists")
**Check**: fetch_url

---

**Scenario**: Editing a destination that does not exist
**Given**: No `destinations` row with `id = "does-not-exist"`, signed in as an admin with `permissions = 'full'`
**When**: `PATCH /v1/admin/destinations/does-not-exist` is sent with body `{ "name": "Anything" }`
**Then**: `404` is returned with `error.code = "NOT_FOUND"`
**Traces**: contract (§3.9.18 errors, `NOT_FOUND` 404)
**Check**: fetch_url

---

**Scenario**: Removing a destination that does not exist
**Given**: No `destinations` row with `id = "does-not-exist"`, signed in as an admin with `permissions = 'full'`
**When**: `DELETE /v1/admin/destinations/does-not-exist` is sent
**Then**: `404` is returned with `error.code = "NOT_FOUND"`
**Traces**: contract (§3.9.18 errors, `NOT_FOUND` 404)
**Check**: fetch_url

---

**Scenario**: Creating a category with a blank name is rejected
**Given**: Signed in as an admin with `permissions = 'full'`
**When**: `POST /v1/admin/categories` is sent with body `{ "name": "" }`
**Then**: `422` is returned with `error.code = "VALIDATION_FAILED"`; no `categories` row is created
**Traces**: contract (§3.9.18/§3.9.19, "`name` required on create")
**Check**: fetch_url

---

**Scenario**: Editing destinations while the database is unreachable
**Given**: A `destinations` row exists, signed in as an admin with `permissions = 'full'`, the database made unreachable (dependency refuses the connection)
**When**: `PATCH /v1/admin/destinations/{id}` is sent with body `{ "name": "Updated Name" }`
**Then**: `503` is returned with `error.code = "UNAVAILABLE"`; no partial write is recorded
**Traces**: contract (§2.3, `UNAVAILABLE` — "a dependency … refused the connection")
**Check**: fetch_url

---

**Scenario**: A store failure on the write path is reported as INTERNAL, not swallowed
**Given**: A `destinations` row exists, signed in as an admin with `permissions = 'full'`, the underlying query for this write is made to fail (e.g. the target table/column renamed) while the database itself still accepts connections
**When**: `PATCH /v1/admin/destinations/{id}` is sent with body `{ "name": "Updated Name" }`
**Then**: `500` is returned with `error.code = "INTERNAL"`; the row's `name` is unchanged
**Traces**: contract (§2.3, `INTERNAL` — "Unexpected failure, including a query or insert that failed")
**Check**: manual — no tool available to this role can rename a column or otherwise force a query failure distinct from an unreachable database; the 503 case above is covered by `fetch_url` with the database taken down instead

---

**Scenario**: Adding a category through the dashboard form shows it in the list immediately
**Given**: Signed in as an admin with `permissions = 'full'`, `/admin/content` loaded showing an "Add category" action
**When**: The "Add category" control is used to submit a name of "Transport"
**Then**: A new row reading "Transport" appears in the categories/content section of the page without a reload
**Traces**: SC (ADMIN-006 AC-2, exercised through the UI action `AdminContent.tsx` exposes)
**Check**: interact_page
