## 8.3 Migration plan — The site as designed (SITE-001 to SITE-006)

No schema change, no new endpoint. This story (`docs/site/stories/the-site-as-designed.md`)
ships Home, Trip detail, the Departures board, Guides/Guide and the shared
header/footer/dock as a frontend-only slice reading the mock data already
bundled in `code/frontend/src/data/` — its own story scope states "No
backend stage applies to this story" and PR #23 confirms no mock module
was added or needs swapping.

Every entity SITE-001…006 touches already exists and already traces to
these requirement ids from earlier design work: `products` (§3.5, Traces
to … SITE-001, SITE-002), `departures` (§3.6, Traces to … SITE-001,
SITE-003), `destinations` (§3.7, Traces to SITE-001), `categories`
(§3.8, Traces to SITE-001), `guides` (§3.9, Traces to SITE-004),
`reviews` (§3.10, Traces to SITE-002). The fields each acceptance
criterion reads are already columns: `products.status`/`price`/`image`/
`itinerary`/`includes`/`excludes`/`policy`/`confirmation` (SC-1, SC-5,
SC-6), `departures.state`/`season`/`seats`/`price`/`date` (SC-3, SC-10,
SC-11), `reviews.status`/`rating`/`author`/`reviewed_on`/`text`/`reply`
(SC-7, SC-8), `guides.category`/`slug`/`title`/`excerpt`/`body` (SC-13,
SC-14, SC-15). No column, index or constraint is missing for any SC in
this story.

