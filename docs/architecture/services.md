
---

## 3.12 The site as designed (SITE-001 … SITE-006)

**No new endpoint.** This story is the public storefront page shell (Home,
Trip detail, Departures board, Guides list/Guide, Header/Footer/
ContactDock, per-page SEO) and its own story plan states its UI scope
reads the mock JSON in `code/frontend/src/data/` directly, with no mock
module and no mock-swap step
(`docs/site/stories/the-site-as-designed.md`, "UI scope": "No backend
stage applies to this story... TL confirms in review that no mock swap is
required here"). Reviewed PR #23 confirms this — the only diff is a
content/header wiring fix (`nav.cta.href`); no `lib/mock/` file for this
story exists to replace.

Every record this story's screens read — `products` (status, name,
photo, itinerary, inclusions/exclusions, policy), `departures` (state,
date, season, seats, price), `destinations` (name, line, from_price),
`categories`, `guides` (slug, category, published_on, excerpt, body),
`reviews` (status, rating, author, text, reply) — is already in
`erd.md` §3.5–§3.10, each already traced to SITE-00x in that table's own
"Traces to" line. No column, table or index this story's six
requirements touch is missing.

When this story's data moves off the bundled JSON files, it does so
through the `data` module's generic reader (`GET /v1/<collection>`,
`GET /v1/<collection>/<id>` — DATA-002/DATA-003, plan item "Site data
from the database"), not through a bespoke endpoint built here — matching
the pattern the `data` module's own SRS already states: "every other
module's screens are built against `useCollection`/`useRecord` already;
this module is what makes those hooks real instead of reading a bundled
file, without changing a single component" (`docs/data/SRS.md` §1). This
story's pages need no change when that lands.

## 8.9 Migration plan — The site as designed (SITE-001 … SITE-006)

No schema change, no endpoint added. Every entity this story's six
requirements read (`products`, `departures`, `destinations`,
`categories`, `guides`, `reviews`) is already defined in the base ERD
migration (`erd.md` §8, `0004_catalogue`), each already tracing to its
SITE-00x requirement in that table's own "Traces to" line — this story
ships against the existing mock JSON in `code/frontend/src/data/`, per
its own story plan's UI scope ("no mock-swap step").

**Forward:** none to run. **Backward:** none to run. **Safety on a
populated table:** not applicable — no DDL in this story.
