# Design System — Nghệ An Departures

> Source of truth: the approved design in `code/frontend/src` — tokens in
> `theme.css`, words in `content.json`, screens in `App.tsx` and
> `src/components/`. Every value below is extracted from it, not invented.
> The chosen direction is **"The departure board"**: every figure (price,
> seats left, date, duration) is set in IBM Plex Mono, tabular, because the
> number is the content and a departure board is what the page is.

Last updated: 2026-11-01

## 1. Foundations

### 1.1 Color

One mode, light only (`color-scheme: light` is hard-set in `theme.css`;
there is no dark-mode token pair).

| Token | Value | Used for |
|---|---|---|
| `--ground` | `#EFEFEC` | Page background |
| `--surface` | `#FFFFFF` | Card, panel, header, footer background |
| `--ink` | `#111214` | Body text, headings, primary icons |
| `--ink-soft` | `#5A5C5F` | Secondary text, captions, labels |
| `--accent` | `#C8381F` | Primary action, seats-left figure, active nav state, focus/active ring colour |
| `--accent-ink` | `#FFFFFF` | Text/icon set on an `--accent` background |
| `--line` | `rgba(17,18,20,0.14)` | Section hairline, card border, table border — a divider, deliberately near-invisible |
| `--field-line` | `rgba(17,18,20,0.45)` | Border of every input, select and filter field — a field needs an edge a reader can find, a section divider does not |
| `--product-ground` | `#F2F2F4` | Tile behind a `<ProductImage>`, light in every context so a cut-out product keeps its shading |
| `--product-ground-ink` | `#5A5C5F` | Caption text on `--product-ground` |
| `--picture-ground` | `var(--surface)` (default) | `<Picture>` empty-state block background; overridden to `--product-ground` inside `<ProductImage>` |
| `--picture-ink` | `var(--ink-soft)` (default) | `<Picture>` empty-state caption text |

There is no `--color-warning` and no `--color-success` token: the product
has no state that is currently drawn in either (see §2 Badge, whose tones
map to `ink` / `ink-soft`, never to green or amber).

#### Contrast audit

| Foreground | Background | Ratio | Passes |
|---|---|---|---|
| `--ink` | `--ground` | 16.3:1 | AA |
| `--ink` | `--surface` | 18.8:1 | AA |
| `--ink-soft` | `--ground` | 5.8:1 | AA |
| `--ink-soft` | `--surface` | 6.7:1 | AA |
| `--accent` (text) | `--surface` | 5.2:1 | AA |
| `--accent` (text) | `--ground` | 4.5:1 | AA (at the limit — do not set `--accent` text any lighter) |
| `--accent-ink` | `--accent` (background) | 5.2:1 | AA |
| `--field-line` (border) | `--surface` | 3.0:1 | AA for a non-text UI boundary |

`--line` measures under 1.5:1 against both backgrounds. That is
deliberate, not a failure: it is a content divider between sections that
are already separated by layout and whitespace, never the sole boundary of
an interactive control — every field, button and card edge that must be
findable uses `--field-line` instead (see `ContactForm.tsx`'s own comment
on this).

### 1.2 Spacing

Base unit: `4px`. Every margin, padding and gap in the product is one of
these (Tailwind's own scale is used directly for most spacing; the
CSS-variable scale below is what `Grid`'s column gap and the gutter
calculation use).

| Token | Value |
|---|---|
| `--space-1` | `4px` |
| `--space-2` | `8px` |
| `--space-3` | `12px` |
| `--space-4` | `16px` |
| `--space-6` | `24px` |
| `--space-8` | `32px` |
| `--space-12` | `48px` |
| `--space-16` | `64px` |

### 1.3 Typography

- Display and body: `"IBM Plex Sans"`, loaded for the project; fallback
  `system-ui, sans-serif`.
- Mono (figures only): `"IBM Plex Mono"`, fallback `ui-monospace, monospace`.
  Applied with the `.fig` utility class (`theme.css`), which also turns on
  tabular numerals (`font-variant-numeric: tabular-nums`). Every price, seat
  count, date and duration on the site carries `.fig` — this is the one
  unlock of the direction and the rule a later screen must keep.

