# Test Cases — Supplier product create edit and approval

Module: `suppliers` · Requirements: `SUPPLIERS-002`, `SUPPLIERS-003`,
`SUPPLIERS-006` (`docs/suppliers/SRS.md` §4.2, §4.3, §4.7) · Contract:
`POST /v1/supplier/products`, `PATCH /v1/supplier/products/{id}`,
`POST /v1/media` (`docs/architecture/services.md` §3.8.4, §3.8.5, §3.8.13)

No story plan file exists for this item (`docs/suppliers/stories/` is
absent); per the test-writing rule, the SRS's own acceptance criteria
(AC-1–AC-5 for SUPPLIERS-002, AC-1–AC-2 for SUPPLIERS-003, AC-1–AC-3 for
SUPPLIERS-006) plus each requirement's failure/boundary table are the
list this file covers, together with the contract rules the three
endpoints above are held to.

Risk level: **High**. This is the state machine that decides whether a
listing is live for Buyers at all — an approved product silently staying
`approved` after a price edit, or a paused product still turning up in
search, is a direct Buyer-facing correctness bug, not a cosmetic one. The
shared upload endpoint (SUPPLIERS-006) is load-bearing for two different
forms (this one and supplier registration), so its contract rules get
the same weight as the state-machine ones.

---

**Scenario**: Saving a new product as draft creates the row with entered fields
**Given**: A signed-in Supplier, no existing product
**When**: The Supplier calls `POST /v1/supplier/products` with `name: "Cửa Lò homestay"`, `price: 850000`, `summary`, `itinerary`, `includes`, `excludes`, `policy`
**Then**: Response is `201` with `Location: /v1/supplier/products/{id}`; the body shows `status: "draft"`, `supplier_id` set to the caller's own id, and the submitted fields echoed back
**Traces**: AC-1 (SUPPLIERS-002)
**Check**: fetch_url

---

**Scenario**: Submitting a draft for approval moves it to pending
**Given**: A `products` row owned by the caller with `status: "draft"`, `name` and `price` already set
**When**: The Supplier calls `PATCH /v1/supplier/products/{id}` with `{ "action": "submit" }`
**Then**: Response is `200`; the body shows `status: "pending"`
**Traces**: AC-2 (SUPPLIERS-002)
**Check**: fetch_url

---

**Scenario**: Editing the price of an approved product returns it to pending
**Given**: A `products` row owned by the caller with `status: "approved"`, `price: 2000000`
**When**: The Supplier calls `PATCH /v1/supplier/products/{id}` with `{ "price": 2200000 }`
**Then**: Response is `200`; the body shows `status: "pending"` and `price: 2200000` — not left `approved` with an unreviewed price live
**Traces**: AC-3 (SUPPLIERS-002)
**Check**: fetch_url

---

**Scenario**: Pausing an approved product does not trigger re-approval
**Given**: A `products` row owned by the caller with `status: "approved"`
**When**: The Supplier calls `PATCH /v1/supplier/products/{id}` with `{ "action": "pause" }`
**Then**: Response is `200`; the body shows `status: "suspended"`, never `"pending"` — the pause state is tracked separately from approval
**Traces**: AC-4 (SUPPLIERS-002)
**Check**: fetch_url

---

**Scenario**: A rejection reason is shown on the product screen
**Given**: A `products` row owned by the signed-in Supplier with `status: "rejected"` and `rejection_reason: "Photos too dark"`
**When**: The Supplier opens `/supplier/products/:id`
**Then**: The rendered page displays the text "Photos too dark" on screen
**Traces**: AC-5 (SUPPLIERS-002)
**Check**: render_url

---

**Scenario**: Editing a product owned by another supplier is rejected
**Given**: Supplier A is signed in; a `products` row exists owned by Supplier B
**When**: Supplier A calls `PATCH /v1/supplier/products/{id}` against Supplier B's product with `{ "price": 1000000 }`
**Then**: Response is `404 NOT_FOUND`; Supplier B's row is unchanged
**Traces**: Not permitted (SUPPLIERS-002)
**Check**: fetch_url

---

**Scenario**: Submitting the product edit form with price left blank shows an inline error and submits nothing
**Given**: The Supplier is on `/supplier/products/:id` for a draft product, with the price field cleared
**When**: The Supplier clicks "Submit for approval"
**Then**: An inline validation error renders under the price field; the page stays on the same screen; the product's `status` is still `draft` afterward
**Traces**: Invalid input (SUPPLIERS-002)
**Check**: interact_page

---

**Scenario**: Submitting for approval at the API with price blank is rejected as a validation failure
**Given**: A `products` row owned by the caller with `status: "draft"` and `price` currently `0`/blank
**When**: The Supplier calls `PATCH /v1/supplier/products/{id}` with `{ "action": "submit" }`
**Then**: Response is `422 VALIDATION_FAILED`; `status` stays `draft`, not `pending`
**Traces**: Invalid input (SUPPLIERS-002), contract (PATCH /v1/supplier/products/{id})
**Check**: fetch_url

