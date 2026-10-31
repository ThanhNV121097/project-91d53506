# Directions — Nghệ An travel booking platform

## The reading

This is not an agency selling its own trips; it is a marketplace that has to make
many small Nghệ An operators — homestays in Kim Liên, boat and jeep runs into Pù Mát,
a tea-hill morning in Thanh Chương, a Cửa Lò beach stay — bookable in one place, with
a real calendar and a real payment. Two kinds of visitor arrive: the one who already
knows the trip they want (a family or an office doing Cửa Lò 2N1Đ, comparing a printed
price against three other tabs) and the one who knows only that they have a weekend and
has never heard of Thanh Chương. The first decides on date, seats left and total price;
the second decides on the place, and only then on the price. What this business sells on
is not being cheapest — every agency prints a price — it is that the date is real, the
seat is held, and the confirmation arrives without a phone call; and that the supplier
behind the listing is a named, verified local operator rather than a Hà Nội brochure.
What it is not: a single-brand tour company, a luxury resort brand, or a blog. It is a
booking desk for a province.

Everything below follows from that split: the first direction is built for the visitor
who arrives knowing, the second for the visitor who arrives undecided.

## The departure board

- **Suits you if:** most of your bookings will come from people who already know they
  want Cửa Lò or Kim Liên and are checking three other tabs — they want the date, the
  seats left and the total price on the first screen, and whoever shows it fastest gets
  the booking.
- **Palette (light):** ground `#EFEFEC` · surface `#FFFFFF` · ink `#111214` ·
  ink-soft `#5A5C5F` · accent `#C8381F` (lacquer red, the colour of a signboard and a
  seal — used only for live availability, price and the book button) ·
  accent-ink `#FFFFFF` · line `rgba(17,18,20,0.12)` · field-line `rgba(17,18,20,0.42)`
- **Faces:** display and body IBM Plex Sans (OFL). **The one unlock: every figure —
  price, seats left, date, duration — is set in IBM Plex Mono**, tabular and large,
  because on this site the number is the content and a departure board is what the page
  is. Carried through the whole site: catalogue, calendar, checkout, dashboard tables.
- **Scale at 1440:** h1 44px / 1.05, tracking −0.02em · h2 32px · price 34px mono ·
  labels 11px small-caps, 0.12em tracking. Deliberately short of the 76px ceiling: this
  first screen has to carry a search row, four bookable products and their prices, and a
  72px headline would push every one of them under the fold.
- **First screen:** a full-width search row (destination · date · travellers · price)
  bleeding to both viewport edges under a hairline, one 44px line of copy on the left
  edge, then a four-up row of product cards whose photograph is the whole card — 4:5,
  name and mono price set over a bottom scrim, seats-left in red — with a vertical
  small-caps rail running up the left edge.
- **The one device:** the hairline rule system — every figure sits on a hairline that
  runs to the viewport edge, so the screen reads as a board, not a page of cards.

## The place sells the trip

- **Suits you if:** you think most people do not yet know what Nghệ An has, and your
  job is to show them Pù Mát or the tea hills large enough that they want to go — the
  price matters, but it comes after the picture.
- **Palette (dark):** ground `#0C0D0F` · surface `#16181B` · ink `#F4F1EA` ·
  ink-soft `#A09C93` · accent `#E4B363` (dry sand / late light) · accent-ink `#16140F` ·
  line `rgba(244,241,234,0.14)` · field-line `rgba(244,241,234,0.42)`
- **Faces:** display Bricolage Grotesque (OFL) — **the one unlock**, a grotesk with real
  character in its wide forms and tight joins, for a site whose headings name places;
  body Inter. Nothing else on the site deviates from the house style.
- **Scale at 1440:** h1 72px / 1.02, tracking −0.03em · h2 46px · place names 20px ·
  prices 18px, tabular. The screen has one thing to say, so the headline takes the
  allowance.
- **First screen:** one photograph full-bleed across the whole window, dark-graded, with
  the headline set on the left edge and running off it, and a row of three square
  destination tiles overlapping the photograph's bottom edge, each with its place name
  and its from-price.
- **The one device:** the overlap — the tile row crosses the photograph's lower edge and
  breaks out of the content column, so the picture is never a framed box.

## What they share

Both ship the same searchable catalogue, calendar pricing, online payment and the
supplier/admin dashboard; they differ in what the first screen bets the visitor came
for. Prices and product names on the two pages are **samples** — the owner has supplied
no product list yet.

## The map that knows the province

- **Suits you if:** you think a buyer's real hesitation is not the price but trust —
  who this supplier actually is, whether the licence is real, exactly where the place
  is — and your job is to answer that with a verified badge and a map before they
  reach for the phone.
- **Palette (light):** ground `#F3EEE2` (parchment) · surface `#FFFFFF` · ink `#1E2A22`
  (forest ink) · ink-soft `#5C6B5E` · accent `#B5542B` (terracotta / route-line) ·
  accent-ink `#FFFFFF` · line `rgba(30,42,34,0.14)`
- **Faces:** display Fraunces (OFL) — **the one unlock**, a serif with ink-trap
  character, so the page reads like a verified guidebook entry rather than a brochure;
  body Inter, used for every list row, badge and distance figure.
- **Scale at 1440:** h1 50px / 1.08, tracking −0.01em · h2 28px · badge/label 11px
  uppercase, 0.14em tracking · list price 20px, tabular Inter. The headline stays modest
  because the screen's real content is the list and the map beside it, not a slogan.