| Token | Size | Used for |
|---|---|---|
| `--size-label` | `11px` (`0.6875rem`), uppercase, `0.12em` tracking | Eyebrow labels, table headers, field labels (`.label` utility) |
| `text-xs` | `12px` | Captions, photo credits, helper text under a field |
| `text-sm` | `14px` | The product's default UI text — table cells, form labels, buttons, nav |
| body (unclassed) | `17px` / 1.6 | Running paragraph text (`body` in `index.css`) |
| `text-base` | `16px` | A card title (`TripCard`, `GuideCard` h3) |
| `text-lg` | `18px` | A short confirmation line (`ContactForm` sent state) |
| `text-xl` | `20px` | A dashboard page's `<h1>` (`DashboardLayout`) |
| `text-2xl` | `24px` | The mobile nav menu's link size |
| `text-3xl` | `30px` | A full-page heading outside the dashboard (`RequireRole`'s "no access" page) |
| `--size-h2` | `clamp(1.5rem, 2.2vw, 2rem)` → 24–32px | Section `<h2>` on the storefront |
| `--size-h1` | `clamp(1.9rem, 2.9vw, 2.75rem)` → 30.4–44px | Page `<h1>` on the storefront |
| `--size-price` | `clamp(1.4rem, 2.2vw, 2.125rem)` → 22.4–34px, always `.fig` | The one large price/code figure on a panel (trip price, checkout total, booking code) |

`h1`/`h2`/`h3` are never skipped for visual sizing — the clamp sizes above
are the only large type in the storefront, and the dashboard uses the
fixed Tailwind steps instead because a CMS screen has no hero to clamp.

| Token | Value | Used for |
|---|---|---|
| `--weight-display` | `500` | Every `h1`, `h2`, `h3` |
| body weight | `400` (browser default, untokened) | Running text — no reset lightens or bolds it |
| `--tracking-display` | `-0.02em` | Every `h1`, `h2`, `h3` |
| `--tracking-label` | `0.12em`, uppercase | `.label` text only |

### 1.4 Radius, border, shadow, motion

| Token | Value | Used for |
|---|---|---|
| `--radius` | `4px` | Default Tailwind `rounded` (plain, no size suffix) |
| `--radius-sm` | `2px` | Button, card, input, image frame — the size most controls actually use |
| `--radius-pill` | `999px` | Badge, count bubble, avatar |
| `--border-width` | `1px` (Tailwind default, untokened) | Every border in the product |
| `--shadow-sm` | `0 1px 2px rgba(17,18,20,0.06)` | Defined, currently unused by any component |
| `--shadow-md` | `0 10px 30px -18px rgba(17,18,20,0.35)` | The open `<Select>` listbox |
| `--duration-fast` | `120ms` | Defined, currently unused — no hover/focus transition reads it (see §4) |
| `--duration-base` | `220ms` | Image hover zoom on `TripCard` / `GuideCard` / the home board |
| `--ease-out` | `cubic-bezier(0.2, 0.7, 0.2, 1)` | Defined, currently unused — transitions default to the browser's own easing (see §4) |

Motion respects `prefers-reduced-motion: reduce`: `theme.css` forces every
animation and transition to `0.001ms` for that preference, and `Reveal`
(the one scroll-in animation on the site) renders statically instead of
animating when the user has it set.

### 1.5 Layout and breakpoints

| Name | Min width | Used for |
|---|---|---|
| `sm` | `640px` | First widen from a one-column phone layout (forms go two-column, `TripCard` grid logic shifts) |
| `lg` | `1024px` | Desktop threshold — top nav replaces the mobile drawer, the dashboard sidebar becomes permanent, sticky asides activate |
| `xl` | `1280px` | Stat grids widen from 2 to 4 columns on the admin overview |

Tailwind's defaults are used unmodified (`tailwind.config.ts` does not
override `screens`); `md` (`768px`) is used once, for the footer's column
count. There is no fixed column/gutter grid — the storefront uses
`<Grid>`, which picks 2, 3 or 4 columns from how many cards there are so no
row is ever left with a gap, not a container/column table.

| Token | Value | Used for |
|---|---|---|
| `--page` | `1320px` | Max width of every page's content (`max-w-page`) |
| `--gutter` | `clamp(20px, 4vw, 56px)` | Left/right page padding at every width |
| `--header-h` | `64px` | Height reserved for the sticky header (used to position the mobile menu under it) |

Z-index scale (only these values are used):

