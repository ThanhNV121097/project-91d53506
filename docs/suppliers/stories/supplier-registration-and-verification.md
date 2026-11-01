# Story — Supplier registration and verification

Module: `suppliers`
Plan item: Supplier registration and verification
Requirements implemented: SUPPLIERS-001, SUPPLIERS-006 (shared upload endpoint)

## User story

As a Supplier, I want to submit my business/travel-agency licence documents
and bank account details on `/supplier/account`, so that an admin can verify
my profile and I can receive payouts.

## In scope

- The `/supplier/account` profile form: business name, place, kind, licence
  document upload(s), bank name, account number, account holder.
- The shared media upload endpoint `POST /v1/media` (SUPPLIERS-006): accepts
  a file, compresses it when it is an image, stores it, returns a CDN URL.
  Built here because no prior story has built it; "Supplier product create
  edit and approval" reuses this same endpoint for product photos and does
  not rebuild it.
- Persisting the submitted profile to the signed-in supplier's own
  `suppliers` row.
- Showing the current verification status (`verified` true/false) on the
  same screen, including the "waiting" vs "verified" copy.
- Inline validation for required fields (business name, bank account
  number) before anything is written.
- Scoping every read/write to the signed-in supplier's own row.

## Out of scope

- Setting `suppliers.verified = true` — that is Admin's approval action
  (`admin` module, "Admin supplier and product approval queue"); this story
  only submits and displays the resulting status.
- Product photo upload UI — a separate story ("Supplier product create edit
  and approval") calls the same `POST /v1/media` endpoint from its own
  screen; this story does not touch `/supplier/products`.
- Payout history and revenue figures on `/supplier/account` (SUPPLIERS-007)
  — a separate story ("Supplier revenue and payout reporting").
  `/supplier/account` in this story renders only the profile/verification
  section; the payout-history section is left for that story to add.
  Visited before SUPPLIERS-007 lands, the payout section of the screen
  shows no data (that story's responsibility), the verification section is
  fully functional.
- Signed-in session/auth itself — depends on the `auth` module.
- Virus scanning or manual content moderation of uploaded documents — not
  asked for by the SRS or the brief.

## UI scope

Screen: `/supplier/account` (`SupplierAccount.tsx` in the approved design).

States covered:
- **Default / unverified**: form fields editable, current status shows
  "Pending verification" (or similar copy matching the design's existing
  wording), submit button enabled.
- **Verified**: status area shows "Verified" (per SUPPLIERS-001 AC-2),
  form fields remain editable (a verified supplier can still update bank
  details — content fields are not frozen by this requirement).
- **Validation error**: inline error under the bank account number field
  when left empty; form not submitted (SUPPLIERS-001 AC-3).
- **Upload in progress / upload failed**: the design's existing upload
  affordance on this screen is wired to `POST /v1/media`; a failed upload
  shows an error and does not let the form submit with a partial/missing
  document reference.

No new screen is introduced. The payout-history half of this same screen's
layout (owned by SUPPLIERS-007's story) is left exactly as the approved
design mocks it — this story does not add or remove that section.

## Acceptance criteria

- SC-1 [SUPPLIERS-001 AC-1]: A supplier fills business name, uploads a
  licence document via `POST /v1/media`, enters bank name/account
  number/holder, and submits — the `suppliers` row for that account is
  updated with those fields, `documents` reflects the returned CDN URL(s),
  and `verified` stays `false`.
- SC-2 [SUPPLIERS-001 AC-2]: A supplier whose profile has `verified = true`
  opens `/supplier/account` and sees "Verified" status copy, not a
  "waiting" message.
- SC-3 [SUPPLIERS-001 AC-3]: A supplier submits the form with the bank
  account number field empty — an inline validation error appears and the
  `suppliers` row is not written.
- SC-4 [SUPPLIERS-001 permission]: A request to write a `suppliers` row
  other than the signed-in supplier's own is rejected (403/404, never a
  write).
- SC-5 [SUPPLIERS-006 AC-1]: Uploading a product-grade image (JPEG/PNG) to
  `POST /v1/media` returns a CDN URL; the stored file is retrievable at
  that URL and is compressed relative to the original.
- SC-6 [SUPPLIERS-006 AC-2]: Uploading a licence document (PDF) to
  `POST /v1/media` returns a CDN URL for the document; no compression is
  required or attempted for a non-image file.
- SC-7 [SUPPLIERS-006 AC-3]: An upload exceeding the accepted size or an
  unaccepted file type is rejected by `POST /v1/media` with an error; no
  URL is returned and no partial file is stored.
- SC-8 [SUPPLIERS-006 upstream failure]: When the upload called from
  `/supplier/account` fails, the profile form does not submit with a
  partial/missing document reference — the supplier sees an upload-failed
  message and may retry without losing the other filled-in fields.

## Dependencies

- `auth` module: signed-in supplier session (role `supplier`), required to
  scope the `suppliers` row.
- `data` module: the `suppliers` table itself.
- Credentials: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
  `CLOUDINARY_API_SECRET` — requested from the stakeholder for the shared
  media endpoint's storage/CDN provider (Cloudinary). Until supplied, the
  upload endpoint and this screen's document upload cannot be verified
  end-to-end; the rest of the form (fields, validation, status display)
  does not depend on it.
- No dependency on Admin's approval queue story landing first — this story
  only needs the `suppliers.verified` column to exist and default `false`;
  Admin's story writes `true` to it later, order-independent.
