
# Story — The site as designed

Module: `site`
SRS: `docs/site/SRS.md` (SITE-001 … SITE-006)

## User story

As a **visitor** to Nghệ An Departures, I want to browse the Home page,
read a trip's descriptive content, browse the Departures board and the
Guides, and reach search/wishlist/account/contact from a shared header,
footer and call/Zalo dock on every page, so that I can decide what to book
and never lose my way back into the site — before I touch anything that
needs a backend.

## Scope

**In scope**

- Home page (`Home.tsx`): search row, hero, featured products row,
  category chips, destination tiles, next-departures board, guide
  teasers, supplier sign-up CTA — reading from the mock data already in
  `src/data/` (SITE-001).
- Trip detail page (`Trip.tsx`): photo, name, itinerary, inclusions/
  exclusions, cancellation policy (with the waiting-on-default line),
  supplier block, reviews list, related trips, not-found state
  (SITE-002).
- Departures board (`Departures.tsx`): full table, pricing-rule filter,
  "Show more" paging, loading state (SITE-003).
- Guides list (`Guides.tsx`) and a guide's own page (`Guide.tsx`):
  category filter, paging, full article, "read next" list, not-found
  state (SITE-004).
- Header, footer, call/Zalo dock (`Header.tsx`, `Footer.tsx`,
  `ContactDock.tsx`) present and working on every page listed above
  (SITE-005).
- Per-page SEO metadata via `usePageMeta` on every page listed above
  (SITE-006).
- All copy from `content.json`, all tokens from `theme.css`, exactly as
  the approved design (`http://localhost:9400`) shows them.

**Out of scope**

- Any live database — this story reads the existing mock data in
  `src/data/`; swapping that for real API calls is `Site data from the
  database` (plan item 2).
- The search results page and its filters (`search` module).
- Booking, date/traveller selection, payment (`booking`, `payments`
  modules).
- Wishlist's own persistence beyond the header's saved count reading
  whatever the mock/local store already holds (`account` module owns
  wishlist write behaviour).
- The contact form's send behaviour (`contact` module) — `ContactForm`
  rendering is not part of this page shell story; no page in this
  story's scope embeds it (Home's CTA links to supplier sign-up, not a
  contact form).
- Supplier and Admin CMS screens (`suppliers`, `admin` modules).
- Sign-in/account screens beyond the header's account icon linking out
  (`auth`, `account` modules).

## UI scope

Screens, all client-rendered React, all states from the SRS's §5 table:

| Screen | States covered |
|---|---|
| Home | default |
| Trip detail | default, not-found |
| Departures board | default, loading |
| Guides list | default |
| Guide | default, not-found |
| Header / Footer / ContactDock | default, responsive (≥1024px desktop nav, <1024px drawer + dock) |

No backend stage applies to this story: it is a frontend-only slice over
already-present mock data, so steps 6–9 of the delivery flow (technical
design, backend PR, backend review, run) carry no new backend work beyond
building and serving the existing Vite app. TL confirms in review that no
mock swap is required here.

## Acceptance criteria

SC-1 [SITE-001 AC-1]: On `/`, the featured row shows up to 4 approved
products sorted by next departure date, each with photo, name and price.

SC-2 [SITE-001 AC-2]: On `/`, each destination tile shows its name, one
line and its "from" price.

SC-3 [SITE-001 AC-3]: On `/`, the departures board lists up to 6 `Open`
departures, date first, sorted by date, with seats left and the price
that day.

SC-4 [SITE-001 AC-4]: Clicking a featured product card, a destination
tile or a guide teaser on `/` navigates to that product's page, that
destination's search filter URL, or that guide's own page respectively.

SC-5 [SITE-002 AC-1]: On `/tours/:id` for a product id that resolves,
photo, name, itinerary, includes, excludes, policy and supplier block all
render from that record.

SC-6 [SITE-002 AC-2]: On `/tours/:id` for a product with no `policy` text
set, the policy section shows the waiting-on-default line, never a blank
section.

SC-7 [SITE-002 AC-3]: On `/tours/:id` for a product with published
reviews, each review shows its rating, traveller, date, text and the
supplier's reply if one exists.

SC-8 [SITE-002 AC-4]: On `/tours/:id` for a product with no published
review, the reviews section shows the "waiting on the first review" line
instead of an empty list.

SC-9 [SITE-002 AC-5]: On `/tours/:id` for an id that does not resolve to
any product, a not-found message replaces the page body.

SC-10 [SITE-003 AC-1]: On `/departures` with departures across several
products, they are listed sorted by date, with seats and price set in
mono (`.fig`) figures.

SC-11 [SITE-003 AC-2]: On `/departures`, picking a pricing-rule filter
(Standard / Weekend / Peak summer) narrows the list to only that `season`
value and the shown count updates.

SC-12 [SITE-003 AC-3]: On `/departures` with more rows than the first
page, clicking "Show more" appends the next page without losing the rows
already shown.

SC-13 [SITE-004 AC-1]: On `/guides` with guides in more than one
category, picking a category shows only guides in that category, and
"All" clears the filter.

SC-14 [SITE-004 AC-2]: On `/guides/:slug` for a slug that resolves, the
guide's photo, title, excerpt and body paragraphs render.

SC-15 [SITE-004 AC-3]: On `/guides/:slug` for a slug that does not
resolve, a not-found message replaces the page body.

SC-16 [SITE-005 AC-1]: With 1+ trips saved to the wishlist, the header's
wishlist icon shows that count on every page in this story's scope.

SC-17 [SITE-005 AC-2]: With `contact.phone` and `contact.zalo` both empty
in `content.json`, the call/Zalo dock renders nothing below 1024px width.

SC-18 [SITE-005 AC-3]: With only `contact.phone` set, only the call
button shows below 1024px width.

SC-19 [SITE-006 AC-1]: On each of Home, Trip detail, Departures board,
Guides list and Guide, `document.title` and the `og:title`/
`og:description` meta tags reflect that page's own copy, not another
page's.

## Dependencies

- Design approved at `http://localhost:9400` — direction "The departure
  board" (`design/design-system.md`).
- Mock data already present in `code/frontend/src/data/` (products,
  destinations, departures, guides, reviews, categories) — no dependency
  on plan item 2 ("Site data from the database"); this story ships
  against the mock and item 2 swaps the source later without changing
  these screens' markup.
- `search` module's `/search?kind=<id>` route must exist for category
  chips and destination tiles to resolve — if it lands after this story,
  the links still render correctly, they just 404 until that story
  merges; no code change needed here when it does.