| Layer | Value |
|---|---|
| Base | `0` |
| Sticky header | `40` |
| Dropdown / open `<Select>` listbox / wishlist count badge | `50` |
| Full-screen drawer (mobile nav, dashboard mobile menu) | `60` |

There is no separate modal or toast layer: the product has neither a modal
dialog nor a toast notification today.

## 2. Components

### 2.1 Button (primary / secondary / ghost)

**Purpose** — the product has no single `<Button>` component; every button
is a styled `<button>` or `<Link>` built inline from three recurring
classes. Documented here as one component so a later screen reuses the
same three instead of inventing a fourth.

**Anatomy** — `[icon?] label`.

**Variants**

| Variant | Tokens | When to use |
|---|---|---|
| Primary | `bg-accent text-accent-ink`, `rounded-sm` | The one action a screen wants taken — Pay now, Search, Save commission, Book this date |
| Dark | `bg-ink text-surface`, hover `bg-accent` | A secondary strong action beside a primary one lower down — header's "Find a trip", Confirmed page's "Your bookings" |
| Ghost / outline | `border border-field text-ink`, hover `border-accent text-accent` | A lesser action — "Show more", "Saved trips", wishlist toggle |

**Sizes**

| Size | Padding | Text token |
|---|---|---|
| Default | `px-6 py-3` | `text-sm` |
| Compact (search row, pagination) | `px-6 py-2.5` or `px-2 py-1` | `text-sm` / `text-xs` |

**States**

| State | Visual change | Tokens |
|---|---|---|
| Default | Solid fill or outline as above | `--accent` / `--ink` / `--field-line` |
| Hover | Primary: `opacity-90`. Dark: background becomes `--accent`. Ghost: border and text become `--accent` | `--accent` |
| Disabled | `opacity-60`, `disabled` attribute | — |

No focus or active style is set on any button beyond the browser default
(see §4 Known deviations).

### 2.2 Icon button (round, header/dock)

**Purpose** — a tap target that is only an icon: header search/wishlist/
account, the menu toggle, the Zalo/call dock.

**Anatomy** — `[icon]`, always with `aria-label`.

**Sizes** — `40×40px` (header), `56×56px` (`ContactDock`, the larger phone
target for a call/chat action).

**States**

| State | Visual change | Tokens |
|---|---|---|
| Default | Icon in `--ink` (header) or `--accent-ink`/`--ink` on a filled circle (dock) | `--ink`, `--accent` |
| Hover | Icon colour becomes `--accent` (header only; the dock has no hover affordance since it targets touch) | `--accent` |

### 2.3 Input / Textarea

**Purpose** — every text, number, date and search field on the site.

**Anatomy** — `[label] [input]`, label above, using `.label` typography.

**States**

| State | Visual change | Tokens |
|---|---|---|
| Default | `border border-field`, `bg-surface` (or `bg-ground` inside `ContactForm`), `rounded-sm` | `--field-line` |
| Disabled | Not used anywhere today | — |

No focus-ring style is defined beyond the browser default outline (§4).

### 2.4 Select (custom listbox)

**Purpose** — every choice from a fixed list. Never a bare `<select>`: a
native control is drawn by the OS and is the one thing on the page that
would not come from `theme.css`.

**Anatomy** — `[chosen label or placeholder] [chevron]`, opening a listbox
below it.

**States**

| State | Visual change | Tokens |
|---|---|---|
| Default (closed) | `border-field`, placeholder in `--ink-soft`, chosen value in `--ink` | `--field-line` |
| Open | Listbox appears, `shadow-md`, `border-line` | `--shadow-md`, `--line` |
| Option hover | `bg-ground` | `--ground` |
| Option selected | Text in `--accent` | `--accent` |

Closes on an outside click or `Escape`; each option is `role="option"`
with `aria-selected`, the trigger has `aria-haspopup="listbox"` and
`aria-expanded`.

### 2.5 TripCard

**Purpose** — a bookable product on the storefront. The photograph is the
whole card, 2:3 as the source files are shot.

**Anatomy** — `[photo] [destination · duration label] [name] [price, mono] [next date] [seats left, accent]`.

**States**

| State | Visual change | Tokens |
|---|---|---|
| Default | Photo fills the 2:3 frame, bottom scrim (`bg-gradient-to-t from-ink to-transparent`) carries the text | `--ink`, `.fig` |
| Hover | Photo scales to `1.03` over `--duration-base` | `--duration-base` |

