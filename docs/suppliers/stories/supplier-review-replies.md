# Story: Supplier review replies

Module: `suppliers`
Plan item: Supplier review replies
Requirement: SUPPLIERS-006B (Reply to a guest review)

## User story

As a Supplier, I want to publish a reply under a review of my product, so
that I can respond publicly to feedback without an admin in the loop.

## In scope

- Backend for the already-built `/supplier/reviews` screen
  (`SupplierReviews.tsx`): submitting a reply writes `reviews.reply`,
  scoped to a review on one of the signed-in supplier's own products.
- The reply is returned/shown under that review on `/tours/:id`
  (`TripReviews.tsx`, which already renders `reply` when present) and on
  the supplier's own `/supplier/reviews` list.
- Replacing an existing reply with new text (no duplication, no history).
- The "Awaiting your reply" count on `/supplier/reviews` recomputing from
  real data once a reply is saved.
- Ownership check: a supplier may only reply to a review on their own
  product.
- Empty-reply validation: an empty submission is rejected and does not
  clear an existing reply.

## Out of scope

- Hiding a review or changing its visibility (`reviews.status`) — `admin`
  module's review moderation (SUPPLIERS SRS §3, out of scope line).
- Creating or editing the review itself, or its rating — `booking`/buyer
  review flow, not this module.
- Notifying the reviewer that a reply was posted — no requirement or
  design screen calls for this; not part of SUPPLIERS-006B's behaviour.
- Any change to how reviews reach `/tours/:id` in the first place (the
  review list itself, not the reply) — that is the trip detail page's own
  data wiring, already served by the `data` module.
- Multiple replies or a reply thread — the design and SRS both describe
  one reply field (`reviews.reply`), replaced on resubmission (SC-3).

## UI scope

No new screen and no new component. `/supplier/reviews` (`SupplierReviews.tsx`)
already exists from "The site as designed" with a reply form, a
reply/no-reply stats block and a review list, built against mock data.
This story's UI work is limited to swapping that screen's data source and
submit action from the mock to the real endpoint — same markup, same
states (default / empty, per the SRS screens table) — so no UI review
item beyond confirming the swap preserves those states.

## Acceptance criteria

- SC-1 [SUPPLIERS-006B AC-1]: Given a published review on the supplier's
  own product with no reply yet, when the supplier submits reply text on
  `/supplier/reviews`, then `reviews.reply` is set for that review, and
  the text appears under that review on `/tours/:id`.
- SC-2 [SUPPLIERS-006B AC-2]: Given a review on a product the supplier
  does not own, when that supplier attempts to submit a reply to it, then
  the request is rejected and `reviews.reply` on that review is
  unchanged.
- SC-3 [SUPPLIERS-006B AC-3]: Given a review that already has a reply,
  when the supplier submits new reply text, then the existing reply is
  replaced by the new text (one value, not a list) — visible on both
  `/supplier/reviews` and `/tours/:id`.
- SC-4 [SUPPLIERS-006B, "Invalid input" row]: Given the reply textarea is
  submitted empty, when the supplier submits, then an inline validation
  error is shown and `reviews.reply` is not cleared or changed.
- SC-5 [SUPPLIERS-006B behaviour 1, scoped to the screen]: Given the
  supplier has N of their own product's reviews with an empty `reply`
  before a submission, when one reply is saved (SC-1), then the
  "Awaiting your reply" count on `/supplier/reviews` drops by exactly
  one, computed from real data rather than the mock.

## Dependencies

- `auth` module: signed-in supplier session, to resolve the acting
  supplier and check product ownership.
- `data` module: `reviews` and `products` tables/read layer (`reviews.reply`,
  `reviews.product`, `products.supplier`).
- Design/UI baseline: `SupplierReviews.tsx` and `TripReviews.tsx` from "The
  site as designed" (plan item 1) — this story extends them, does not
  recreate them.
- `docs/architecture/erd.md` / `services.md`: this story's technical
  design step adds the reply write endpoint to those docs; it does not
  redesign the `reviews` table.
