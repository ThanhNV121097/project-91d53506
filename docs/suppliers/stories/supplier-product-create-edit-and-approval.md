# Story — Supplier product create edit and approval

Module: `suppliers`
Requirements implemented: SUPPLIERS-002, SUPPLIERS-003, SUPPLIERS-006

## User story

As a Supplier, I want to create or edit a product on
`/supplier/products/:id`, move it through Draft → Pending → Approved /
Rejected, and pause an approved product without losing its approval, so
that only reviewed listings reach Buyers and I can stop taking bookings
temporarily without resubmitting.

## Scope

**In scope**

- `/supplier/products` list screen (own products only, with status).
- `/supplier/products/:id` create/edit form: title, description, photos,
  itinerary, inclusions/exclusions, cancellation policy, price.
- Save as draft (`status = 'draft'`).
- Submit for approval (`status = 'pending'`).
- Editing price or content fields of an `approved` product resets it to
  `pending` on save.
- Editing a non-price/non-content field (pause toggle) does not trigger
  re-approval.
- Showing a rejection reason on the edit screen until the product is next
  submitted and decided again.
- Pause/unpause toggle on an approved product (`status = 'suspended'` /
  back to `'approved'`), SUPPLIERS-003.
- The shared upload endpoint `POST /v1/media` (SUPPLIERS-006): accepts a
  file, compresses it when it is an image, stores it, returns a CDN URL.
  Built here as its first consumer; this story's product-photo field is
  the only caller wired up in this slice.
- Ownership check: a supplier may only read/write their own `products`
  rows.

**Out of scope**

- The admin decision that sets `pending` to `approved`/`rejected`, and
  writing the rejection reason — `admin` module's approval queue. This
  story only submits and displays the resulting status/reason.
- Departure dates, capacity and seasonal pricing (SUPPLIERS-004) — its
  own story; the edit screen's calendar section is not built here.
- Booking/passenger management on a product (SUPPLIERS-005) — its own
  story.
- Supplier registration/profile/document upload (SUPPLIERS-001) — its
  own story; it reuses the `POST /v1/media` endpoint this story builds,
  but that story's form is not touched here.
- Review replies (SUPPLIERS-006B) and revenue/payout figures
  (SUPPLIERS-007) — their own stories.
- Guest check-in via QR — not specified anywhere in this module (see
  SRS 4.4 "Not applicable").
- A product's visibility in `/search` or on `/tours/:id` as a Buyer sees
  it — that rendering belongs to the storefront/search stories; this
  story is only responsible for the `products` row's `status` being
  correct for them to read.

## UI scope

Both screens already exist in the approved design (mock data only):

- `SupplierProducts.tsx` (`/supplier/products`) — default and empty
  states already drawn; this story wires the list to the supplier's own
  real `products` rows and their `status` badge.
- `SupplierProduct.tsx` (`/supplier/products/:id`) — default and saved
  states already drawn, including the rejection-reason display and the
  pause toggle; this story wires its save/submit actions to the backend
  and its photo field to `POST /v1/media`.

No new screen or state is introduced. `Badge` tones for `draft` /
`pending` / `approved` / `rejected` / `suspended` use the existing
`neutral`/`warn`/`good`/`bad` mapping already defined in
`design/design-system.md` §2.9 — no new tone is invented.

## Acceptance criteria

- SC-1 [SUPPLIERS-002 AC-1]: Filling the new-product form and saving as
  draft creates a `products` row with `status = 'draft'` and the entered
  fields, owned by the signed-in supplier.
- SC-2 [SUPPLIERS-002 AC-2]: Submitting a draft product for approval sets
  its `status` to `pending`.
- SC-3 [SUPPLIERS-002 AC-3]: Changing the `price` of an `approved` product
  and saving sets `status` back to `pending`, not left `approved`.
- SC-4 [SUPPLIERS-002 AC-3]: Changing any of `name`, `summary`,
  `itinerary`, `includes`, `excludes` or `policy` on an `approved` product
  and saving sets `status` back to `pending`.
- SC-5 [SUPPLIERS-002 AC-4]: Toggling only the pause state on an
  `approved` product and saving leaves `status` as `approved`/`suspended`
  per SC-7/SC-8, never moving it to `pending`.
- SC-6 [SUPPLIERS-002 AC-5]: A product rejected with a reason shows that
  reason on `/supplier/products/:id` until the product is next submitted.
- SC-7 [SUPPLIERS-003 AC-1]: Pausing an `approved` product sets
  `status = 'suspended'`; a `/search` or Home query for `status =
  'approved'` no longer returns it (verified by this story's own read of
  the row — the search screen's own query is out of scope).
- SC-8 [SUPPLIERS-003 AC-2]: Unpausing a `suspended` product sets
  `status` directly back to `approved`, with no `pending` step and no
  admin action in between.
- SC-9 [SUPPLIERS-002, not permitted]: A request to edit, submit, pause
  or unpause a product whose `supplier` is not the signed-in supplier's
  own id is rejected and the row is unchanged.
- SC-10 [SUPPLIERS-002, invalid input]: Submitting for approval with
  `title` or `price` empty returns an inline validation error and leaves
  `status` unchanged (not moved to `pending`).
- SC-11 [SUPPLIERS-006 AC-1]: Uploading a product photo (JPEG/PNG) to
  `POST /v1/media` returns a CDN URL; the file is retrievable at that URL
  and is smaller than the original upload (compressed).
- SC-12 [SUPPLIERS-006 AC-3]: An upload exceeding the accepted size or an
  unaccepted file type is rejected by `POST /v1/media` with an error; no
  URL is returned and no file is stored.
- SC-13 [SUPPLIERS-006, upstream failure]: If `POST /v1/media` fails for
  a photo attached to a product save, the product form does not save a
  broken/partial image reference — the supplier sees the upload failed
  and may retry without losing the rest of the form's entered fields.

## Dependencies

- `auth` module: the signed-in supplier session and role check (RBAC) —
  must exist for the ownership checks in SC-9 to be enforceable server-side.
- `data` module: the `products` table/columns this story writes
  (`status`, `name`, `summary`, `itinerary`, `includes`, `excludes`,
  `policy`, `price`, `image`, `supplier`).
- Media/CDN storage credentials for `POST /v1/media` (`MEDIA_STORAGE_*`,
  already listed in `code/backend/.env.example` per
  `docs/architecture/overview.md` §6) — provider to be chosen when this
  story's backend lands; until then uploads fail closed per SC-12/SC-13,
  which is the correct behaviour, not a blocker to building the rest of
  this story.
- No dependency on SUPPLIERS-004 (calendar) or SUPPLIERS-005 (bookings) —
  this story's product row does not require departures to exist.