### 2.6 GuideCard

**Purpose** — an article/guide teaser, 3:2 as the source files are shot.

**Anatomy** — `[photo] [category · date label] [title] [excerpt?]`.

**States**

| State | Visual change | Tokens |
|---|---|---|
| Default | Title in `--ink` | — |
| Hover | Photo scales to `1.03`; title becomes `--accent` | `--duration-base`, `--accent` |

### 2.7 ProductImage

**Purpose** — every supplier product photograph shown whole (never
cropped) on a light tile, so a light-coloured product never disappears
into the page.

**Anatomy** — fixed-aspect tile (`1/1` default, `4/5`, or `4/3`) with the
photo inset 8% and shown with `object-contain`.

**States**

| State | Visual change | Tokens |
|---|---|---|
| Default (has photo) | Photo on `--product-ground` tile | `--product-ground` |
| Empty (no photo yet / `slot` given) | Flat block, caption text, ring on `--line` | `--picture-ground`, `--picture-ink`, `--line` |

### 2.8 Rating

**Purpose** — a star rating that reads at a glance.

**Anatomy** — `max` stars, `value` of them filled.

**States** — one, `default`: filled stars in `--accent`, the rest outlined
in `--line`. There is no interactive (clickable) rating anywhere in the
product.

### 2.9 Badge

**Purpose** — a record's state as a word with a small mark, the word
always present so the mark is never the only carrier of meaning.

**Anatomy** — `[mark] label`.

**Variants**

| Tone | Mark | Tokens |
|---|---|---|
| `neutral` | `○` | `--line` border, `--ink-soft` text |
| `good` | `●` | `--line` border, `--ink` text |
| `warn` | `◆` | `--field-line` border, `--ink` text |
| `bad` | `■` | `--field-line` border, `--ink-soft` text |

No tone is carried by colour — every tone renders in the same neutral ink
family; the shape of the mark is the distinction (see §4 Known deviations
on the `good`/`bad` pair sharing visual weight).

### 2.10 DataTable

**Purpose** — the list of records a CMS screen works from: sortable
columns, paging by number, a row that opens its record.

**Anatomy** — `[sortable headers] [rows] [pagination + page-size]`.

**States**

| State | Visual change | Tokens |
|---|---|---|
| Default | `border-line` cell dividers, header text `--ink-soft` | `--line` |
| Row hover | `bg-ground` | `--ground` |
| Sorted column | Arrow flips (`▲`/`▼`) vs. unsorted `↕`; header stays `--ink-soft` | — |
| Loading | "Loading…" text in the body area | — |
| Empty | Caller-supplied message (e.g. "Nothing to show.") | — |

### 2.11 TableFilters / SearchBox / FilterSelect / DateRange

**Purpose** — the filter bar above a `DataTable`; filters persist to the
URL so a filtered view can be shared as a link.

**States** — one, `default`, for each: these are thin wrappers around
Input/Select (§2.3/§2.4) and inherit those states.

### 2.12 DashboardLayout

**Purpose** — the CMS shell: a left nav (permanent ≥1024px, a full-screen
drawer below it) and the page's content on the right. Never a hero, never
a public footer.

**Anatomy** — `[nav: brand, grouped links, optional badge count] [header: title, actions, session] [content]`.

**States**

| State | Visual change | Tokens |
|---|---|---|
| Default | Sidebar `bg-surface`, content `bg-ground` | `--surface`, `--ground` |
| Active nav item | `bg-accent text-accent-ink` | `--accent` |
| Nav item hover | `bg-ground` | `--ground` |
| Mobile drawer open | Full-screen `bg-surface` overlay, `z-60` | — |

### 2.13 Stat

**Purpose** — one dashboard figure at a glance.

**Anatomy** — `[icon + label] [value, large mono] [note?]`.

**States** — one, `default`.

### 2.14 Bars

**Purpose** — a small bar chart (e.g. bookings by week).

**Anatomy** — `[caption] [bar + value + x-label, per point]`.

**States** — one, `default`. Bars are always `--accent`; there is no
multi-series variant.

### 2.15 QrCode

**Purpose** — a deterministic, generated QR-like mark for a booking code
(no external QR library — the mark is drawn from the code string itself).

**States** — one, `default`, drawn in `--ink` via `currentColor`.

### 2.16 ContactForm