- **First screen:** a hairline splits the window in two — left 45% a scrollable list of
  five verified listings, each numbered, with its operator name, a licence badge, a
  star rating, distance from Cửa Lò, and its price; right 55% a drawn map of the Nghệ An
  coast and hills with the same five numbers pinned to their real places and a legend
  by product type (tour · homestay · experience · transport). No photograph fills the
  screen; the map is the picture.
- **The one device:** the numbers — pin 3 on the map is row 3 in the list, nothing else
  ties them, and that sync is the whole argument for a marketplace over a brochure.

## The province's own guide

- **Suits you if:** you think the sell is the story — Uncle Hồ's village, a tea-hill
  sunrise, a boat up Pù Mát — and a visitor who has read one good paragraph about a
  place books more readily than one who has only compared a price grid.
- **Palette (light):** ground `#FBF7EF` (warm paper) · surface `#F1E9D8` · ink `#241C14`
  · ink-soft `#756658` · accent `#1F3A5F` (printed-ribbon indigo) · accent-ink `#FBF7EF`
  · line `rgba(36,28,20,0.14)`
- **Faces:** display DM Serif Display (OFL) — **the one unlock**, a magazine serif with
  a dramatic italic, for a site whose first screen is a headline and a byline before it
  is a price; body Inter.
- **Scale at 1440:** h1 64px / 1.04, tracking −0.01em, serif · h2 34px serif italic
  subheads · byline/meta 12px uppercase, 0.12em tracking · price 16px tabular, set small
  and secondary wherever it appears.
- **First screen:** a masthead row (issue line, today's date, a search glyph) under a
  hairline, then a two-column editorial spread — left, one large feature photograph
  with a serif drop headline and a "Read the guide" link running under it; right, three
  shorter stories stacked, each a small photograph, a category tag, a serif subhead and
  one line, with a small price pill set quietly at the end of the line, not as the card.
- **The one device:** the price is never the loudest thing on the screen — it sits as a
  small pill at the end of a sentence, so the page reads as an issue of a magazine that
  happens to let you book, not a shop that happens to have articles.

## The host, not the brochure

- **Suits you if:** you think a booking happens because of trust in a *person*, not a
  layout — put one real local operator's face and their own words on the screen before
  any price, and let that carry the weight a map pin or a star rating can't.
- **Palette (dark):** ground `#1B3A2F` (deep forest, not a neutral — the colour itself
  is the brand, not a backdrop for one) · surface `#234A3B` · ink `#F6F1E4` ·
  ink-soft `#B9C9BE` · accent `#E8A33D` (turmeric gold, a market and lantern colour) ·
  accent-ink `#1B3A2F` · line `rgba(246,241,228,0.16)`
- **Faces:** display Lora (OFL) — **the one unlock**, a warm, conversational serif built
  to carry a spoken line rather than a slogan, because this screen's headline is a
  sentence someone actually said, not copy written for them; body Inter.
- **Scale at 1440:** quote 38px / 1.35, serif italic, no tracking change · host name
  signature 22px upright Lora, set under its own hairline · stat figures 20px Inter,
  tabular · stat labels 11px uppercase, 0.14em tracking. No 70px+ headline anywhere:
  the quote is long enough to need room to breathe, not a slogan's single line.
- **First screen:** split screen, no search row and no card grid. Right 55%, a full-bleed
  portrait photograph of one named local operator, cropped close. Left 45%, on the deep
  forest ground: a large quoted line in their own words as the headline, their name and
  role signed underneath on its own hairline, then a plain three-figure trust row
  (listings run, response time, years operating) and a single "Book directly with
  [name]" button — nothing else competes with the quote for the eye.
- **The one device:** the hairline under the host's name is cut to the exact width of
  the name set above it, so it reads as a signature closing the quote, not a rule left
  over from a template.

## The whole province, sorted by price

- **Suits you if:** you think your buyer already has three tabs open comparing prices,
  and the fastest way to win the booking is to skip the pitch entirely — show every
  bookable thing at once, filterable, sorted by price, the second the page loads.
- **Palette (light):** ground `#F5F6F8` · surface `#FFFFFF` · ink `#14181D` ·
  ink-soft `#6B7280` · accent `#1555D6` (plain utility blue — chosen because this screen
  is selling speed, not a mood) · accent-ink `#FFFFFF` · line `rgba(20,24,29,0.12)`
- **Faces:** display and body Inter — no unlock. The screen's one idea is that it does
  not need a personality: every pixel not spent on a filter, a rating or a price is a
  pixel slowing the comparison down.
- **Scale at 1440:** no real h1 — the masthead label sits at 13px uppercase · filter
  labels 12px · card title 14px · card price 20px Inter, tabular, bold, the single
  largest thing on the screen. Density over drama: more bookable things visible beats a
  bigger headline.
- **First screen:** a thin top bar (logo, a compact destination/date/traveller search)
  over a two-part body with no hero at all: left a fixed 220px filter column (type,
  destination, price range, star rating, duration, all as plain checkboxes and a
  slider), right a tight four-column grid of a dozen small listing cards — thumbnail,
  operator name, rating, duration tag, price — above a result count and a sort-by
  control.
- **The one device:** every card's price sits in the same bottom-right corner
  regardless of how tall its card is, so the whole grid reads as one scannable column
  of numbers, which is the entire argument for showing this many things on one screen.

CHOSEN: The departure board — most bookings here come from people who already know
they want Cửa Lò or Kim Liên and are comparing three other tabs, so this business wins
on showing the date, the seats left and the real price for that date first: the search
row bleeds edge to edge above everything, the figures are mono and tabular all the way
through the catalogue, the calendar, the checkout and the dashboard tables, and a
departure board is the one shape that reads as a booking engine rather than a brochure.
