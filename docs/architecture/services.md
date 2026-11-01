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
