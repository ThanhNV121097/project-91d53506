# Test cases — Supplier registration and verification

Module: `suppliers`. Covers SUPPLIERS-001 (`/supplier/account` profile and
bank submission) and SUPPLIERS-006 (shared `POST /v1/media` upload
endpoint, used here for licence documents). Traces to
`docs/suppliers/SRS.md` §4.1 and §4.7, and to `docs/architecture/services.md`
§3.8.1, §3.8.2, §3.8.13 and the cross-cutting contract in §2.

No story plan exists yet for this module (only the SRS), so the SRS's own
`AC-n` lists are the criteria this file covers, per the task's fallback
rule. Risk level: **high** — this is the gate before a supplier can ever
receive a payout, and it is the first of two functions that write to the
`suppliers` row, so permission and partial-write failures get full
coverage alongside the happy path.

## SUPPLIERS-001 — Submit profile and documents for verification

**Scenario**: Submitting a complete profile persists business, document and bank fields with verified still false
**Given**: A signed-in supplier account with no `suppliers` row yet
**When**: The form on `/supplier/account` is filled with business name, place, kind, a licence document uploaded via `POST /v1/media` (returned URL attached), and bank name/account number/account holder, then submitted via `PATCH /v1/supplier/profile`
**Then**: `GET /v1/supplier/profile` returns `200` with `name`, `place`, `kind` and the bank fields set to the submitted values, `documents` containing the uploaded URL, and `verified: false`
**Traces**: SUPPLIERS-001 AC-1
**Check**: fetch_url

**Scenario**: A verified supplier sees their verified status, not a waiting message
**Given**: A signed-in supplier whose `suppliers` row has `verified = true`
**When**: `/supplier/account` is opened
**Then**: The page displays the verified status text, and does not display the "pending"/"waiting for review" copy shown to an unverified supplier
**Traces**: SUPPLIERS-001 AC-2
**Check**: render_url

**Scenario**: Submitting with an empty bank account number shows an inline error and writes nothing
**Given**: A signed-in supplier on `/supplier/account` with the form filled except the bank account number field left blank
**When**: The form is submitted
**Then**: An inline validation error is shown next to the bank account number field, the other fields typed into the form remain visible and filled (not cleared), and `GET /v1/supplier/profile` afterwards shows the row unchanged from before the submit attempt
**Traces**: SUPPLIERS-001 AC-3; failure table "Invalid input"
**Check**: interact_page

**Scenario**: A field sent as the empty string is rejected the same way a missing one is
**Given**: A signed-in supplier with an existing `suppliers` row
**When**: `PATCH /v1/supplier/profile` is called with `bank_account_number` set to `""`
**Then**: `422 VALIDATION_FAILED` is returned with a `details` entry naming `bank_account_number`, and the stored row is unchanged
**Traces**: SUPPLIERS-001 AC-3; contract (`PATCH /v1/supplier/profile`, §3.8.2 errors)
**Check**: fetch_url

