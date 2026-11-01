
---

## 3.8.12 `POST /v1/supplier/reviews/{id}/reply` — Reply to a guest review (SUPPLIERS-006B)

**Auth** — `supplier`. Writes only a review whose `product_id` belongs to
a `products` row owned by the caller (`products.supplier_id = (SELECT id
FROM suppliers WHERE user_id = caller.id)`) — never another supplier's
review (SUPPLIERS-006B AC-2).

**Request**

```json
{ "reply": "Thanks for staying with us!" }
```

No other field is accepted — in particular never `status`, which stays
`admin`-only (ADMIN-002, erd.md §3.10).

**Behaviour** — a single conditional update, scoped by ownership and
`status = 'published'` in the same `WHERE` so a supplier can never reply
to a review on their own product that is currently `hidden` or
`reported` and thereby publish an endorsement of it before a moderation
decision is made:

```sql
UPDATE reviews SET reply = $2, updated_at = now()
WHERE id = $1 AND status = 'published'
  AND product_id IN (SELECT id FROM products WHERE supplier_id = $caller_supplier_id)
RETURNING *
```

`reply` is trimmed and must be non-empty (AC below); it replaces any
existing value rather than appending to it (SUPPLIERS-006B AC-3 — there
is no "append" or "history" concept, one column, one current value).
Zero rows updated means either the review does not exist, belongs to
another supplier's product, or is not `published` — all three collapse
to the same `404` so a reply attempt never discloses which case it was
(matching the project's existing ownership-vs-not-found pattern, e.g.
BOOKING-004's sibling complaints endpoint, §3.5 notes).

**Response** — `200` — the updated `reviews` row, same shape as the
`data` module's existing `GET /v1/reviews/{id}` read (erd.md §3.10:
`id`, `product_id`, `author`, `rating`, `reviewed_on`, `text`, `reply`,
`status`, `created_at`, `updated_at`).

```json
{
  "id": "...", "product_id": "...", "author": "...", "rating": 5,
  "reviewed_on": "2026-10-02", "text": "...",
  "reply": "Thanks for staying with us!", "status": "published",
  "created_at": "...", "updated_at": "..."
}
```

**Errors**

| Status | `error.code` | When |
|---|---|---|
| 400 | `MALFORMED_REQUEST` | A field the request body does not define is present (e.g. `status`) |
| 401 | `UNAUTHENTICATED` | No valid session token |
| 403 | `PERMISSION_DENIED` | Signed in, but not role `supplier` |
| 404 | `NOT_FOUND` | No `reviews` row with that `id`, or its product is not owned by the caller, or its `status` is not `published` (a reply never targets a `hidden`/`reported` review) |
| 422 | `VALIDATION_FAILED` | `reply` is absent, or trims to empty |
| 500 | `INTERNAL` | The update query fails for a reason other than a refused connection |
| 503 | `UNAVAILABLE` | The database refuses the connection |

**Notes**

- No story plan or mock module exists for this item (per the task: "this
  story has no UI pull request"); the shape above is designed straight
  from `SupplierReviews.tsx` (already merged, reading the shared
  `reviews` collection) and the SRS's own §4.6 behaviour/AC list, not
  carried from any mock.
- `SupplierReviews.tsx`'s reply form today calls nothing — its
  `onSubmit={(e) => e.preventDefault()}` is a placeholder. Backend work
  on this story replaces that handler with a `fetch` to this endpoint,
  then refreshes the row (`useCollection`'s existing `reviews` read
  already re-renders the "Replied" badge and the "Awaiting your reply"
  count once the row's `reply` field is non-empty — no new client state
  needed beyond re-fetching the current page).
- Why `status = 'published'` is enforced here, not just at read time: the
  SRS's out-of-scope line says this module "never changes a review's
  visibility", but says nothing about it replying to a non-published
  one. A review in `reported`/`hidden` state is mid-moderation or already
  judged policy-violating — letting a supplier attach a public-facing
  reply to it before (or instead of) the admin's decision would make the
  reply outlive a review an admin is about to hide, or endorse one
  already hidden for cause. Rejecting with the same `404` a not-owned
  review gets keeps the error surface the same shape for both cases, and
  costs nothing extra in the `WHERE` clause already scoping by id and
  ownership.

## 8.7 Migration plan — Supplier review replies (SUPPLIERS-006B)

No schema change. `reviews.reply` (nullable `text`, no default — null
means no reply yet, a value replaces on resubmission, erd.md §3.10),
`reviews.status` and its `ck_reviews_status` constraint, and
`idx_reviews_product_id_status` (serves this endpoint's own
ownership+status check, the same index SITE-002's published-list read
already uses) all exist from the base ERD migration, ahead of this
story. `products.supplier_id` and `idx_products_supplier_id` (erd.md
§3.5), used by the subquery above, are likewise already there.

One endpoint added: §3.8.12 above (`POST /v1/supplier/reviews/{id}/reply`).

**Forward:** none to run — no DDL. **Backward:** none to run.
**Safety on a populated table:** not applicable, no DDL in this story.
