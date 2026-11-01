# Test cases — The site as designed

Module: `site`
Story: `docs/site/stories/the-site-as-designed.md`
SRS: `docs/site/SRS.md` (SITE-001 … SITE-006)

Risk level: medium. No payment, auth or write path runs through this story —
it is a read-only descriptive shell over existing mock data — but it is the
visitor's entire first impression and every other module links into it
(`/search?kind=`, `/tours/:id`, `/guides/:slug`), so wrong sort order, a
missing not-found state or a broken link here breaks navigation platform-wide.
Depth is weighted toward: correct ordering/limits on list rows, the two named
"waiting on default" copy states, not-found states, and the header/footer/dock
behaviour shared by every page. No role-gate cases exist — the SRS states
every screen in this module is public, so there is no denial path to cover.

---

## SITE-001 — Home page

**Scenario**: Featured row shows up to 4 approved products sorted by next departure date
**Given**: The products collection has 4 or fewer `approved` products, each with a distinct next departure date
**When**: The visitor opens `/`
**Then**: The featured row shows every approved product, each with its photo, name and price, ordered by next departure date ascending
**Traces**: SC-1 (SITE-001 AC-1)
**Check**: render_url

**Scenario**: Featured row caps at 4 when more approved products exist
**Given**: The products collection has 6 `approved` products with distinct next departure dates
**When**: The visitor opens `/`
**Then**: The featured row shows exactly 4 cards — the 4 with the soonest next departure date, in that order — and the other 2 do not appear
**Traces**: SC-1 (SITE-001 AC-1)
**Check**: render_url

**Scenario**: Featured row renders with zero items when no product is approved
**Given**: No product in the collection has `status` = `approved`
**When**: The visitor opens `/`
**Then**: The featured row renders with zero cards and no dedicated empty-state panel; the rest of the Home page renders normally
**Traces**: SITE-001 (failure table: empty collection)
**Check**: render_url

**Scenario**: Destination tile shows name, line and from-price
**Given**: The destinations collection has at least one record with a name, a description line and a "from" price
**When**: The visitor opens `/`
**Then**: That destination's tile shows its name, its one line of description and its "from" price
**Traces**: SC-2 (SITE-001 AC-2)
**Check**: render_url

**Scenario**: Destination grid renders with zero items when no destination exists
**Given**: The destinations collection is empty
**When**: The visitor opens `/`
**Then**: The destination grid renders with zero tiles; no empty-state panel is shown
**Traces**: SITE-001 (failure table: empty collection)
**Check**: render_url

**Scenario**: Next-departures board lists up to 6 open departures, date-first and sorted
**Given**: The departures collection has 6 or fewer rows with `state` = `Open`, each with a distinct date
**When**: The visitor opens `/`
**Then**: The board lists every open departure, date column first, sorted by date ascending, each row showing seats left and the price for that day
**Traces**: SC-3 (SITE-001 AC-3)
**Check**: render_url

**Scenario**: Next-departures board caps at 6 when more open departures exist
**Given**: The departures collection has 9 rows with `state` = `Open`, each with a distinct date
**When**: The visitor opens `/`
**Then**: The board shows exactly 6 rows — the 6 with the soonest dates — sorted ascending
**Traces**: SC-3 (SITE-001 AC-3)
**Check**: render_url

**Scenario**: Next-departures board renders with zero rows when no departure is open
**Given**: No row in the departures collection has `state` = `Open`
**When**: The visitor opens `/`
**Then**: The board renders with zero rows; no empty-state panel is shown
**Traces**: SITE-001 (failure table: empty collection)
**Check**: render_url

**Scenario**: Guide teaser row renders with zero items when no guide exists
**Given**: The guides collection is empty
**When**: The visitor opens `/`
**Then**: The guide teaser row renders with zero teasers; no empty-state panel is shown
**Traces**: SITE-001 (failure table: empty collection)
**Check**: render_url

**Scenario**: Clicking a featured product card opens that product's page
**Given**: The Home page's featured row shows at least one approved product card
**When**: The visitor clicks that card
**Then**: The browser navigates to that product's own `/tours/:id` page
**Traces**: SC-4 (SITE-001 AC-4)
**Check**: interact_page

**Scenario**: Clicking a destination tile opens that destination's search filter
**Given**: The Home page's destination grid shows at least one tile
**When**: The visitor clicks that tile
**Then**: The browser navigates to `/search?kind=<id>` for that destination's id
**Traces**: SC-4 (SITE-001 AC-4)
**Check**: interact_page

**Scenario**: Clicking a guide teaser opens that guide's own page
**Given**: The Home page's guide teaser row shows at least one teaser
**When**: The visitor clicks that teaser
**Then**: The browser navigates to that guide's own `/guides/:slug` page
**Traces**: SC-4 (SITE-001 AC-4)
**Check**: interact_page

---

## SITE-002 — Trip detail page

