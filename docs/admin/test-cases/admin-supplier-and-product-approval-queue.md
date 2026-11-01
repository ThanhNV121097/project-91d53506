# Test Cases — Admin supplier and product approval queue

Module: `admin` · Requirement: `ADMIN-001` (`docs/admin/SRS.md` §4.1) ·
Contract: `GET /v1/admin/queue`, `POST /v1/admin/suppliers/{id}/approve`,
`POST /v1/admin/suppliers/{id}/reject`, `POST /v1/admin/products/{id}/approve`,
`POST /v1/admin/products/{id}/reject` (`docs/architecture/services.md`
§3.9.1–§3.9.5)

No story plan file exists for this item (`docs/admin/stories/` is absent);
per the test-writing rule, ADMIN-001's own acceptance criteria (AC-1–AC-4)
plus its failure/boundary/permission table are the list this file covers,
together with the contract rules the five endpoints above are held to.

Risk level: **High**. This is the single gate the whole product depends
on — "Supplier creates a product → Admin reviews and approves it →
product is published". A bug here either blocks every supplier
permanently (a working approval that silently fails) or publishes
unreviewed content to Buyers (a rejection that silently succeeds as an
approval). Coverage below is deep on the state transition, the required-
reason rule, the near-simultaneous-decision race, and permission scoping;
shallow on cosmetic queue-list styling.

---

## ADMIN-001 — Approve or reject a supplier profile or a product

**Scenario**: Admin approves a pending supplier profile from the queue UI
**Given**: Signed in as an Admin; a `suppliers` row with `verified: false` is listed on `/admin/queue`
**When**: The Admin clicks that row's "Approve" button
**Then**: The row disappears from the "Supplier profiles" list on screen; a subsequent read of that supplier shows `verified: true`
**Traces**: SC-AC-1 (ADMIN-001 AC-1)
**Check**: interact_page

---

**Scenario**: Approving a supplier profile at the API sets verified true
**Given**: A `suppliers` row with `verified: false`
**When**: `POST /v1/admin/suppliers/{id}/approve` is called
**Then**: Response is `200`; the body shows `verified: true`
**Traces**: SC-AC-1 (ADMIN-001 AC-1), contract (POST /v1/admin/suppliers/{id}/approve)
**Check**: fetch_url

---

**Scenario**: Admin approves a pending product from the queue UI
**Given**: Signed in as an Admin; a `products` row with `status: "pending"` is listed on `/admin/queue`
**When**: The Admin clicks that row's "Approve" button
**Then**: The row's status badge on screen updates away from "pending"; a subsequent read of that product shows `status: "approved"`
**Traces**: SC-AC-2 (ADMIN-001 AC-2)
**Check**: interact_page

---

**Scenario**: Approving a product at the API sets status approved
**Given**: A `products` row with `status: "pending"`
**When**: `POST /v1/admin/products/{id}/approve` is called
**Then**: Response is `200`; the body shows `status: "approved"`
**Traces**: SC-AC-2 (ADMIN-001 AC-2), contract (POST /v1/admin/products/{id}/approve)
**Check**: fetch_url

---

**Scenario**: Admin rejects a product with a reason from the queue UI
**Given**: Signed in as an Admin; a `products` row with `status: "pending"` is listed on `/admin/queue`
**When**: The Admin types "Photos too dark" into the "Reason for rejection" field and clicks "Reject with this reason"
**Then**: A subsequent read of that product shows `status: "rejected"` and `rejection_reason: "Photos too dark"` exactly
**Traces**: SC-AC-3 (ADMIN-001 AC-3)
**Check**: interact_page

---

**Scenario**: Rejecting a product at the API stores the exact reason and it is later visible to the supplier
**Given**: A `products` row with `status: "pending"`, owned by a known Supplier
**When**: `POST /v1/admin/products/{id}/reject` is called with `{ "reason": "Photos too dark" }`
**Then**: Response is `200`; the body shows `status: "rejected"`, `rejection_reason: "Photos too dark"`; the owning Supplier's own read of that product (`GET /v1/supplier/products/{id}`, SUPPLIERS-002 AC-5) also shows `rejection_reason: "Photos too dark"`
**Traces**: SC-AC-3 (ADMIN-001 AC-3), contract (POST /v1/admin/products/{id}/reject)
**Check**: fetch_url

---

**Scenario**: Rejecting a supplier profile also requires and stores a reason visible to that supplier
**Given**: A `suppliers` row with `verified: false`
**When**: `POST /v1/admin/suppliers/{id}/reject` is called with `{ "reason": "Business licence expired" }`
**Then**: Response is `200`; the body shows `rejection_reason: "Business licence expired"`, `verified` unchanged (`false`); a subsequent read of that supplier's own profile shows the same reason text
**Traces**: ADMIN-001 behaviour 3 ("rejecting either requires a reason"), contract (POST /v1/admin/suppliers/{id}/reject)
**Check**: fetch_url

---

