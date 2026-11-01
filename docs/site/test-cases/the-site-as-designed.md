
# Test cases — The site as designed

Module: `site` | Story: `docs/site/stories/the-site-as-designed.md` | SRS: `docs/site/SRS.md`

Risk: medium — no payment or auth, but many content/empty-state/routing rules; proportionate depth, not payment-flow depth.

## Home (SITE-001)

**Scenario**: Featured row shows up to 4 approved products sorted by next departure date
**Given**: `products.json` has approved products with varying `next_date`
**When**: Visitor opens `/`
**Then**: Featured row shows at most 4 cards, each a product with `status: "approved"`, ordered by `next_date` ascending, each with photo, name and mono price
**Traces**: SC-1 (SITE-001 AC-1)
**Check**: render_url

**Scenario**: Destination tile shows name, one line and "from" price
**Given**: `destinations.json` has records (e.g. Cửa Lò, Kim Liên, Pù Mát, Thanh Chương)
**When**: Visitor opens `/`
**Then**: Each tile renders the destination's `name`, `line` and `from_price` formatted as a price
**Traces**: SC-2 (SITE-001 AC-2)
**Check**: render_url

**Scenario**: Departures board lists up to 6 Open departures, date first, sorted by date
**Given**: `departures.json` has rows with `state: "Open"` and some `"Blocked"` (e.g. d-08)
**When**: Visitor opens `/`
**Then**: Board lists at most 6 rows, all `state: "Open"`, sorted by `date` ascending, each row showing date first, then seats left and the price that day in mono figures
**Traces**: SC-3 (SITE-001 AC-3)
**Check**: render_url

**Scenario**: Clicking a featured product card navigates to its trip page
**Given**: Home is open with a featured product card for `cua-lo-beach-2n1d`
**When**: Visitor clicks that card
**Then**: Browser navigates to `/tours/cua-lo-beach-2n1d`
**Traces**: SC-4 (SITE-001 AC-4)
**Check**: interact_page

**Scenario**: Clicking a destination tile navigates to that destination's search filter URL
**Given**: Home is open with the "Cửa Lò" destination tile
**When**: Visitor clicks that tile
**Then**: Browser navigates to `/search?where=C%E1%BB%ADa%20L%C3%B2` (the destination name URL-encoded)
**Traces**: SC-4 (SITE-001 AC-4)
**Check**: interact_page

**Scenario**: Clicking a guide teaser navigates to that guide's own page
**Given**: Home is open with a guide teaser for `cua-lo-in-july`
**When**: Visitor clicks that teaser
**Then**: Browser navigates to `/guides/cua-lo-in-july`
**Traces**: SC-4 (SITE-001 AC-4)
**Check**: interact_page

**Scenario**: Empty collections render zero items, no dedicated empty-state panel
**Given**: `products.json` has no approved products, `destinations.json` is empty, no departure has `state: "Open"`
**When**: Visitor opens `/`
**Then**: Featured row, destination grid and departures board each render with zero items and no empty-state panel/message
**Traces**: SITE-001 Failure table ("Empty collection")
**Check**: render_url

## Trip detail (SITE-002)

**Scenario**: Trip detail renders all descriptive content for a resolving id
**Given**: `products.json` has `cua-lo-beach-2n1d`
**When**: Visitor opens `/tours/cua-lo-beach-2n1d`
**Then**: Photo, name, kind/destination/duration label, next date, summary, itinerary list, includes, excludes, policy section and supplier block (name, kind, place, document status) all render from that record
**Traces**: SC-5 (SITE-002 AC-1)
**Check**: render_url

**Scenario**: No policy text set shows the waiting-on-default line, never blank
**Given**: A product record has `policy: ""`
**When**: Visitor opens that product's `/tours/:id`
**Then**: The policy section shows content.json's `pages.trip.policyEmpty` text ("This supplier has not set a policy yet, and the platform's default window is still to be decided."), and the section is not blank
**Traces**: SC-6 (SITE-002 AC-2)
**Check**: render_url

**Scenario**: Published reviews show rating, traveller, date, text and reply where present
**Given**: `reviews.json` has a published review with non-empty `author`/`text` and a `reply`
**When**: Visitor opens that product's `/tours/:id`
**Then**: The review renders its star rating, traveller name, date and text, and the supplier's reply text where `reply` is non-empty
**Traces**: SC-7 (SITE-002 AC-3)
**Check**: render_url

**Scenario**: No published review with traveller name or text shows the waiting line, not an empty list
**Given**: Product `cua-lo-beach-2n1d`'s published reviews (r-01, r-02) all have empty `author` and empty `text`
**When**: Visitor opens `/tours/cua-lo-beach-2n1d`
**Then**: The reviews section shows content.json's `pages.trip.reviewEmpty` text ("Waiting on the first review"), not an empty `<ul>`
**Traces**: SC-8 (SITE-002 AC-4)
**Check**: render_url

**Scenario**: Unresolved product id shows not-found message
**Given**: No product in `products.json` has id `does-not-exist`
**When**: Visitor opens `/tours/does-not-exist`
**Then**: The page body is replaced by content.json's `pages.trip.missing` text ("This trip is no longer listed. Browse the trips that are."), not a blank or broken layout
**Traces**: SC-9 (SITE-002 AC-5); SITE-002 Failure table ("Not found")
**Check**: render_url

## Departures board (SITE-003)

