# SRS — site

Module: `site`
Design: [View the approved design](http://localhost:9400)
Design system: `design/design-system.md`

## 1. Purpose

The `site` module is the storefront's informational shell: the Home page, the
Trip detail page's descriptive content (photos, itinerary, inclusions,
policy, supplier block, reviews list), the Departures board, the Guides
list and a guide's own page, and the parts every page shares — header, nav,
footer, the call/Zalo dock and each page's SEO metadata. It is what a
visitor reads before they act; the acting parts (search, booking, payment,
account, sign-in) are their own modules. Without it Nghệ An Departures has
no public face: nothing to show a destination, a departure or a guide, and
no way back to the storefront from anywhere inside it.

## 2. Actors

| Actor | Who they are | What they may do in this module |
|---|---|---|
| Visitor | Anyone, signed in or not | Browse Home, a trip's descriptive content, Departures, Guides and a guide; use the header, footer and call/Zalo dock from any page |

This module draws no page behind a role gate; every screen here is public.

## 3. Scope

**In scope** — the function specified below, by its plan title:

- The site as designed

**Out of scope** — a reader would expect these here; they live elsewhere:

- The search row's own results page and its filters — `search` module.
- Picking a date, adults/children and paying for a trip — `booking` and
  `payments` modules.
- Saving a trip to a wishlist — `account` module.
- Sending the contact form — `contact` module.
- The record data itself (products, destinations, departures, guides,
  reviews) being served from a database rather than the JSON files in
  `src/data/` — `data` module.
- Supplier and admin dashboard screens — `suppliers` and `admin` modules.

## 4. Functional requirements

### 4.1 The site as designed

**Requirement SITE-001 — Home page**

*As a* visitor, *I want to* see featured trips, destinations, product
categories and the next open departures on arrival, *so that* I can find
something to book without searching first.

Behaviour:

1. The Home page shows, in the order drawn in `Home.tsx`: the search row,
   a hero image with headline, a row of featured products (approved status,
   sorted by next departure date, 4 cards), a row of category chips linking
   to `/search?kind=<id>`, a grid of destination tiles with their "from"
   price, the next-departures board (6 open rows), a row of guide teasers,
   and the supplier sign-up call to action.
2. Each featured product card, destination tile and guide teaser links to
   its own detail page.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | The products collection has approved products | The visitor opens `/` | The featured row shows up to 4 approved products sorted by next departure date, each with its photo, name and price |
| AC-2 | The destinations collection has records | The visitor opens `/` | Each destination tile shows its name, one line and its "from" price |
| AC-3 | The departures collection has rows in state `Open` | The visitor opens `/` | The departures board lists up to 6 of them, date first, sorted by date, with seats left and the price that day |
| AC-4 | The visitor clicks a featured product, a destination tile or a guide teaser | — | They are taken to that product's, that destination's search filter, or that guide's own page |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| No permission case | Home has no role gate | Not applicable: this screen is public to every visitor |
| Empty collection | No approved products, destinations, open departures or guides exist | Each row renders with zero items; the design draws no dedicated empty-state panel for Home's rows, so none is added here |

**Data touched**

| Field | Type | Required | Rule |
|---|---|---|---|
| products.status | text | yes | Only `approved` products appear in the featured row |
| departures.state | text | yes | Only `Open` departures appear on the board |

### 4.2 The site as designed — Trip detail (descriptive content)

**Requirement SITE-002 — Trip detail page**

*As a* visitor, *I want to* read a trip's photos, description, day-by-day
itinerary, inclusions/exclusions, cancellation policy, operating supplier
and past reviews, *so that* I can decide whether to book it before I start
the booking flow.

Behaviour:

1. `/tours/:id` shows the product's photo, kind/destination/duration label,
   name, starting place, next departure date and summary.
2. It lists the day-by-day itinerary, what is included and what is not.
3. It shows the product's own cancellation policy text, or the platform's
   waiting-on-default line when the supplier has not set one (§7).
4. It shows the operating supplier's name, kind, place and document status
   line.
5. It lists published reviews for the product, each with rating, traveller
   name, date and the supplier's reply where one exists.
6. It lists up to 4 other approved products as related trips.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | A product id resolves to a record | The visitor opens `/tours/:id` | Photo, name, itinerary, includes, excludes, policy and supplier block all render from that record |
| AC-2 | The product has no `policy` text set | The visitor opens `/tours/:id` | The policy section shows the waiting-on-default line, never a blank section |
| AC-3 | The product has published reviews | The visitor opens `/tours/:id` | Each review shows its rating, traveller, date, text and the supplier's reply if any |
| AC-4 | The product has no published review with a traveller name or text | The visitor opens `/tours/:id` | The reviews section shows the "waiting on the first review" line, not an empty list |
| AC-5 | The product id does not resolve to a record | The visitor opens `/tours/:id` | A not-found message replaces the page body |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Not found | The id in the URL matches no product | The page shows the "this trip is no longer listed" message instead of a blank or broken layout |
| No permission case | The page is public | Not applicable: no role gate applies |

**Data touched**

| Field | Type | Required | Rule |
|---|---|---|---|
| products.policy | longtext | no | Shown verbatim; the waiting-on-default line is UI copy, not a stored value |
| reviews.status | text | yes | Only `published` reviews appear on the trip page |

### 4.3 The site as designed — Departures board

**Requirement SITE-003 — Departures board**

*As a* visitor, *I want to* see every open departure date across the
platform, filterable by pricing rule, *so that* I can find a date that
suits me without opening a specific trip first.

Behaviour:

1. `/departures` lists every departure in a table: date, trip, operator,
   pricing rule, seats left and the price that day, sorted by date.
