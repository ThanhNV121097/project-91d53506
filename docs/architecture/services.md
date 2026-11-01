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