**Scenario**: A document upload that fails leaves the profile form intact and tells the supplier to retry
**Given**: A signed-in supplier on `/supplier/account` with business name and bank fields already filled in, attaching a file to the licence-document picker that the upload endpoint will reject (wrong type)
**When**: The upload is attempted (the form's own call to `POST /v1/media`)
**Then**: An upload-failed message is shown, the business name and bank fields already typed remain filled, no document URL is attached to the form, and the form has not been submitted with a partial/missing document reference
**Traces**: SUPPLIERS-001 "Upstream failure" row
**Check**: interact_page

**Scenario**: A supplier cannot target another supplier's row through this endpoint
**Given**: Two signed-in supplier accounts, Supplier A and Supplier B, each with their own `suppliers` row
**When**: Supplier A calls `PATCH /v1/supplier/profile` with an `id` field set to Supplier B's supplier id alongside a changed `name`
**Then**: `400 MALFORMED_REQUEST` is returned (the endpoint accepts no `id`/`supplier_id` field — it always resolves to the caller's own row), and Supplier B's row is unchanged
**Traces**: SUPPLIERS-001 "Not permitted" row; contract (`PATCH /v1/supplier/profile`, §2.5)
**Check**: fetch_url

**Scenario**: `verified` cannot be set through the profile endpoint
**Given**: A signed-in supplier with `verified = false`
**When**: `PATCH /v1/supplier/profile` is called with `verified: true` included in the body
**Then**: `400 MALFORMED_REQUEST` is returned and the row's `verified` value stays `false`
**Traces**: contract (`PATCH /v1/supplier/profile`, §3.8.2 "`verified` is never accepted")
**Check**: fetch_url

**Scenario**: A field the contract does not define is rejected, not ignored
**Given**: A signed-in supplier
**When**: `PATCH /v1/supplier/profile` is called with a body containing `"commission_rate": 0.2` alongside valid fields
**Then**: `400 MALFORMED_REQUEST` is returned and no field in the body is written, including the valid ones sent in the same call
**Traces**: contract (§2.5 "a field this contract does not define")
**Check**: fetch_url

**Scenario**: A field sent as `null` is rejected rather than clearing the stored value
**Given**: A signed-in supplier whose row already has `place` set
**When**: `PATCH /v1/supplier/profile` is called with `"place": null`
**Then**: `422 VALIDATION_FAILED` is returned and the stored `place` value is unchanged
**Traces**: contract (`PATCH /v1/supplier/profile`, §3.8.2 "a field is never cleared… `null` is rejected")
**Check**: fetch_url

**Scenario**: Reading the profile before any row exists returns not-found
**Given**: A signed-in supplier account that has never submitted the form
**When**: `GET /v1/supplier/profile` is called
**Then**: `404 NOT_FOUND` is returned
**Traces**: contract (`GET /v1/supplier/profile`, §3.8.1)
**Check**: fetch_url

**Scenario**: An unauthenticated caller cannot read or write the profile
**Given**: No session token sent
**When**: `GET /v1/supplier/profile` and `PATCH /v1/supplier/profile` are each called without an `Authorization` header or `session` cookie
**Then**: Both return `401 UNAUTHENTICATED`
**Traces**: contract (§2.2, §2.3 `UNAUTHENTICATED`)
**Check**: fetch_url

**Scenario**: A buyer session cannot write a supplier profile
**Given**: A signed-in account with `role = 'buyer'`
**When**: `PATCH /v1/supplier/profile` is called with a valid body
**Then**: `403 PERMISSION_DENIED` is returned and no `suppliers` row is created for that account
**Traces**: contract (§2.2 "each handler then authorizes per-resource"; §2.3 `PERMISSION_DENIED`)
**Check**: fetch_url

## SUPPLIERS-006 — Shared media upload endpoint

**Scenario**: Uploading a product-sized JPEG/PNG returns a working, compressed CDN URL
**Given**: A signed-in supplier, and a JPEG file under 10 MB
**When**: `POST /v1/media` is called with that file as `file`
**Then**: `201` is returned with a `url` field, the file is retrievable at that URL, and its stored size is smaller than the uploaded original
**Traces**: SUPPLIERS-006 AC-1; contract (`POST /v1/media`, §3.8.13)
**Check**: fetch_url

**Scenario**: Uploading a licence PDF returns a CDN URL without requiring compression
**Given**: A signed-in supplier, and a PDF file under 10 MB
**When**: `POST /v1/media` is called with that file as `file`
**Then**: `201` is returned with a `url` field, and the file is retrievable at that URL at its original size
**Traces**: SUPPLIERS-006 AC-2; contract (`POST /v1/media`, §3.8.13)
**Check**: fetch_url

**Scenario**: A file over 10 MB is rejected and nothing is stored
**Given**: A signed-in supplier, and a file of 11 MB with an otherwise accepted content type
**When**: `POST /v1/media` is called with that file as `file`
**Then**: `422 VALIDATION_FAILED` is returned, no `url` is returned, and no object exists at any URL that would have been issued
**Traces**: SUPPLIERS-006 AC-3; failure table "Invalid input"
**Check**: fetch_url

**Scenario**: A file of an unaccepted type is rejected and nothing is stored
**Given**: A signed-in supplier, and a `.docx` file under 10 MB
**When**: `POST /v1/media` is called with that file as `file`
**Then**: `422 VALIDATION_FAILED` is returned and no `url` is returned
**Traces**: SUPPLIERS-006 AC-3; failure table "Invalid input"
**Check**: fetch_url

**Scenario**: A storage/CDN write failure is reported as a retryable upstream failure, not a silent partial write
**Given**: A signed-in supplier, a valid JPEG under 10 MB, and the media storage dependency arranged to refuse the write
**When**: `POST /v1/media` is called with that file as `file`
**Then**: `503 UNAVAILABLE` is returned, no `url` is returned, and the calling form's other already-filled fields are untouched (verified via the SUPPLIERS-001 upload-failure scenario above)
**Traces**: SUPPLIERS-006 "Upstream failure" row
**Check**: fetch_url

**Scenario**: An unauthenticated caller cannot upload
**Given**: No session token sent
**When**: `POST /v1/media` is called with a valid JPEG as `file`
**Then**: `401 UNAUTHENTICATED` is returned
**Traces**: contract (§2.2, §2.3 `UNAUTHENTICATED`)
**Check**: fetch_url

**Scenario**: A buyer session cannot use the upload endpoint
**Given**: A signed-in account with `role = 'buyer'`
**When**: `POST /v1/media` is called with a valid JPEG as `file`
**Then**: `403 PERMISSION_DENIED` is returned
**Traces**: contract (`POST /v1/media`, §3.8.13 "Auth — `supplier` or `admin`")
**Check**: fetch_url

**Scenario**: An unrecognized multipart field is rejected, not silently dropped
**Given**: A signed-in supplier
**When**: `POST /v1/media` is called with the valid `file` field plus an extra multipart field `"caption": "Our best room"`
**Then**: `400 MALFORMED_REQUEST` is returned and no file is stored
**Traces**: contract (§2.5 "an unrecognized multipart field")
**Check**: fetch_url
