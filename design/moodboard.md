# Moodboard — Nghệ An travel booking platform

The owner chose the direction **The departure board** from six drawn proposals. This
file records the sites the build learned from and the decisions that follow.

## Sites studied

| Site | What it is built with (look_at) | What is taken |
|---|---|---|
| cattour.vn/tour-du-lich-cua-lo | jQuery/Bootstrap, Roboto, 9,100px page, one sticky bar | The trade's own information order — departure city, date, printed per-person price, seats — kept, and set as a board instead of a brochure table. |
| land-book.com | Inter, 30 running animations on load, two sticky elements | Dense tile grid where the picture IS the card, nothing floating in white; load reveals staggered a few tens of ms apart. |
| awwwards.com/websites | Inter Tight, no scroll library, 4 animations | Small-caps metadata rails set beside big pictures; type doing the labelling work instead of boxes. |
| linear.app | Inter Variable **+ Berkeley Mono**, 117 animations, no pin/scrub, native scroll | Numbers and states set in a mono face, tabular, as the content; hairline rules between dense rows; short 0.6s fade-and-rise reveals with no scroll-jacking. |
| cal.com | Framer Motion, Cal Sans + Inter, native scroll | A booking screen read as a grid of real dates and times, not a marketing panel: the date picker is the hero of the page it is on. |

(getyourguide.com was behind a challenge page and was skipped.)

## The direction

A departure board for Nghệ An. The ground is paper-grey **#EFEFEC** with white
surfaces, near-black ink **#111214**, soft ink **#5A5C5F** and a single red
**#C8381F** that is used for one thing only: scarcity and urgency — seats left,
held-inventory timers, rejection. Type is **IBM Plex Sans** (OFL) throughout,
weight 400–500; the one house-style unlock is **IBM Plex Mono** for every figure
on the site — price, seats, date, duration, commission, totals, table columns —
tabular and often large, because on a booking platform the number is the content
and a board is what the page is. The grid is asymmetric: a 12-column page with a
vertical small-caps rail outside the left gutter and rows that bleed to both
viewport edges under hairlines. Pictures are 4:5 portraits, one shape in every
grid, used as the whole card with the name and mono price over a bottom scrim.
Motion is moderate: a 0.5s load moment on the hero, 16px fade-and-rise reveals as
sections enter, hover that lifts a card's scrim. Native scrolling, nothing pinned.
The management area is a different kind of screen: left menu, dense tables, mono
figures right-aligned, no hero and no footer.

COMMITMENTS

- The home search row (destination · date · travellers · price) bleeds to both viewport edges under a hairline, and is in view at 1440×790 with the first product row.
2. A vertical small-caps rail reading NGHỆ AN · DEPARTURES runs up the left edge of the home hero, outside the page grid.
3. Every figure on the site is IBM Plex Mono, tabular; the price on a home product card is set at 34px.
4. A featured product card IS its photograph — 4:5, name and mono price over a bottom scrim, seats-left in #C8381F — with no white card around it.
5. The departures page is a board: a right-aligned mono column of dates, seats and prices whose digits line up, one hairline per row.
6. Dashboard pages carry no marketing header, no hero and no footer — a left menu, filters in the address bar, and every list a table with "1–20 of N" under it.
7. One mode only: the palette above in `:root` of theme.css with `color-scheme: light`, and no second palette anywhere.
