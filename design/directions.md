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