**Scenario**: Trip detail renders full content for a resolving product id
**Given**: A product id in the `products` collection resolves to a record with photo, name, itinerary, includes, excludes, policy text and a supplier
**When**: The visitor opens `/tours/:id` for that id
**Then**: The photo, kind/destination/duration label, name, starting place, next departure date, summary, day-by-day itinerary, includes, excludes, policy text and supplier block all render from that record
**Traces**: SC-5 (SITE-002 AC-1)
**Check**: render_url

**Scenario**: Policy section shows waiting-on-default line when product has no policy text
**Given**: A product record resolves but its `policy` field is empty
**When**: The visitor opens `/tours/:id` for that id
**Then**: The policy section shows the platform's waiting-on-default line, never a blank section
**Traces**: SC-6 (SITE-002 AC-2)
**Check**: render_url

**Scenario**: Reviews list shows rating, traveller, date, text and supplier reply
**Given**: A product has at least one `published` review with a rating, traveller name, date, text and a supplier reply
**When**: The visitor opens `/tours/:id` for that product
**Then**: The review renders with its rating, traveller, date, text and the supplier's reply
**Traces**: SC-7 (SITE-002 AC-3)
**Check**: render_url

**Scenario**: Reviews list shows a review without a supplier reply
**Given**: A product has a `published` review with no supplier reply set
**When**: The visitor opens `/tours/:id` for that product
**Then**: The review renders with its rating, traveller, date and text, and shows no reply block
**Traces**: SC-7 (SITE-002 AC-3)
**Check**: render_url

**Scenario**: Reviews section shows waiting-on-first-review line when no published review qualifies
**Given**: A product has no `published` review carrying a traveller name or text (none published, or published rows are empty of those fields)
**When**: The visitor opens `/tours/:id` for that product
**Then**: The reviews section shows the "waiting on the first review" line, not an empty list
**Traces**: SC-8 (SITE-002 AC-4)
**Check**: render_url

**Scenario**: Unpublished review is excluded from the reviews list
**Given**: A product has a review with `status` other than `published`
**When**: The visitor opens `/tours/:id` for that product
**Then**: That review does not appear in the reviews list
**Traces**: SITE-002 (data touched: reviews.status)
**Check**: render_url

**Scenario**: Related trips list shows up to 4 other approved products
**Given**: 5 other `approved` products exist besides the one being viewed
**When**: The visitor opens `/tours/:id`
**Then**: Up to 4 other approved products are listed as related trips
**Traces**: SITE-002 (behaviour 6)
**Check**: render_url

**Scenario**: Trip detail shows not-found message for an id that does not resolve
**Given**: No product in the collection has the id in the URL
**When**: The visitor opens `/tours/:id` with that id
**Then**: A not-found message ("this trip is no longer listed") replaces the page body instead of a blank or broken layout
**Traces**: SC-9 (SITE-002 AC-5)
**Check**: render_url

---

## SITE-003 — Departures board

**Scenario**: Departures board lists all rows sorted by date with mono figures
**Given**: Departures exist across several products with distinct dates
**When**: The visitor opens `/departures`
**Then**: The table lists date, trip, operator, pricing rule, seats left and price for each row, sorted by date ascending, with seats and price set in the `.fig` mono class
**Traces**: SC-10 (SITE-003 AC-1)
**Check**: render_url

**Scenario**: Mono figure styling is actually applied to seats and price cells
**Given**: The departures board has rendered with at least one row
**When**: The seats-left and price cells of that row are measured
**Then**: Their computed `font-family` matches the design's mono token (IBM Plex Mono) and `font-variant-numeric`/tabular figure styling applies
**Traces**: SC-10 (SITE-003 AC-1)
**Check**: measure_styles

**Scenario**: Picking a pricing-rule filter narrows the list and updates the count
**Given**: `/departures` lists rows with `season` values Standard, Weekend and Peak summer
**When**: The visitor picks the "Weekend" filter
**Then**: Only rows with `season` = Weekend remain, and the shown count updates to that number
**Traces**: SC-11 (SITE-003 AC-2)
**Check**: interact_page

**Scenario**: Pricing-rule filter value must match exactly one season
**Given**: The filter options are exactly Standard, Weekend and Peak summer
**When**: The visitor selects "Peak summer"
**Then**: Only rows whose `season` field is exactly `Peak summer` remain; no row with a different season value is shown
**Traces**: SITE-003 (data touched: departures.season)
**Check**: interact_page

**Scenario**: "Show more" appends the next page without losing rows already shown
**Given**: More departures exist than fit on the first page
**When**: The visitor clicks "Show more"
**Then**: The next page's rows are appended below the existing rows; all rows from the first page remain visible and in their original order
**Traces**: SC-12 (SITE-003 AC-3)
**Check**: interact_page

**Scenario**: Loading line shows while the next page is being fetched
**Given**: The visitor has clicked "Show more" and the next page's data has not yet arrived
**When**: The next page is being fetched
**Then**: The design's loading line ("Loading…") shows below the table
**Traces**: SITE-003 (failure table: loading)
**Check**: render_url

---

## SITE-004 — Guides list and a guide

**Scenario**: Picking a category filters the guides list
**Given**: Guides exist in more than one category
**When**: The visitor picks one category
**Then**: Only guides in that category remain in the list
**Traces**: SC-13 (SITE-004 AC-1)
**Check**: interact_page

