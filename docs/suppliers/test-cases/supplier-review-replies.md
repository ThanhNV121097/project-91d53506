# Test cases — Supplier review replies

Module: `suppliers`. Covers SUPPLIERS-006B (`/supplier/reviews` reply
form and reply/no-reply stats). Traces to `docs/suppliers/SRS.md` §4.6
and to `docs/architecture/services.md` §3.8.12
(`POST /v1/supplier/reviews/{id}/reply`), plus the cross-cutting error
contract, pagination and validation-boundary rules in §2, and
`docs/architecture/erd.md` §3.10 (`reviews.reply`).

No story plan exists yet for this module (only the SRS), so the SRS's
own `AC-n` list under SUPPLIERS-006B, plus its failure/boundary/
permission table, is the list this file covers, per the task's fallback
rule.

Risk level: **medium**. A leak across suppliers (replying to, or
reading, another supplier's reviews) is a privacy rule the SRS and the
module's non-functional requirement both name by name, so that gets full
coverage. The arithmetic here is a single field write, not money, so
depth stays proportionate: happy path, replace-not-duplicate, ownership
denial, empty-submission rejection, cross-surface visibility (the reply
must show on both `/supplier/reviews` and the public `/tours/:id`), and
the stat count, plus the contract's own shape rules.

---

## SUPPLIERS-006B AC-1 — Submitting a reply sets `reviews.reply` and shows on `/tours/:id`

**Scenario**: Submitting a reply via the API sets `reviews.reply`
**Given**: A signed-in supplier owns a product with a `published` review that has no reply yet
**When**: `POST /v1/supplier/reviews/{id}/reply` is called with `{ "reply": "Thanks for staying with us!" }`
**Then**: `200` is returned with the updated review showing `reply: "Thanks for staying with us!"`
**Traces**: SUPPLIERS-006B AC-1; contract (`POST /v1/supplier/reviews/{id}/reply`, §3.8.12)
**Check**: fetch_url

**Scenario**: A submitted reply appears on the public trip page under that review
**Given**: A supplier has just set a reply on a `published` review of their own product (as above)
**When**: A visitor opens `/tours/:id` for that product
**Then**: The review block for that review shows the reply text "Thanks for staying with us!" under it, signed with the supplier's name
**Traces**: SUPPLIERS-006B AC-1, behaviour 2; SITE-002 AC-3 cross-reference (`TripReviews.tsx` renders `reply` when present)
**Check**: render_url

**Scenario**: Typing a reply and submitting it on `/supplier/reviews` publishes it
**Given**: A signed-in supplier is on `/supplier/reviews`, viewing a review row with no reply yet
**When**: The supplier types "Thanks for staying with us!" into the "Reply to a review" textarea and clicks "Publish reply"
**Then**: That review's row in the table now shows the "Replied" badge instead of "No reply"
**Traces**: SUPPLIERS-006B AC-1
**Check**: interact_page

---

## SUPPLIERS-006B AC-2 — Replying to a review on a product the supplier does not own is rejected

**Scenario**: Replying to another supplier's review is rejected via the API
**Given**: Supplier A is signed in; a `published` review exists on a product owned by Supplier B
**When**: Supplier A calls `POST /v1/supplier/reviews/{supplier_b_review_id}/reply` with `{ "reply": "Nice try" }`
**Then**: `404 NOT_FOUND` is returned; a follow-up read of that review (as Supplier B) shows `reply` unchanged from before the attempt
**Traces**: SUPPLIERS-006B AC-2; contract (§3.8.12 errors, "review not found, or its product not owned by the caller")
**Check**: fetch_url

**Scenario**: A supplier's own reviews list never shows another supplier's review to reply to
**Given**: Supplier A is signed in; Supplier A has reviews on their own products, Supplier B has reviews on theirs
**When**: Supplier A opens `/supplier/reviews`
**Then**: Every row in the table belongs to a product owned by Supplier A; no row names a product belonging to Supplier B
**Traces**: SUPPLIERS-006B AC-2; non-functional "never exposed to another supplier's session"
**Check**: render_url

---

## SUPPLIERS-006B AC-3 — A new reply replaces the existing one, never duplicates it

**Scenario**: Submitting a new reply replaces the existing text via the API
**Given**: A signed-in supplier owns a product with a review whose `reply` is already `"Thanks for visiting!"`
**When**: `POST /v1/supplier/reviews/{id}/reply` is called with `{ "reply": "Thanks again, hope to see you soon!" }`
**Then**: `200` is returned; the review's `reply` is now exactly `"Thanks again, hope to see you soon!"`, with no trace of the old text appended or stored alongside it
**Traces**: SUPPLIERS-006B AC-3; contract (§3.8.12 "the updated review (`reply` replaced, not duplicated)")
**Check**: fetch_url

**Scenario**: Replacing a reply on the trip page shows only the new text
**Given**: The same review as above, now carrying the replaced reply
**When**: A visitor opens `/tours/:id` for that product
**Then**: The review's reply block shows exactly "Thanks again, hope to see you soon!" and not the earlier "Thanks for visiting!" text anywhere on the page
**Traces**: SUPPLIERS-006B AC-3
**Check**: render_url

---

## SUPPLIERS-006B — "Awaiting your reply" count drops by one after a reply is published

**Scenario**: Publishing a reply decreases the awaiting-reply count by exactly one
**Given**: A signed-in supplier is on `/supplier/reviews` with a known "Awaiting your reply" count, including one review with no reply yet
**When**: The supplier submits a reply to that one review and the screen's stats refresh
**Then**: The "Awaiting your reply" figure reads exactly one less than it did before the submission
**Traces**: Function description ("the 'Awaiting your reply' count drops by one")
**Check**: interact_page

---

## Failure, boundary and permission behaviour

**Scenario**: An empty reply submission is rejected and does not clear an existing reply
**Given**: A signed-in supplier owns a product with a review whose `reply` is already `"Thanks for staying with us!"`
**When**: `POST /v1/supplier/reviews/{id}/reply` is called with `{ "reply": "" }`
**Then**: `422 VALIDATION_FAILED` is returned; a follow-up read shows `reply` unchanged at `"Thanks for staying with us!"`
**Traces**: SUPPLIERS-006B failure table "Invalid input"; contract (§3.8.12 errors, "`reply` blank")
**Check**: fetch_url

**Scenario**: Submitting an empty reply on the screen shows an inline error and leaves the existing reply intact
**Given**: A signed-in supplier is on `/supplier/reviews`, viewing a review row that already shows "Replied"
**When**: The supplier clears the "Reply to a review" textarea and clicks "Publish reply"
**Then**: An inline validation error is shown next to the textarea; the row still shows "Replied", not "No reply"
**Traces**: SUPPLIERS-006B failure table "Invalid input"
**Check**: interact_page

**Scenario**: A reply attempt on a review that does not exist is rejected
**Given**: A signed-in supplier
**When**: `POST /v1/supplier/reviews/{a-non-existent-id}/reply` is called with `{ "reply": "Thanks!" }`
**Then**: `404 NOT_FOUND` is returned
**Traces**: contract (§3.8.12 errors, "review not found")
**Check**: fetch_url

**Scenario**: Replying without a signed-in session is rejected
**Given**: No session token is presented
**When**: `POST /v1/supplier/reviews/{id}/reply` is called with `{ "reply": "Thanks!" }`
**Then**: `401 UNAUTHENTICATED` is returned
**Traces**: contract (§2.2 auth enforcement; §2.3 error catalog)
**Check**: fetch_url

**Scenario**: A buyer session cannot reply to a review
**Given**: A signed-in account with `role = 'buyer'`
**When**: `POST /v1/supplier/reviews/{id}/reply` is called with `{ "reply": "Thanks!" }`
**Then**: `403 PERMISSION_DENIED` is returned
**Traces**: contract (§3.8 "Auth — `supplier`"; §2.3 `PERMISSION_DENIED`)
**Check**: fetch_url

**Scenario**: A reply never changes the review's own visibility/moderation status
**Given**: A signed-in supplier owns a product with a `published` review that has no reply yet
**When**: `POST /v1/supplier/reviews/{id}/reply` is called with `{ "reply": "Thanks!" }`
**Then**: `200` is returned; the review's `status` field is still `published`, unchanged by the reply write — moderation is a separate `admin`-module action this endpoint never performs
**Traces**: SRS §3 out-of-scope line ("this module's reply feature only adds the supplier's own reply text, never changes a review's visibility")
**Check**: fetch_url

---

## Service contract rules (undefined fields, unknown query params)

**Scenario**: An undefined field in the reply request body is rejected with 400
**Given**: A signed-in supplier owns a product with a review that has no reply yet
**When**: `POST /v1/supplier/reviews/{id}/reply` is called with a body `{ "reply": "Thanks!", "status": "hidden" }` (`status` is not a field this endpoint defines)
**Then**: `400 MALFORMED_REQUEST` is returned; a follow-up read shows `reply` still unset and `status` unchanged — the undefined field is never silently ignored while the reply still applies
**Traces**: Contract (§2.5 "a request field the contract does not define is rejected with 400"; §3.8.12)
**Check**: fetch_url

**Scenario**: A reply body missing the required field is rejected
**Given**: A signed-in supplier owns a product with a review
**When**: `POST /v1/supplier/reviews/{id}/reply` is called with an empty body `{}`
**Then**: `422 VALIDATION_FAILED` is returned (equivalent to a blank `reply`, which is required)
**Traces**: Contract (§3.8.12 "`reply`, required, non-blank")
**Check**: fetch_url

**Scenario**: A store failure on submitting a reply returns 500, not a silent success
**Given**: A signed-in supplier owns a product with a review that has no reply yet; the `reviews` table is unreachable/renamed so the update fails at the store layer
**When**: `POST /v1/supplier/reviews/{id}/reply` is called with `{ "reply": "Thanks!" }`
**Then**: `500 INTERNAL` is returned; once the store is restored, a follow-up read shows `reply` still unset (the failed write was never partially applied)
**Traces**: Contract (§2.3 error catalog `INTERNAL`; the backend's "a failed query is 500 INTERNAL" rule)
**Check**: fetch_url

**Scenario**: The database being unreachable while the backend runs returns 503, not 500
**Given**: The backend process is running but its database connection is refused
**When**: `POST /v1/supplier/reviews/{id}/reply` is called with `{ "reply": "Thanks!" }`
**Then**: `503 UNAVAILABLE` is returned (dependency refused the connection, distinct from an internal query failure)
**Traces**: Contract (§2.3 error catalog `UNAVAILABLE`, "a dependency ... refused the connection")
**Check**: fetch_url