Every read this story needs is already the `data` module's generic
reader (§3.1.1 `GET /v1/{collection}`, §3.1.2 `GET /v1/{collection}/{id}`),
already listed as serving SITE-001…006 in §10's traceability table
("presentation only — maps to no endpoint of its own; reads `data`/
`search` endpoints already listed"). This story adds nothing to that:
once `Site data from the database` (DATA-001…004, plan item 2) lands,
`Home.tsx`/`Trip.tsx`/`Departures.tsx`/`Guides.tsx`/`Guide.tsx` call
`useCollection`/`useRecord` exactly as they do today against the mock,
per DATA-004's "no component file changes" guarantee — this story's
markup needs no edit either now or then.

**Forward:** none to run. **Backward:** none to run. **Safety on a
populated table:** not applicable — no DDL in this story.

---

## 3.9.6 `PATCH /v1/admin/reviews/{id}` — Admin review moderation (ADMIN-002)

> Note on this file's state: sections §2 (cross-cutting error catalog,
> auth/permissions, pagination, validation boundary) and §3.1–§3.10 from
> the original service design (PR #6) are not present in this file as
> currently committed on `main` — only the tail-end migration-plan
> sections from later self-merged story-design PRs survived. This section
> is written to the contract every merged test case already cites
> (`docs/admin/test-cases/admin-review-moderation.md`, "`§3.9.6`", from PR
> #32) and the same error-code vocabulary used by every sibling admin
> endpoint's test cases (`UNAUTHENTICATED`, `PERMISSION_DENIED`,
> `NOT_FOUND`, `VALIDATION_FAILED`, `MALFORMED_REQUEST`, `INTERNAL`,
> `UNAVAILABLE`) — it does not invent a second catalog. Restoring the
> missing §2/§3.1–§3.10 body is a separate concern, outside this story.

**Auth** — `admin` (full or sub-admin).
**Permissions** — `full`, `moderation-only`. Any other `permissions` value
(e.g. `finance-only`, `content-only`), and any non-admin role (`buyer`,
`supplier`), is denied.

**Request**

```
PATCH /v1/admin/reviews/{id}
{ "status": "hidden" | "published" }
```

No other field is accepted. `reported` is never a value this endpoint
accepts on write — it is a state a review arrives in (flagged elsewhere),
never one an admin sets through this call.

**Response** — `200`

```json
{ "id": "...", "status": "hidden", "updated_at": "..." }
```

**Errors**

| Status | `error.code` | When |
|---|---|---|
| 400 | `MALFORMED_REQUEST` | A field the request body does not define is present (e.g. `note`) |
| 401 | `UNAUTHENTICATED` | No valid session token |
| 403 | `PERMISSION_DENIED` | Signed in, but not `admin`, or an `admin` whose `permissions` is neither `full` nor `moderation-only` |
| 404 | `NOT_FOUND` | No `reviews` row with that `id` |
| 422 | `VALIDATION_FAILED` | `status` is absent, or is a value other than exactly `"hidden"` or `"published"` (including `"reported"` or any out-of-set string) |
| 500 | `INTERNAL` | The update query fails for a reason other than a refused connection |
| 503 | `UNAVAILABLE` | The database refuses the connection |

**Notes**

- Writes `reviews.status` only (erd.md §3.10 — already has the
  `published`/`hidden`/`reported` `CHECK` and the `idx_reviews_status`
  partial index this moderation queue already relies on; no ERD change
  needed for this story).
- `/tours/:id`'s review list already filters to `status = 'published'`
  (SITE-002) — a row this endpoint sets to `hidden` drops off that list
  on its next read, and one set back to `published` reappears, with no
  separate cache or publish step.
- Frontend mock (PR #70, `AdminModeration.tsx`'s `toggleReview`) computes
  the next status client-side (`hidden` ↔ `published`, treating a
  `reported` row the same as any non-`hidden` row — toggled to `hidden`)
  and calls this endpoint with that value already decided. The shape
  matches this contract exactly — no frontend change needed when the
  backend lands; only the `setCollection` call becomes this `PATCH`.

## 8.4 Migration plan — Admin review moderation (ADMIN-002)

No schema change. `reviews.status` and its `CHECK` (`ck_reviews_status`)
and `idx_reviews_status` already exist from the base ERD (erd.md §3.10),
written ahead of this story and already covering every value
(`published`, `hidden`, `reported`) this endpoint reads or writes.

No new table, column, index or constraint. One endpoint added: §3.9.6
above.

**Forward:** none to run. **Backward:** none to run. **Safety on a
populated table:** not applicable — no DDL in this story.

---

## 3.8.1 `GET /v1/supplier/profile` — Supplier registration and verification (SUPPLIERS-001)

**Auth** — `supplier`. Returns the caller's own `suppliers` row only
(`suppliers.user_id = caller.id`); there is no path parameter — a
supplier can never read another's profile by id.

**Response** — `200`

```json
{
  "id": "...", "name": "...", "place": "...", "kind": "...",
  "documents": ["https://cdn.../a.pdf"],
  "verified": false, "rejection_reason": null,
  "bank_name": "...", "bank_account_number": "...", "bank_account_holder": "...",
  "updated_at": "..."
}
```

If the signed-in supplier account has not yet submitted a profile, the
row is created empty at account creation time (so this call never 404s
for a valid `supplier` session — AC-2's "already verified" and the
default "pending" case are both just reads of this same row).

**Errors**

| Status | `error.code` | When |
|---|---|---|
| 401 | `UNAUTHENTICATED` | No valid session token |
| 403 | `PERMISSION_DENIED` | Signed in, but not role `supplier` |
| 500 | `INTERNAL` | The read query fails for a reason other than a refused connection |
| 503 | `UNAVAILABLE` | The database refuses the connection |

## 3.8.2 `PATCH /v1/supplier/profile` — submit/update profile and bank details (SUPPLIERS-001)

**Auth** — `supplier`. Writes only the caller's own row
(`suppliers.user_id = caller.id`) — never accepts an `id`/`supplier_id`
field naming a different row (AC: "Not permitted" in SRS §4.1).

**Request** — any subset of:

```json
{
  "name": "...", "place": "...", "kind": "...",
  "documents": ["https://cdn.../a.pdf"],
  "bank_name": "...", "bank_account_number": "...", "bank_account_holder": "..."
}
```

A field omitted is left unchanged. `verified` and `rejection_reason` are
never accepted here — both are admin-only derived fields (SUPPLIERS-001.2;
`admin` module owns the write).

**Response** — `200` — the updated row, same shape as 3.8.1.

**Errors**

| Status | `error.code` | When |
|---|---|---|
| 400 | `MALFORMED_REQUEST` | A field the request body does not define is present (e.g. `verified`, `rejection_reason`, `id`, `supplier_id`), or any accepted field is sent as `null` (no field here has a "clear it" case — AC-3 requires a value, not a clear) |
| 401 | `UNAUTHENTICATED` | No valid session token |
| 403 | `PERMISSION_DENIED` | Signed in, but not role `supplier` |
| 422 | `VALIDATION_FAILED` | `bank_account_number` present and blank (AC-3) |
| 500 | `INTERNAL` | The write query fails for a reason other than a refused connection |
| 503 | `UNAVAILABLE` | The database refuses the connection |

**Notes**

- Matches the UI PR's mock (`code/frontend/src/lib/mock/supplier-registration-and-verification.ts`,
  PR #56) field-for-field: its `SupplierProfile` (`name`, `documents`,
  `verified`, `rejectionReason`, `bankName`, `bankAccountNumber`,
  `bankAccountHolder`) maps onto this row with only the expected
  camelCase↔snake_case rename (`rejectionReason` → `rejection_reason`,
  etc.) that every other module in this file already uses at the
  HTTP boundary — no frontend change needed when the backend lands,
  only `readProfile`/`writeProfile` become `GET`/`PATCH` calls and
  `uploadDocument` becomes the call at 3.8.13 below.
- The SRS's own "Data touched" table for SUPPLIERS-001 (§4.1) also names
  `place` and `kind` as writable here even though today's
  `SupplierAccount.tsx` screen does not render those two fields yet.
  They are included in the request body above so that a later screen
  change needs no new endpoint — `admin`'s approval queue (ADMIN-001)
  already reads them from this same row.

## 3.8.13 `POST /v1/media` — the shared upload endpoint (SUPPLIERS-006)

**Auth** — `supplier` or `admin`. Does not know or care which form
called it — SUPPLIERS-001's licence upload and SUPPLIERS-002's product
photo upload both call this one endpoint and store the URL it returns
on their own row (`suppliers.documents` / `products.image`).

**Request** — `multipart/form-data`, one field:

| Field | Type | Required | Constraints |
|---|---|---|---|
| `file` | binary | yes | ≤ 10 MB; one of `image/jpeg`, `image/png`, `image/webp`, `application/pdf` |

**Response** — `201`

```json
{ "url": "https://cdn.../abc123.jpg" }
```

An image is compressed server-side before storage (AC-1); a PDF is
stored as-is (AC-2, no compression required for a non-image file).

**Errors**

| Status | `error.code` | When |
|---|---|---|
| 400 | `MALFORMED_REQUEST` | A multipart field other than `file` is present, or `file` is missing |
| 401 | `UNAUTHENTICATED` | No valid session token |
| 403 | `PERMISSION_DENIED` | Signed in, but role is neither `supplier` nor `admin` |
| 422 | `VALIDATION_FAILED` | `file` exceeds 10 MB, or its content-type is not in the accepted set (AC-3) — rejected before any byte is written to storage, so nothing partial is ever left referencing a file that does not exist |
| 503 | `UNAVAILABLE` | The storage/CDN provider rejects the write or cannot be reached (AC-3's upstream-failure row; the same code this file already uses for "a dependency this request needs is unreachable", distinct from `INTERNAL`, which is this service's own query failing) |

**Depends on** — `MEDIA_STORAGE_CLOUD_NAME`, `MEDIA_STORAGE_API_KEY`,
`MEDIA_STORAGE_API_SECRET` (already listed in `overview.md` §6 against
this same requirement). Until a real provider account is wired, Dev may
stub the storage client behind this same interface — the contract above
does not change either way.

## 8.5 Migration plan — Supplier registration and verification (SUPPLIERS-001, SUPPLIERS-006)

No schema change. `suppliers` (`erd.md` §3.4) already has every column
this story reads or writes — `name`, `place`, `kind`, `documents`,
`verified`, `rejection_reason`, `bank_name`, `bank_account_number`,
`bank_account_holder` — plus `uq_suppliers_user_id` (the "one profile,
looked up by the caller's own account" index this module's every read
and write uses) and `idx_suppliers_verified` (used by `admin`'s queue,
not this story). All written in the base ERD migration, ahead of this
story; nothing here adds a table, column, index or constraint.

This story adds three handlers: `GET /v1/supplier/profile` (§3.8.1),
`PATCH /v1/supplier/profile` (§3.8.2), and the shared `POST /v1/media`
(§3.8.13) — the latter did not exist in this file before this story and
is built here since SUPPLIERS-002 (product photos) also depends on it
and has not landed yet.

Reviewed against the UI PR's mock (PR #56,
`code/frontend/src/lib/mock/supplier-registration-and-verification.ts`):
its `SupplierProfile` shape and its `uploadDocument` stand-in match
§3.8.1/§3.8.2/§3.8.13 above one-to-one (see the note under §3.8.2) — no
frontend change required when these handlers replace the mock; only the
two functions' bodies change from a `localStorage` read/write to a real
`fetch`.

**Forward:** none to run — no DDL. **Backward:** none to run.
**Safety on a populated table:** not applicable, no DDL in this story.