**Scenario**: Admin attempts to reject a product from the UI without entering a reason
**Given**: Signed in as an Admin; a `products` row with `status: "pending"` listed on `/admin/queue`; the "Reason for rejection" field left empty
**When**: The Admin clicks "Reject with this reason" with the field still empty
**Then**: An inline validation error renders on the form; the Admin stays on `/admin/queue` with no success state shown; a subsequent read of that product still shows `status: "pending"`
**Traces**: SC-AC-4 (ADMIN-001 AC-4)
**Check**: interact_page

---

**Scenario**: Rejecting a product at the API with a blank reason is rejected as a validation failure
**Given**: A `products` row with `status: "pending"`
**When**: `POST /v1/admin/products/{id}/reject` is called with `{ "reason": "" }`
**Then**: Response is `422 VALIDATION_FAILED`; `status` stays `"pending"`; no `rejection_reason` is set
**Traces**: SC-AC-4 (ADMIN-001 AC-4), contract (POST /v1/admin/products/{id}/reject errors)
**Check**: fetch_url

---

**Scenario**: Rejecting a supplier profile at the API with a blank reason is rejected the same way
**Given**: A `suppliers` row with `verified: false`
**When**: `POST /v1/admin/suppliers/{id}/reject` is called with `{ "reason": "" }`
**Then**: Response is `422 VALIDATION_FAILED`; `verified` stays `false`; no `rejection_reason` is set
**Traces**: SC-AC-4 (ADMIN-001 AC-4), contract (POST /v1/admin/suppliers/{id}/reject errors)
**Check**: fetch_url

---

**Scenario**: "Request edits" uses the same reject action and the same rejected status, differing only in the message sent
**Given**: A `products` row with `status: "pending"`
**When**: `POST /v1/admin/products/{id}/reject` is called with `{ "reason": "Please add a day-by-day itinerary" }` (the UI's "Request edits" control, per `admin/SRS.md` §7's resolved open question)
**Then**: Response is `200`; `status` becomes `"rejected"` exactly as an outright rejection would; `rejection_reason` is set to the request-edits message verbatim, with no separate "edits requested" status value anywhere in the response
**Traces**: ADMIN-001 behaviour 4 (request edits), contract (POST /v1/admin/products/{id}/reject)
**Check**: fetch_url

---

**Scenario**: The queue lists only unverified suppliers and pending products, nothing else
**Given**: `suppliers` rows exist with `verified: true` and `verified: false`; `products` rows exist with `status` values `draft`, `pending`, `approved`, and `rejected`
**When**: `GET /v1/admin/queue` is called by a signed-in Admin
**Then**: Response is `200`; `suppliers` contains only the `verified: false` rows; `products` contains only the `status: "pending"` rows — no `draft`, `approved`, `rejected` or `verified: true` row appears in either list
**Traces**: ADMIN-001 behaviour 1, contract (GET /v1/admin/queue)
**Check**: fetch_url

---

**Scenario**: The queue shows its empty state when nothing is waiting
**Given**: No `suppliers` row has `verified: false` and no `products` row has `status: "pending"`
**When**: An Admin opens `/admin/queue`
**Then**: The page renders "No supplier profile is waiting." for the supplier list and "Nothing is waiting for review." for the product table, with no row in either list
**Traces**: Screen state "empty" (`docs/admin/SRS.md` §5)
**Check**: render_url

---

**Scenario**: A sub-admin without moderation permission is denied this action
**Given**: A signed-in sub-admin with `permissions: "finance-only"`; a `products` row with `status: "pending"`
**When**: `POST /v1/admin/products/{id}/approve` is called with that sub-admin's session
**Then**: Response is `403 PERMISSION_DENIED`; the product's `status` is unchanged (`"pending"`)
**Traces**: Not permitted (ADMIN-001), contract (POST /v1/admin/products/{id}/approve — Permissions: full, moderation-only)
**Check**: fetch_url

---

**Scenario**: A sub-admin scoped to moderation-only can approve a product
**Given**: A signed-in sub-admin with `permissions: "moderation-only"`; a `products` row with `status: "pending"`
**When**: `POST /v1/admin/products/{id}/approve` is called with that sub-admin's session
**Then**: Response is `200`; the body shows `status: "approved"`
**Traces**: Contract (POST /v1/admin/products/{id}/approve — Permissions: full, moderation-only)
**Check**: fetch_url

---

**Scenario**: Two admins approving the same product near-simultaneously — the second is told it is already decided
**Given**: A `products` row with `status: "pending"`
**When**: Two `POST /v1/admin/products/{id}/approve` requests for the same id are fired back-to-back
**Then**: Exactly one request returns `200` with `status: "approved"`; the other returns `409 CONFLICT`; the product's final stored `status` is `"approved"` from the single successful write, never left ambiguous or double-processed
**Traces**: Boundary (ADMIN-001), contract (POST /v1/admin/products/{id}/approve errors)
**Check**: fetch_url

---

**Scenario**: Rejecting a product that another admin already approved is a conflict, not a silent overwrite
**Given**: A `products` row, approved moments earlier by a first admin (`status: "approved"`)
**When**: A second admin calls `POST /v1/admin/products/{id}/reject` with `{ "reason": "Too late" }` against the same id
**Then**: Response is `409 CONFLICT`; `status` stays `"approved"`, not overwritten to `"rejected"`
**Traces**: Boundary (ADMIN-001), contract (POST /v1/admin/products/{id}/reject errors)
**Check**: fetch_url