**Scenario**: Full table lists departures sorted by date with seats/price in mono figures
**Given**: `departures.json` has rows across several products
**When**: Visitor opens `/departures`
**Then**: Table rows are sorted by `date` ascending; the seats and price cells carry the `.fig` (mono) class
**Traces**: SC-10 (SITE-003 AC-1)
**Check**: render_url

**Scenario**: Picking a pricing-rule filter narrows the list and updates the count
**Given**: `/departures` is open with rows of season `Standard`, `Weekend` and `Peak summer`
**When**: Visitor selects "Weekend" in the season filter
**Then**: Only rows with `season: "Weekend"` remain in the table, and the displayed count matches that filtered total
**Traces**: SC-11 (SITE-003 AC-2)
**Check**: interact_page

**Scenario**: Show more appends the next page without losing rows already shown
**Given**: More than 10 departures exist (pageSize is 10) and `/departures` shows the first page
**When**: Visitor clicks "Show more"
**Then**: The rows already on screen remain, and the next page's rows are appended below them
**Traces**: SC-12 (SITE-003 AC-3)
**Check**: interact_page

**Scenario**: Loading line shows while the next page is being fetched
**Given**: `/departures` is open and "Show more" has just been clicked
**When**: The next page is loading
**Then**: The design's "Loading…" line (content.json `pages.search.loading`) shows below the table
**Traces**: SITE-003 Failure table ("Loading")
**Check**: render_url

## Guides (SITE-004)

**Scenario**: Picking a category filters the guides list; "All" clears it
**Given**: `guides.json` has guides in categories "Beaches", "Heritage" and "Nature" (more than one category)
**When**: Visitor picks the "Nature" category chip
**Then**: Only guides with `category: "Nature"` remain in the grid
**Traces**: SC-13 (SITE-004 AC-1)
**Check**: interact_page

**Scenario**: "All" clears the category filter
**Given**: The "Nature" category filter is active on `/guides`
**When**: Visitor clicks "All"
**Then**: Guides from every category are shown again
**Traces**: SC-13 (SITE-004 AC-1)
**Check**: interact_page

**Scenario**: A guide slug that resolves renders photo, title, excerpt and body
**Given**: `guides.json` has `cua-lo-in-july`
**When**: Visitor opens `/guides/cua-lo-in-july`
**Then**: The photo, title, excerpt and each body paragraph (split on blank lines) render
**Traces**: SC-14 (SITE-004 AC-2)
**Check**: render_url

**Scenario**: A guide slug that does not resolve shows not-found message
**Given**: No guide has slug `missing-guide`
**When**: Visitor opens `/guides/missing-guide`
**Then**: The page body is replaced by content.json's `pages.guide.missing` text ("This guide is no longer here."), not a blank or broken layout
**Traces**: SC-15 (SITE-004 AC-3); SITE-004 Failure table ("Not found")
**Check**: render_url

## Header / Footer / ContactDock (SITE-005)

**Scenario**: Wishlist icon shows saved count on every in-scope page
**Given**: The visitor's wishlist (localStorage `nad:wishlist`) holds 2 saved trip ids
**When**: Visitor opens `/`, `/tours/:id`, `/departures`, `/guides` and `/guides/:slug` in turn
**Then**: The header's wishlist icon shows the badge "2" on each page
**Traces**: SC-16 (SITE-005 AC-1)
**Check**: render_url

**Scenario**: Both contact numbers empty, dock renders nothing below 1024px
**Given**: `content.json` has `contact.phone: ""` and `contact.zalo: ""`
**When**: Visitor views any storefront page at a width below 1024px
**Then**: No element with `data-contact-dock` attribute is in the DOM (the dock component returns null)
**Traces**: SC-17 (SITE-005 AC-2)
**Check**: render_url

**Scenario**: Only phone set, only the call button shows below 1024px
**Given**: `content.json` has `contact.phone` set to a non-empty number and `contact.zalo: ""`
**When**: Visitor views any storefront page at a width below 1024px
**Then**: The call button (`tel:` link, `aria-label` = `contact.dock.call`) renders inside `[data-contact-dock]`; no Zalo button renders
**Traces**: SC-18 (SITE-005 AC-3)
**Check**: render_url

**Scenario**: Header, footer and dock are public — no role gate
**Given**: Visitor is signed out
**When**: Visitor opens any storefront page in this story's scope
**Then**: Header, footer and (below 1024px, when a contact number is set) the dock render identically to a signed-in visitor; no redirect to sign-in occurs
**Traces**: SITE-005 Failure table ("No permission case")
**Check**: render_url

## Per-page SEO metadata (SITE-006)

**Scenario**: Each page sets its own document title and Open Graph tags
**Given**: Home, Trip detail (`/tours/cua-lo-beach-2n1d`), Departures board, Guides list and a Guide page (`/guides/cua-lo-in-july`) each exist
**When**: Visitor opens each page in turn
**Then**: `document.title` and the `meta[property="og:title"]`/`meta[property="og:description"]` tags reflect that page's own `content.json` title/description keys (e.g. `pages.trip.title`/`pages.trip.description` for the trip page), and differ from the tags shown on any of the other four pages
**Traces**: SC-19 (SITE-006 AC-1)
**Check**: render_url

---

## Ambiguities found (reported, not resolved)

- SRS §7 records the cancellation-window default (48h) as a `booking`-module decision; this module only displays stored text or the waiting line, which the cases above test as written. No case here tests the 48h figure itself.
- SITE-005 AC-1 says "the header's wishlist icon shows that count" without naming which pages; the story text says "on every page in this story's scope," so the case above checks all five in-scope routes rather than just Home.