**Purpose** — the one way a visitor gets in touch; what is sent reaches
the owner outside this product. Present wherever the site invites contact.

**Anatomy** — `[name] [phone or email] [extra booking fields?] [message] [honeypot, hidden] [submit]`.

**States**

| State | Visual change | Tokens |
|---|---|---|
| Idle | Fields empty, submit enabled | — |
| Sending | Submit disabled, label "Sending…" | — |
| Sent | Form replaced by one thank-you line | — |
| Failed | `role="alert"` error line above the submit button | — |
| Offline (`canSend` false) | A small note under the form explaining it is not wired up yet | `--ink-soft` |

### 2.17 ContactDock

**Purpose** — call/Zalo always in reach on a phone, below 1024px only.

**Anatomy** — two round 56px buttons, bottom-right, fixed.

**States** — one, `default`. Shows only the buttons for which a number is
configured in `content.json`; shows nothing at all when neither is set.

### 2.18 RequireRole

**Purpose** — gates a CMS page to the roles it belongs to; this is the
design's mock of the check, repeated server-side once built.

**States**

| State | Visual change | Tokens |
|---|---|---|
| Allowed | Renders the page | — |
| Denied | A centred message naming who the area is for and the visitor's own role/visitor status | — |

### 2.19 MobileMenu / MenuToggle

**Purpose** — the drawer navigation below 1024px, opened by a three-line
icon that becomes an X.

**States**

| State | Visual change | Tokens |
|---|---|---|
| Closed | Icon = hamburger | — |
| Open | Icon = X, full-screen panel over content, body scroll locked, `Escape` closes | `z-60` |

## 3. Content and formatting

- Voice and tone: plain, direct, second person ("Pick a date, see the
  seats, pay now.") — short sentences, no exclamation, no sales language.
- Locale: `vi-VN`. Prices are formatted via `formatPrice` in Vietnamese
  đồng; dates via `formatDate`. Every number that is a price, a seat
  count, a date or a duration is set in `.fig` (IBM Plex Mono, tabular).
- Capitalization: sentence case everywhere — buttons ("Continue to
  payment"), headings, and labels never use Title Case.
- Empty-state wording names what is missing and, where there is a next
  action, what to do ("Nothing saved yet. Tap the heart on a trip and it
  waits here." / "Nothing matches these filters. Widen the price or clear
  a filter.").
- Error wording is plain and short, posted with `role="alert"`.

## 4. Known deviations

| Where | Deviation | Why it stands | Follow-up |
|---|---|---|---|
| Every interactive control (`Select`, buttons, inputs, nav links) | No visible focus-ring style is set anywhere in the product; no component overrides `outline`, so the browser default outline still applies, but no token (`--color-focus`) exists to make it consistent or on-brand | Nothing removes focus outright (`outline: none` is not used), so the product stays keyboard-usable, but the ring's colour and width are whatever each browser draws, not a product decision | Add a `--color-focus` token (`--accent` is the obvious candidate) and a shared `:focus-visible` rule the next time a component is touched |
| `--duration-fast` and `--ease-out` (`theme.css`) | Both tokens are declared but no component reads them; every transition in the product (`MenuToggle`, `PhotoCredits` link) uses Tailwind's bare `transition-colors`, which defaults to its own 150ms/ease timing rather than these tokens | The visual effect is close enough that no review has flagged a mismatch | Wire hover/focus transitions to `--duration-fast`/`--ease-out` next time one of those components is edited |
| `Badge` tones (`good`/`bad`) | Tone is carried only by the mark shape (`●`/`■`) and identical ink-family text/border colour — there is no colour-coded "success green" or "danger red" badge anywhere, including for a rejected product or a cancelled booking | Deliberate: the direction's palette has one accent colour (`--accent`, red) reserved for the platform's own action/urgency (price, seats-left, primary buttons), so state semantics are never implied by hue. This is the design's own restraint, not an oversight | None — record and keep |
| `--shadow-sm` (`theme.css`) | Declared, never applied; every resting surface (cards, table) uses a plain `border-line` with no shadow at all | Consistent with the design's flat, low-shadow intent — `--shadow-md` is reserved for the one floating layer (the open `Select` listbox) | None — delete the unused token if it is still unused when the design is next revisited |

## 5. Change log

| Date | Change | Design PR |
|---|---|---|
| 2026-11-01 | Initial design system extracted from the approved design | PR #1 |