---

**Scenario**: Two sequential saves on the same product — the later write wins
**Given**: A `products` row owned by the caller with `status: "draft"`, `name: "Original name"`
**When**: Request A calls `PATCH /v1/supplier/products/{id}` with `{ "name": "Name from tab A" }`, then request B calls the same endpoint with `{ "name": "Name from tab B" }`
**Then**: A subsequent `GET /v1/supplier/products/{id}`-equivalent read shows `name: "Name from tab B"` — the later full-form save is the one that persists
**Traces**: Conflict (SUPPLIERS-002)
**Check**: fetch_url

---

**Scenario**: Pausing an approved product removes it from search results
**Given**: A `products` row owned by the caller with `status: "approved"`, currently returned by `GET /v1/search` for its destination
**When**: The Supplier calls `PATCH /v1/supplier/products/{id}` with `{ "action": "pause" }`, then a visitor calls `GET /v1/search` for that same destination
**Then**: The paused product's `status` reads `"suspended"`; the product no longer appears in the `/v1/search` results
**Traces**: AC-1 (SUPPLIERS-003)
**Check**: fetch_url

---

**Scenario**: Unpausing a suspended product is immediately bookable again with no admin step
**Given**: A `products` row owned by the caller with `status: "suspended"`
**When**: The Supplier calls `PATCH /v1/supplier/products/{id}` with `{ "action": "unpause" }`
**Then**: Response is `200`; the body shows `status: "approved"` directly — no intermediate `pending` state
**Traces**: AC-2 (SUPPLIERS-003)
**Check**: fetch_url

---

**Scenario**: Pausing a product owned by another supplier is rejected
**Given**: Supplier A is signed in; a `products` row with `status: "approved"` exists owned by Supplier B
**When**: Supplier A calls `PATCH /v1/supplier/products/{id}` against Supplier B's product with `{ "action": "pause" }`
**Then**: Response is `404 NOT_FOUND`; Supplier B's product `status` is still `"approved"`
**Traces**: Not permitted (SUPPLIERS-003)
**Check**: fetch_url

---

**Scenario**: A request body field the contract does not define is rejected on product create
**Given**: A signed-in Supplier
**When**: `POST /v1/supplier/products` is submitted with a well-formed body plus an extra field the contract does not define (e.g. `"featured": true`)
**Then**: Response is `400 MALFORMED_REQUEST`; no `products` row is created
**Traces**: contract (POST /v1/supplier/products)
**Check**: fetch_url

---

**Scenario**: Supplying `supplier_id` in the create body is rejected
**Given**: A signed-in Supplier
**When**: `POST /v1/supplier/products` is submitted with `name`, `price` and `supplier_id` set to another supplier's id
**Then**: Response is `400 MALFORMED_REQUEST`; no `products` row is created; the server never accepts a client-supplied owner
**Traces**: contract (POST /v1/supplier/products)
**Check**: fetch_url

---

**Scenario**: Mixing an `action` with a content field in one PATCH call is rejected
**Given**: A `products` row owned by the caller
**When**: `PATCH /v1/supplier/products/{id}` is submitted with `{ "action": "submit", "price": 1500000 }`
**Then**: Response is `400 MALFORMED_REQUEST`; neither the `price` nor the `status` is changed
**Traces**: contract (PATCH /v1/supplier/products/{id})
**Check**: fetch_url

---

**Scenario**: An `action` value outside the allowed set is rejected
**Given**: A `products` row owned by the caller
**When**: `PATCH /v1/supplier/products/{id}` is submitted with `{ "action": "publish" }`
**Then**: Response is `400 MALFORMED_REQUEST`; `status` is unchanged
**Traces**: contract (PATCH /v1/supplier/products/{id})
**Check**: fetch_url

---

**Scenario**: Supplying `status` directly in the PATCH body is rejected
**Given**: A `products` row owned by the caller with `status: "draft"`
**When**: `PATCH /v1/supplier/products/{id}` is submitted with `{ "status": "approved" }`
**Then**: Response is `400 MALFORMED_REQUEST`; `status` stays `"draft"` — approval is never set directly by the supplier
**Traces**: contract (PATCH /v1/supplier/products/{id})
**Check**: fetch_url

---

**Scenario**: Pausing a product that is not currently approved is a conflict
**Given**: A `products` row owned by the caller with `status: "pending"`
**When**: `PATCH /v1/supplier/products/{id}` is submitted with `{ "action": "pause" }`
**Then**: Response is `409 CONFLICT`; `status` stays `"pending"`
**Traces**: contract (PATCH /v1/supplier/products/{id})
**Check**: fetch_url

---