---

**Scenario**: Approving a nonexistent supplier id is rejected as not found
**Given**: A supplier id that matches no row in `suppliers`
**When**: `POST /v1/admin/suppliers/{id}/approve` is called against that id
**Then**: Response is `404 NOT_FOUND`
**Traces**: Contract (POST /v1/admin/suppliers/{id}/approve errors)
**Check**: fetch_url

---

**Scenario**: Rejecting a nonexistent product id is rejected as not found
**Given**: A product id that matches no row in `products`
**When**: `POST /v1/admin/products/{id}/reject` is called against that id with `{ "reason": "Any reason" }`
**Then**: Response is `404 NOT_FOUND`
**Traces**: Contract (POST /v1/admin/products/{id}/reject errors)
**Check**: fetch_url

---

**Scenario**: A request body field the contract does not define is rejected on product rejection
**Given**: A `products` row with `status: "pending"`
**When**: `POST /v1/admin/products/{id}/reject` is called with `{ "reason": "Photos too dark", "autoNotify": true }`
**Then**: Response is `400 MALFORMED_REQUEST`; `status` stays `"pending"`; no `rejection_reason` is set
**Traces**: Contract (POST /v1/admin/products/{id}/reject)
**Check**: fetch_url

---

**Scenario**: An unauthenticated request to approve a product is rejected
**Given**: No session token (or an invalid/expired one) presented
**When**: `POST /v1/admin/products/{id}/approve` is called against a `pending` product
**Then**: Response is `401 UNAUTHENTICATED`; the product's `status` is unchanged
**Traces**: Contract (POST /v1/admin/products/{id}/approve — Auth: admin)
**Check**: fetch_url

---

**Scenario**: A buyer or supplier token is denied this action, never processed
**Given**: A session token resolving to a `buyer` row (or a `supplier` row); a `products` row with `status: "pending"`
**When**: `POST /v1/admin/products/{id}/approve` is called with that token
**Then**: Response is `403 PERMISSION_DENIED`; the product's `status` is unchanged
**Traces**: Contract (POST /v1/admin/products/{id}/approve — Auth: admin), RBAC (admin/SRS.md §2)
**Check**: fetch_url

---

**Scenario**: Approval fails closed when the database is unreachable
**Given**: A `products` row with `status: "pending"`; the backend is running but the database is made unavailable
**When**: `POST /v1/admin/products/{id}/approve` is called
**Then**: Response is `503 UNAVAILABLE`; after the database is restored, a read of that product still shows `status: "pending"` (no partial write occurred)
**Traces**: Contract (dependency unavailable, §2.3 error catalog)
**Check**: fetch_url

---

**Scenario**: Approving a previously-rejected product clears its stored rejection reason
**Given**: A `products` row with `status: "rejected"` and `rejection_reason: "Photos too dark"`, resubmitted by the Supplier back to `status: "pending"` and now listed on the queue again
**When**: `POST /v1/admin/products/{id}/approve` is called
**Then**: Response is `200`; the body shows `status: "approved"` and `rejection_reason` cleared (null/empty), not still showing the stale reason from the earlier rejection
**Traces**: Contract (POST /v1/admin/products/{id}/approve — success response)
**Check**: fetch_url

---

## Coverage check

| ADMIN-001 criterion | Covered by |
|---|---|
| AC-1 (supplier approve) | Queue UI approve; API approve |
| AC-2 (product approve) | Queue UI approve; API approve |
| AC-3 (product reject with reason, visible to supplier) | Queue UI reject; API reject (reason stored + visible on supplier's own read); supplier-profile reject + visible |
| AC-4 (reject requires a reason) | UI empty-reason attempt; API blank-reason reject (product); API blank-reason reject (supplier) |
| Behaviour 4 ("request edits") | Same reject action, same `rejected` status, message-only difference |
| Behaviour 1 (queue contents) | Queue lists only unverified suppliers / pending products |
| Screen state: empty | Empty-queue render |
| Failure table: Not permitted | Sub-admin without moderation permission denied; moderation-only sub-admin allowed (positive control) |
| Failure table: Boundary (near-simultaneous decisions) | Two admins approving same product; reject-after-approve conflict |
| Contract: not found | Approve nonexistent supplier; reject nonexistent product |
| Contract: undefined field rejected | Extra field on product reject |
| Contract: unauthenticated | No/invalid token on approve |
| Contract: wrong role | Buyer/supplier token denied |
| Contract: dependency unavailable | Database unreachable on approve |
| Contract: approve clears prior rejection reason | Re-approval after resubmission clears `rejection_reason` |

Every acceptance criterion (AC-1–AC-4) and every row of the
failure/boundary/permission table has at least one case above. The
"Request edits" distinction (behaviour 4) and the queue's own filter
(behaviour 1) are covered even though they are not separately numbered,
since both are explicit behaviour statements in ADMIN-001.