2. A pricing-rule filter (Standard / Weekend / Peak summer) narrows the
   list; "Show more" loads further pages.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | Departures exist across several products | The visitor opens `/departures` | They are listed sorted by date, with seats and price in mono figures |
| AC-2 | The visitor picks a pricing rule | — | Only departures with that `season` value remain, and the count updates |
| AC-3 | More departures exist than the first page | — | "Show more" appends the next page without losing the ones already shown |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Loading | The next page is being fetched | The design's loading line ("Loading…") shows below the table |
| No permission case | The page is public | Not applicable: no role gate applies |

**Data touched**

| Field | Type | Required | Rule |
|---|---|---|---|
| departures.season | text | yes | Filter value must match exactly one of Standard / Weekend / Peak summer |

### 4.4 The site as designed — Guides

**Requirement SITE-004 — Guides list and a guide**

*As a* visitor, *I want to* read travel guides about Nghệ An, filterable by
category, and open one to read its full text, *so that* I can plan a trip
and the site is found for its content as well as its bookings.

Behaviour:

1. `/guides` lists guide teasers (photo, category, date, title, excerpt),
   filterable by category, with "Show more" paging.
2. `/guides/:slug` shows the full guide and up to 3 other guides to read
   next.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | Guides exist in more than one category | The visitor picks a category | Only guides in that category remain, and "All" clears the filter |
| AC-2 | A guide slug resolves | The visitor opens `/guides/:slug` | The guide's photo, title, excerpt and body paragraphs render |
| AC-3 | A guide slug does not resolve | The visitor opens `/guides/:slug` | A not-found message replaces the page body |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Not found | The slug matches no guide | The "this guide is no longer here" message is shown |
| No permission case | The page is public | Not applicable: no role gate applies |

**Data touched**

| Field | Type | Required | Rule |
|---|---|---|---|
| guides.category | text | yes | Used as the filter's exact-match value |

### 4.5 The site as designed — Global shell and SEO

**Requirement SITE-005 — Header, footer and call/Zalo dock**

*As a* visitor, *I want to* reach search, wishlist, my account, the main
nav links and a way to call or message, from every storefront page, *so
that* I never lose my way back into the site.

Behaviour:

1. Every storefront page shows the sticky header (logo, nav links, search
   icon, wishlist icon with its saved count, account icon, "Find a trip")
   and the footer (link columns, contact details shown only when set,
   legal line, photo credits).
2. Below 1024px width, a call button and a Zalo button float at the
   bottom-right, each shown only when its number is set in `content.json`;
   with neither set, the dock shows nothing.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | The visitor has saved 1+ trips to the wishlist | — | The header's wishlist icon shows that count |
| AC-2 | `contact.phone` and `contact.zalo` are both empty | The visitor views the site below 1024px | The call/Zalo dock renders nothing |
| AC-3 | Only `contact.phone` is set | The visitor views the site below 1024px | Only the call button shows |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| No permission case | Header/footer/dock are public on every page | Not applicable: no role gate applies |

**Requirement SITE-006 — Per-page SEO metadata**

*As a* search engine or a link preview, *I want to* read a page-specific
title, description and Open Graph tags, *so that* a shared link and a
search result describe the right page.

Behaviour:

1. Every storefront page calls `usePageMeta` with its own title and
   description keys; the document title and `og:title`/`og:description`
   meta tags update to match.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | The visitor opens any storefront page | — | `document.title` and the `og:title`/`og:description` meta tags reflect that page's own copy, not another page's |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| — | — | Not applicable: metadata has no failure state a visitor can trigger |

**Data touched** — none; SEO metadata is read from `content.json`, not a
database record.

## 5. Screens

| Screen | Section in the design | Functions it serves | States that must exist |
|---|---|---|---|
| Home | `Home.tsx` | SITE-001 | default |
| Trip detail | `Trip.tsx` | SITE-002 | default, not-found |
| Departures board | `Departures.tsx` | SITE-003 | default, loading |
| Guides list | `Guides.tsx` | SITE-004 | default |
| Guide | `Guide.tsx` | SITE-004 | default, not-found |
| Header / Footer / ContactDock | `components/Header.tsx`, `Footer.tsx`, `ContactDock.tsx` | SITE-005 | default |

## 6. Non-functional requirements

| Area | Requirement |
|---|---|
| Accessibility | Keyboard reachable, labelled icons via `aria-label`, contrast per `design/design-system.md` §1.1 |
| Responsive | Works at 320px and up; header collapses to a drawer below 1024px per the design system |
| Localisation | Copy is in the site's own words (Vietnamese place names, English UI strings as authored in `content.json`); dates and prices formatted for `vi-VN` |
| SEO | Every storefront page sets its own `<title>` and Open Graph tags; a sitemap and server-side rendering for product pages are deferred (§7) |

## 7. Dependencies and assumptions

- **Depends on:** `data` module, for the product, destination, departure
  and guide records this module reads.
- **Depends on:** `search` module's results page, which this module links
  to from category chips, destination tiles and the header's search icon.
- **Assumption:** the cancellation-policy default window (48 hours before
  departure, per `decision.cancellation_window`) is a `booking`-module
  decision; this module only displays whatever text the product record
  carries or the waiting-on-default line when it is empty.

| Open question | Proposed default | Who decides |
|---|---|---|
| Does a product page need server-side rendering (SSR) for search engines, beyond the client-rendered SPA already built? | No for MVP — the SPA ships with per-page `<title>`/meta tags and a sitemap is added once traffic is measured; SSR is deferred past MVP | Stakeholder |

## 8. Traceability

| Plan item | Requirement ids | Test cases |
|---|---|---|
| The site as designed | SITE-001, SITE-002, SITE-003, SITE-004, SITE-005, SITE-006 | `test-cases/the-site-as-designed.md` |