**Scenario**: "All" clears the category filter
**Given**: The visitor has filtered `/guides` down to one category
**When**: The visitor picks "All"
**Then**: Guides from every category are shown again
**Traces**: SC-13 (SITE-004 AC-1)
**Check**: interact_page

**Scenario**: "Show more" pages the guides list
**Given**: More guides exist than fit on the first page of `/guides`
**When**: The visitor clicks "Show more"
**Then**: The next page's guide teasers are appended below the ones already shown
**Traces**: SITE-004 (behaviour 1: paging)
**Check**: interact_page

**Scenario**: A resolving guide slug renders the full article
**Given**: A guide in the `guides` collection has the slug in the URL
**When**: The visitor opens `/guides/:slug` for that slug
**Then**: The guide's photo, title, excerpt and body paragraphs render
**Traces**: SC-14 (SITE-004 AC-2)
**Check**: render_url

**Scenario**: Guide page lists up to 3 other guides to read next
**Given**: 4 or more other guides exist besides the one being viewed
**When**: The visitor opens `/guides/:slug`
**Then**: Up to 3 other guides are listed as "read next"
**Traces**: SITE-004 (behaviour 2)
**Check**: render_url

**Scenario**: Guide page shows not-found message for a slug that does not resolve
**Given**: No guide in the collection has the slug in the URL
**When**: The visitor opens `/guides/:slug` with that slug
**Then**: A not-found message ("this guide is no longer here") replaces the page body
**Traces**: SC-15 (SITE-004 AC-3)
**Check**: render_url

---

## SITE-005 — Header, footer and call/Zalo dock

**Scenario**: Header wishlist icon shows the saved count
**Given**: The visitor has saved 1 or more trips to the wishlist
**When**: The visitor views any storefront page in this story's scope
**Then**: The header's wishlist icon shows that saved count
**Traces**: SC-16 (SITE-005 AC-1)
**Check**: render_url

**Scenario**: Call/Zalo dock renders nothing when neither number is set
**Given**: `content.json` has `contact.phone` and `contact.zalo` both empty
**When**: The visitor views the site below 1024px width
**Then**: The call/Zalo dock renders no button at all
**Traces**: SC-17 (SITE-005 AC-2)
**Check**: render_url

**Scenario**: Only the call button shows when only phone is set
**Given**: `content.json` has `contact.phone` set and `contact.zalo` empty
**When**: The visitor views the site below 1024px width
**Then**: Only the call button renders in the dock; no Zalo button appears
**Traces**: SC-18 (SITE-005 AC-3)
**Check**: render_url

**Scenario**: Both dock buttons show when both numbers are set
**Given**: `content.json` has `contact.phone` and `contact.zalo` both set
**When**: The visitor views the site below 1024px width
**Then**: Both the call button and the Zalo button render in the dock
**Traces**: SITE-005 (behaviour 2)
**Check**: render_url

**Scenario**: Header collapses to a drawer below 1024px
**Given**: The visitor is on any storefront page
**When**: The viewport width is set below 1024px
**Then**: The header's nav links move into a drawer control rather than showing inline
**Traces**: SITE-005 (non-functional: responsive)
**Check**: render_url

**Scenario**: Header and footer render on every page in this story's scope
**Given**: The visitor is on Home, Trip detail, Departures board, Guides list or Guide
**When**: The page loads
**Then**: The sticky header (logo, nav links, search icon, wishlist icon, account icon, "Find a trip") and the footer (link columns, legal line, photo credits) both render
**Traces**: SITE-005 (behaviour 1)
**Check**: render_url

---

## SITE-006 — Per-page SEO metadata

**Scenario**: Home page sets its own title and Open Graph tags
**Given**: The visitor opens `/`
**When**: The page finishes loading
**Then**: `document.title` and the `og:title`/`og:description` meta tags match Home's own copy from `content.json`
**Traces**: SC-19 (SITE-006 AC-1)
**Check**: render_url

**Scenario**: Trip detail page sets its own title and Open Graph tags, distinct from Home's
**Given**: The visitor opens `/tours/:id` for a resolving id
**When**: The page finishes loading
**Then**: `document.title` and the `og:title`/`og:description` meta tags match that trip's own copy, not Home's or any other page's
**Traces**: SC-19 (SITE-006 AC-1)
**Check**: render_url

**Scenario**: Departures board sets its own title and Open Graph tags
**Given**: The visitor opens `/departures`
**When**: The page finishes loading
**Then**: `document.title` and the `og:title`/`og:description` meta tags match the Departures board's own copy
**Traces**: SC-19 (SITE-006 AC-1)
**Check**: render_url

**Scenario**: Guides list and a guide page each set their own title and Open Graph tags
**Given**: The visitor opens `/guides` and then `/guides/:slug` for a resolving slug
**When**: Each page finishes loading
**Then**: Each page's `document.title` and `og:title`/`og:description` meta tags match that page's own copy, and the two pages' values differ from each other
**Traces**: SC-19 (SITE-006 AC-1)
**Check**: render_url
