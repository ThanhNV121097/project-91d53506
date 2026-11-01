# Test cases — Admin review moderation

Module: `admin` · Requirement: ADMIN-002 · Endpoint: `PATCH /v1/admin/reviews/{id}`
(`docs/architecture/services.md` §3.9.6)

No story plan exists for this plan item yet; per process this artifact
covers the SRS's own acceptance criteria (ADMIN-002 AC-1/AC-2), its
failure/boundary/permission table, the §6 privacy NFR, and the service
contract's error rules for `PATCH /v1/admin/reviews/{id}`.

Risk level: **medium**. Not a payment or inventory path, but it gates
what the public storefront shows, and it is scoped by permission like
every other admin write — both the visibility toggle and the
permission/contract rules get full coverage; no case is speculative
beyond what ADMIN-002, ADMIN-003's scoping and §2.3/§2.5's contract
rules already name.

---

**Scenario**: Admin hides a published review
**Given**: A `reviews` row with `status = 'published'`, signed in as an admin with `permissions = 'full'`
**When**: `PATCH /v1/admin/reviews/{id}` is sent with body `{ "status": "hidden" }`
**Then**: `200` is returned with the updated review showing `status: "hidden"`
**Traces**: SC (ADMIN-002 AC-1)
**Check**: fetch_url

---

**Scenario**: A hidden review stops appearing on the product page
**Given**: The review from the previous case is now `hidden`, for a product with `id = <pid>`
**When**: `/tours/<pid>` is loaded
**Then**: The review's author/text (`[data-record="reviews:<id>"]`) is absent from the rendered review list; the review count reflects only still-published reviews
**Traces**: SC (ADMIN-002 AC-1, "it no longer appears on `/tours/:id`")
**Check**: render_url

---

**Scenario**: Admin publishes a hidden review
**Given**: A `reviews` row with `status = 'hidden'`, signed in as an admin with `permissions = 'full'`
**When**: `PATCH /v1/admin/reviews/{id}` is sent with body `{ "status": "published" }`
**Then**: `200` is returned with the updated review showing `status: "published"`
**Traces**: SC (ADMIN-002 AC-2)
**Check**: fetch_url

---

**Scenario**: A published review reappears on the product page
**Given**: The review from the previous case is now `published`, for a product with `id = <pid>`
**When**: `/tours/<pid>` is loaded
**Then**: The review's author/text (`[data-record="reviews:<id>"]`) is present in the rendered review list
**Traces**: SC (ADMIN-002 AC-2, "it reappears on `/tours/:id`")
**Check**: render_url

---

**Scenario**: Admin hides a reported review
**Given**: A `reviews` row with `status = 'reported'`, signed in as an admin with `permissions = 'full'`
**When**: `PATCH /v1/admin/reviews/{id}` is sent with body `{ "status": "hidden" }`
**Then**: `200` is returned with `status: "hidden"`; the review does not appear on `/tours/:id`
**Traces**: SC (ADMIN-002 behaviour point 1, "a reported review may be hidden or restored to published by the same action")
**Check**: fetch_url

---

**Scenario**: Admin restores a reported review to published
**Given**: A `reviews` row with `status = 'reported'`, signed in as an admin with `permissions = 'full'`
**When**: `PATCH /v1/admin/reviews/{id}` is sent with body `{ "status": "published" }`
**Then**: `200` is returned with `status: "published"`; the review appears on `/tours/:id`
**Traces**: SC (ADMIN-002 behaviour point 1)
**Check**: fetch_url

---

**Scenario**: Sub-admin scoped to moderation-only can hide a review
**Given**: A `reviews` row with `status = 'published'`, signed in as a sub-admin with `permissions = 'moderation-only'`
**When**: `PATCH /v1/admin/reviews/{id}` is sent with body `{ "status": "hidden" }`
**Then**: `200` is returned with `status: "hidden"` — the same success shape as the `full` admin case
**Traces**: SC (ADMIN-002 §3.9.6 "Permissions — `full`, `moderation-only`")
**Check**: fetch_url

---

