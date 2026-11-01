# Story — Wishlist

Module: `account`
SRS: `docs/account/SRS.md` (ACCOUNT-002)

## User story

As a signed-in Buyer, I want to save or remove a product from my wishlist
and have it persist on my account, so that my saved trips are not tied to
one browser and survive signing out/in anywhere.

## Scope

**In scope**
- Toggling the wishlist heart/button on a Trip page, persisted server-side
  against the signed-in Buyer's account (replaces the design's
  localStorage-only mock).
- `/wishlist` listing the signed-in Buyer's saved products, read from that
  stored association.
- Removing a product from `/wishlist`.
- Empty state on `/wishlist` when nothing is saved.
- Sign-in requirement for the toggle (unauthenticated attempt rejected or
  redirected to sign-in).

**Out of scope**
- The wishlist UI's visual layout and empty-state copy — already built by
  `site` (SITE-006); this story only replaces the mock's data source.
- Booking/creating anything from a wishlist item — `booking` module.
- Sign-in/sign-up itself and session issuance — `auth` module
  (AUTH-001..004); this story only consumes the signed-in session.
- Product detail content (photos, itinerary, price) — `catalogue`/`site`
  modules; the wishlist only stores a product id reference.
- Any notification when a wishlisted product's price or availability
  changes — not in the SRS, not built here.

## UI scope

No new screens. `/wishlist` and the Trip page's wishlist toggle are already
built by the design (`code/frontend/src`) against `localStorage`. This
story's UI work is swapping that mock for real API calls:
- Trip page wishlist toggle button: same states (saved/unsaved) as shipped,
  now calling the backend instead of `localStorage`.
- `/wishlist` page: same default/empty states as shipped (`design-system.md`
  §2, `ACCOUNT-002` screens table), now reading from the backend.
- Signed-out visitor hitting the toggle: redirected to sign-in (consistent
  with how the design already gates other account actions), per
  `RequireRole`/sign-in pattern already in the product.

## Acceptance criteria

- SC-1 [ACCOUNT-002 AC-1]: A signed-in Buyer saves product
  `cua-lo-beach-2n1d` from its Trip page; after signing out and back in on a
  different browser, `/wishlist` still lists that product.
- SC-2 [ACCOUNT-002 AC-2]: A Buyer removes a previously saved product from
  `/wishlist`; after reload, it no longer appears in the list.
- SC-3 [ACCOUNT-002 AC-3]: A Buyer with nothing saved opens `/wishlist`; the
  empty-state message renders (per SITE-006 wording), not an error or a
  blank screen.
- SC-4 [ACCOUNT-002 Not permitted]: An unauthenticated visitor attempts to
  toggle the wishlist button (directly, bypassing the UI, or via the API);
  the write is rejected or the visitor is redirected to sign-in — no
  wishlist row is created for no account.
- SC-5 [ACCOUNT-002]: Saving a product already on the Buyer's wishlist is
  idempotent — toggling it again removes it rather than creating a
  duplicate row.

## Dependencies

- `auth` module: signed-in Buyer session (this story only consumes it, does
  not build sign-in).
- A Buyer-to-product association table — new, created by this story
  (ACCOUNT-002 "Data touched"); no other story owns it.
- Product id referenced is the catalogue's existing product id
  (`schema.json`'s `products` collection) — no new product data.

## Notes for Dev

- Replace `localStorage` reads/writes in the wishlist toggle and
  `/wishlist` page with calls to the new endpoint(s); keep every existing
  UI state (saved/unsaved icon, empty-state copy) unchanged.
- Toggle is a single idempotent action (add if absent, remove if present) —
  no separate add/remove endpoints required unless simpler given the
  existing component's call shape.