**Scenario**: Unpausing a product that is not currently suspended is a conflict
**Given**: A `products` row owned by the caller with `status: "approved"`
**When**: `PATCH /v1/supplier/products/{id}` is submitted with `{ "action": "unpause" }`
**Then**: Response is `409 CONFLICT`; `status` stays `"approved"`
**Traces**: contract (PATCH /v1/supplier/products/{id})
**Check**: fetch_url

---

**Scenario**: Editing a nonexistent product id is rejected as not found
**Given**: A product id that matches no row in `products`
**When**: `PATCH /v1/supplier/products/{id}` is submitted against that id with `{ "price": 1000000 }`
**Then**: Response is `404 NOT_FOUND`
**Traces**: contract (PATCH /v1/supplier/products/{id})
**Check**: fetch_url

---

**Scenario**: An unauthenticated request to create a product is rejected
**Given**: No session token (or an invalid/expired one) presented
**When**: `POST /v1/supplier/products` is submitted with an otherwise-valid body
**Then**: Response is `401 UNAUTHENTICATED`; no `products` row is created
**Traces**: contract (POST /v1/supplier/products — Auth: supplier)
**Check**: fetch_url

---

**Scenario**: Uploading a product photo returns a CDN URL and the stored copy is compressed
**Given**: A signed-in Supplier; a JPEG file larger than its compressed output
**When**: The Supplier calls `POST /v1/media` with that file in the `file` field
**Then**: Response is `201` with `{ "url": "https://cdn.../..." }`; the file is retrievable at that URL and its stored size is smaller than the original upload
**Traces**: AC-1 (SUPPLIERS-006)
**Check**: fetch_url

---

**Scenario**: Uploading a licence document (PDF) returns a CDN URL without compression
**Given**: A signed-in Supplier; a valid PDF file under the size limit
**When**: The Supplier calls `POST /v1/media` with that file in the `file` field
**Then**: Response is `201` with `{ "url": "https://cdn.../..." }`; the file is retrievable at that URL and its stored size matches the original (no compression applied to a non-image file)
**Traces**: AC-2 (SUPPLIERS-006)
**Check**: fetch_url

---

**Scenario**: A file over the size limit is rejected with no partial file stored
**Given**: A signed-in Supplier; a JPEG file larger than 10 MB
**When**: The Supplier calls `POST /v1/media` with that file in the `file` field
**Then**: Response is `422 VALIDATION_FAILED`; no `url` is returned; no file is retrievable at any URL for this attempt
**Traces**: AC-3 (SUPPLIERS-006)
**Check**: fetch_url

---

**Scenario**: A file of an unaccepted type is rejected
**Given**: A signed-in Supplier; a `.exe` file under the size limit
**When**: The Supplier calls `POST /v1/media` with that file in the `file` field
**Then**: Response is `422 VALIDATION_FAILED`; no `url` is returned
**Traces**: AC-3 (SUPPLIERS-006)
**Check**: fetch_url

---

**Scenario**: A file exactly at the 10 MB limit is accepted
**Given**: A signed-in Supplier; a JPEG file exactly 10 MB
**When**: The Supplier calls `POST /v1/media` with that file in the `file` field
**Then**: Response is `201` with a `url` returned
**Traces**: Boundary (SUPPLIERS-006, contract ≤ 10 MB)
**Check**: fetch_url

---

**Scenario**: A storage/CDN write failure returns no partial reference
**Given**: A signed-in Supplier; the media storage dependency arranged to refuse the write
**When**: The Supplier calls `POST /v1/media` with a valid product photo
**Then**: Response is `503 UNAVAILABLE`; no `url` is returned in the body
**Traces**: Upstream failure (SUPPLIERS-006)
**Check**: fetch_url

---

**Scenario**: A storage/CDN write failure shows an upload-failed message and keeps the form's other fields
**Given**: A signed-in Supplier on `/supplier/products/:id` with the title and other fields already filled in, and the media storage dependency arranged to refuse the write
**When**: The Supplier uploads a valid product photo through the page's upload control
**Then**: An upload-failed message renders on screen; the title and the other fields the Supplier already entered are still present in their inputs, not cleared
**Traces**: Upstream failure (SUPPLIERS-006)
**Check**: interact_page

---

**Scenario**: An unrecognized multipart field on the upload endpoint is rejected
**Given**: A signed-in Supplier
**When**: `POST /v1/media` is submitted with the `file` field plus an extra multipart field the contract does not define (e.g. `"caption"`)
**Then**: Response is `400 MALFORMED_REQUEST`; no file is stored and no `url` is returned
**Traces**: contract (POST /v1/media)
**Check**: fetch_url

---

**Scenario**: An unauthenticated upload request is rejected
**Given**: No session token (or an invalid/expired one) presented
**When**: `POST /v1/media` is submitted with a valid file
**Then**: Response is `401 UNAUTHENTICATED`; no file is stored
**Traces**: contract (POST /v1/media — Auth: supplier or admin)
**Check**: fetch_url