**Scenario**: Sub-admin without moderation permission is denied
**Given**: A `reviews` row with `status = 'published'`, signed in as a sub-admin with `permissions = 'finance-only'`
**When**: `PATCH /v1/admin/reviews/{id}` is sent with body `{ "status": "hidden" }`
**Then**: `403` is returned with `error.code = "PERMISSION_DENIED"`; `reviews.status` for that row is unchanged
**Traces**: SC (ADMIN-002 failure/boundary table, "Not permitted — a sub-admin without moderation permission attempts this" → rejected per ADMIN-003's scoping)
**Check**: fetch_url

---

**Scenario**: A Buyer or Supplier role cannot moderate reviews
**Given**: A `reviews` row with `status = 'published'`, signed in as a `buyer` (and separately as a `supplier`)
**When**: `PATCH /v1/admin/reviews/{id}` is sent with body `{ "status": "hidden" }`
**Then**: `403` is returned with `error.code = "PERMISSION_DENIED"` for both roles; `reviews.status` is unchanged
**Traces**: SC (ADMIN-002, admin-only endpoint per §3.9 "Auth — `admin`")
**Check**: fetch_url

---

**Scenario**: An unauthenticated request is rejected
**Given**: A `reviews` row with `status = 'published'`; no session token or cookie sent
**When**: `PATCH /v1/admin/reviews/{id}` is sent with body `{ "status": "hidden" }`
**Then**: `401` is returned with `error.code = "UNAUTHENTICATED"`; `reviews.status` is unchanged
**Traces**: contract (§2.3, `UNAUTHENTICATED` — missing session token)
**Check**: fetch_url

---

**Scenario**: Sending `status: "reported"` is rejected
**Given**: A `reviews` row with `status = 'published'`, signed in as an admin with `permissions = 'full'`
**When**: `PATCH /v1/admin/reviews/{id}` is sent with body `{ "status": "reported" }`
**Then**: `422` is returned with `error.code = "VALIDATION_FAILED"`; `reviews.status` for that row is unchanged (`reported` is a state a review arrives in, never one an admin sets, per §3.9.6)
**Traces**: contract (PATCH /v1/admin/reviews/{id}, "sending it is `VALIDATION_FAILED`")
**Check**: fetch_url

---

**Scenario**: Sending an out-of-set status value is rejected
**Given**: A `reviews` row with `status = 'published'`, signed in as an admin with `permissions = 'full'`
**When**: `PATCH /v1/admin/reviews/{id}` is sent with body `{ "status": "archived" }`
**Then**: `422` is returned with `error.code = "VALIDATION_FAILED"`; `reviews.status` is unchanged
**Traces**: contract (§3.9.6, "only these two values accepted here")
**Check**: fetch_url

---

**Scenario**: A field the contract does not define is rejected, not ignored
**Given**: A `reviews` row with `status = 'published'`, signed in as an admin with `permissions = 'full'`
**When**: `PATCH /v1/admin/reviews/{id}` is sent with body `{ "status": "hidden", "note": "policy violation" }`
**Then**: `400` is returned with `error.code = "MALFORMED_REQUEST"`; `reviews.status` for that row is unchanged
**Traces**: contract (§2.5, "a field this contract does not define is rejected with `400 MALFORMED_REQUEST` — never accepted and silently ignored")
**Check**: fetch_url

---

**Scenario**: Hiding a review that does not exist
**Given**: No `reviews` row with `id = "does-not-exist"`, signed in as an admin with `permissions = 'full'`
**When**: `PATCH /v1/admin/reviews/does-not-exist` is sent with body `{ "status": "hidden" }`
**Then**: `404` is returned with `error.code = "NOT_FOUND"`
**Traces**: contract (§3.9.6 errors, `NOT_FOUND` 404)
**Check**: fetch_url

---

**Scenario**: Hiding a review while the database is unreachable
**Given**: A `reviews` row with `status = 'published'`, signed in as an admin with `permissions = 'full'`, the database made unreachable (dependency refuses the connection)
**When**: `PATCH /v1/admin/reviews/{id}` is sent with body `{ "status": "hidden" }`
**Then**: `503` is returned with `error.code = "UNAVAILABLE"`; no partial write is recorded
**Traces**: contract (§2.3, `UNAVAILABLE` — "a dependency … refused the connection")
**Check**: fetch_url

---

**Scenario**: A store failure on the write path is reported as INTERNAL, not swallowed
**Given**: A `reviews` row with `status = 'published'`, signed in as an admin with `permissions = 'full'`, the underlying query for this write is made to fail (e.g. the target table/column renamed) while the database itself still accepts connections
**When**: `PATCH /v1/admin/reviews/{id}` is sent with body `{ "status": "hidden" }`
**Then**: `500` is returned with `error.code = "INTERNAL"`; `reviews.status` for that row is unchanged
**Traces**: contract (§2.3, `INTERNAL` — "Unexpected failure, including a query or insert that failed")
**Check**: manual — no tool available to this role can rename a column or otherwise force a query failure distinct from an unreachable database; the 503 case above is covered by `fetch_url` with the database taken down instead

---

**Scenario**: Clicking "Hide" on `/admin/moderation` hides a published review
**Given**: Signed in as an admin with `permissions = 'full'`, `/admin/moderation` loaded with a `published` review visible in the table showing a "Hide" action
**When**: The "Hide" button in that review's row is clicked
**Then**: The row's Status badge reads "hidden" and the row's action button now reads "Publish"
**Traces**: SC (ADMIN-002 AC-1, exercised through the UI action `AdminModeration.tsx` exposes)
**Check**: interact_page

---

**Scenario**: Clicking "Publish" on `/admin/moderation` republishes a hidden review
**Given**: Signed in as an admin with `permissions = 'full'`, `/admin/moderation` loaded with a `hidden` review visible in the table showing a "Publish" action
**When**: The "Publish" button in that review's row is clicked
**Then**: The row's Status badge reads "published" and the row's action button now reads "Hide"
**Traces**: SC (ADMIN-002 AC-2, exercised through the UI action `AdminModeration.tsx` exposes)
**Check**: interact_page

---

**Scenario**: The Hidden stat count reflects a newly hidden review
**Given**: Signed in as an admin with `permissions = 'full'`, `/admin/moderation` loaded, the "Hidden" stat showing some count N
**When**: A published review's "Hide" button is clicked
**Then**: The "Hidden" stat updates to N + 1
**Traces**: SC (ADMIN-002, page's own hidden-count summary staying in sync with the action)
**Check**: interact_page

---

**Scenario**: Filtering the moderation table by status "Hidden"
**Given**: Signed in as an admin with `permissions = 'full'`, `/admin/moderation` loaded with both published and hidden reviews present
**When**: The Status filter is set to "Hidden"
**Then**: Every row shown has a Status badge reading "hidden"; no published or reported row is shown
**Traces**: SC (ADMIN-002, moderation screen's filter-by-status state)
**Check**: interact_page

---

**Scenario**: Empty state — no review matches the current filter
**Given**: Signed in as an admin with `permissions = 'full'`, `/admin/moderation` loaded, the Status filter set to a value with zero matching rows (e.g. searching for text that matches no review)
**When**: The page renders the result
**Then**: The table shows "No review matches these filters." and no data rows
**Traces**: SC (SRS §5 screen states table, `AdminModeration.tsx` — "default, empty")
**Check**: render_url
