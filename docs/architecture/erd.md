# Database Design (ERD) — Nghệ An Departures

Engine: PostgreSQL 16
Last updated: 2026-11-01
Source requirements: `docs/account/SRS.md`, `docs/admin/SRS.md`,
`docs/auth/SRS.md`, `docs/booking/SRS.md`, `docs/contact/SRS.md`,
`docs/data/SRS.md`, `docs/notifications/SRS.md`, `docs/payments/SRS.md`,
`docs/search/SRS.md`, `docs/site/SRS.md`, `docs/suppliers/SRS.md`

## 1. Overview

This schema stores every record collection the storefront and the two CMS
dashboards read and write: accounts and sessions (`auth`), supplier profiles
and their products/departures (`suppliers`), the booking and payment state
machines (`booking`, `payments`), and the Admin's moderation/finance/content
tools (`admin`). Aggregate roots are `users`, `suppliers`, `products`,
`bookings`. Files themselves (licence documents, product photos) live in
object storage; only their CDN URLs are stored here (`suppliers.documents`,
`products.image`). The contact form (`contact` module) forwards to an
external inbox and writes nothing to this database.

19 tables in total: 15 map directly to a `schema.json` collection
(`products`, `destinations`, `categories`, `departures`, `guides`,
`reviews`, `suppliers`, `bookings`, `payouts`, `users`, `vouchers`,
`campaigns`, `complaints`, `audit`, `notifications`, `settings` — that is
16, see note below), plus `payments` (payments module), `sessions` and
`otp_codes` (auth module, no `schema.json` entry because the frontend mock
never needed a session store), and `wishlists` (account module,
ACCOUNT-002 — no `schema.json` entry for the same reason).

Note on the 15-vs-16 count in `docs/architecture/overview.md` §4: that
count was written before `schema.json` was re-read line by line here; the
file actually lists 16 collections (`products` through `settings`). All 16
appear below, so no `schema.json` entity is missing and none is invented.

## 2. Diagram

```mermaid
erDiagram
    USERS ||--o| SUPPLIERS : "may run"
    USERS ||--o{ SESSIONS : "has"
    USERS ||--o{ BOOKINGS : "makes"
    USERS ||--o{ WISHLISTS : "saves"
    USERS ||--o{ AUDIT : "acts in"
    SUPPLIERS ||--o{ PRODUCTS : "lists"
    SUPPLIERS ||--o{ PAYOUTS : "paid via"
    PRODUCTS ||--o{ DEPARTURES : "scheduled as"
    PRODUCTS ||--o{ REVIEWS : "reviewed in"
    PRODUCTS ||--o{ WISHLISTS : "saved as"
    DEPARTURES ||--o{ BOOKINGS : "booked as"
    BOOKINGS ||--o{ PAYMENTS : "paid via"
    BOOKINGS ||--o{ COMPLAINTS : "disputed in"
    VOUCHERS ||--o{ BOOKINGS : "redeemed by"

    USERS {
        uuid id PK
        citext email UK
        text phone UK
        text password_hash
        text name
        text role
        text permissions
        text status
        timestamptz created_at
        timestamptz updated_at
    }
    SESSIONS {
        uuid id PK
        uuid user_id FK
        text token_hash UK
        timestamptz expires_at
        timestamptz revoked_at
        timestamptz created_at
    }
    OTP_CODES {
        uuid id PK
        text phone
        text code_hash
        timestamptz expires_at
        boolean used
        timestamptz created_at
    }
    SUPPLIERS {
        uuid id PK
        uuid user_id FK,UK
        text name
        text place
        text kind
        text[] documents
        boolean verified
        numeric commission
        text bank_name
        text bank_account_number
        text bank_account_holder
        text rejection_reason
        timestamptz created_at
        timestamptz updated_at
    }
    PRODUCTS {
        uuid id PK
        uuid supplier_id FK
        text name
        text kind
        text destination
        text duration
        numeric price
        text image
        text summary
        text[] itinerary
        text[] includes
        text[] excludes
        text policy
        text confirmation
        text status
        text rejection_reason
        text place
        numeric map_x
        numeric map_y
        timestamptz created_at
        timestamptz updated_at
    }
    DEPARTURES {
        uuid id PK
        uuid product_id FK
        date date
        integer capacity
        integer seats
        numeric price
        text season
        text state
        timestamptz created_at
        timestamptz updated_at
    }
    DESTINATIONS {
        uuid id PK
        text name UK
        text line
        text image
        numeric from_price
        timestamptz created_at
        timestamptz updated_at
    }
    CATEGORIES {
        uuid id PK
        text name UK
        text icon
        timestamptz created_at
        timestamptz updated_at
    }
    GUIDES {
        uuid id PK
        text slug UK
        text title
        text category
        date published_on
        text image
        text excerpt
        text body
        timestamptz created_at
        timestamptz updated_at
    }
    REVIEWS {
        uuid id PK
        uuid product_id FK
        text author
        integer rating
        date reviewed_on
        text text
        text reply
        text status
        timestamptz created_at
        timestamptz updated_at
    }
    BOOKINGS {
        uuid id PK
        text code UK
        uuid departure_id FK
        uuid buyer_id FK
        uuid voucher_id FK
        integer adults
        integer children
        text traveller_name
        text traveller_phone
        text traveller_email
        text traveller_note
        numeric total
        text status
        text payment
        timestamptz held_until
        timestamptz created_at
        timestamptz updated_at
    }
    PAYMENTS {
        uuid id PK
        uuid booking_id FK
        text provider
        numeric amount
        text status
        text gateway_transaction_id UK
        timestamptz created_at
        timestamptz updated_at
    }
    VOUCHERS {
        uuid id PK
        text code UK
        numeric discount_percent
        numeric discount_amount
        integer used
        integer "limit"
        date expires
        text status
        timestamptz created_at
        timestamptz updated_at
    }
    PAYOUTS {
        uuid id PK
        uuid supplier_id FK
        text period
        numeric gross
        numeric commission
        numeric net
        text status
        date paid_on
        timestamptz created_at
        timestamptz updated_at
    }
    COMPLAINTS {
        uuid id PK
        uuid booking_id FK
        text customer
        text issue
        timestamptz opened_at
        numeric refund_requested
        text status
        timestamptz created_at
        timestamptz updated_at
    }
    CAMPAIGNS {
        uuid id PK
        text name
        text channel
        date starts_on
        date ends_on
        integer bookings_count
        text status
        timestamptz created_at
        timestamptz updated_at
    }
    AUDIT {
        bigint id PK
        uuid actor_id FK
        text actor_label
        text action
        text target
        timestamptz created_at
    }
    NOTIFICATIONS {
        uuid id PK
        text event
        text channel
        text template
        text status
        timestamptz created_at
    }
    SETTINGS {
        uuid id PK
        text name UK
        text value
        text note
        timestamptz created_at
        timestamptz updated_at
    }
    WISHLISTS {
        uuid id PK
        uuid user_id FK
        uuid product_id FK
        timestamptz created_at
    }
```

Cardinality notation: `||` exactly one, `o|` zero or one, `}o` zero or many,
`}|` one or many. Read left to right.

## 3. Entities

### 3.1 `users`

**Purpose** — one account per Buyer, Supplier, Admin or sub-admin.
**Traces to** — AUTH-001 to AUTH-004, ADMIN-003.

| Column | Type | Null | Default | Unique | Description |
|---|---|---|---|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` | PK | Surrogate key |
| `email` | `citext` | yes | — | UK (partial, see below) | Case-insensitive lookup key (AUTH-001); null for a phone-only account |
| `phone` | `text` | yes | — | UK (partial) | E.164-ish string; null for an email/Google-only account |
| `password_hash` | `text` | yes | — | | Null for a Google-only account (AUTH-003 AC-2) that never sets a password |
| `name` | `text` | no | `''` | | Display name |
| `role` | `text` | no | — | | `buyer` / `supplier` / `admin` — sub-admin is `admin` + a restricted `permissions` value (ADMIN-003) |
| `permissions` | `text` | yes | — | | Null for a full admin or a non-admin; names the restricted set for a sub-admin (ADMIN-003.3) |
| `status` | `text` | no | `'Active'` | | `Active` / `Locked` / `Awaiting documents` (AUTH-001.1, ADMIN-003.2) |
| `created_at` | `timestamptz` | no | `now()` | | |
| `updated_at` | `timestamptz` | no | `now()` | | |

**Nullable columns** — `email`: a phone-only or future non-email sign-up
has none. `phone`: an email/Google account never sets one. `password_hash`:
a Google-only account authenticates without one. `permissions`: meaningless
outside role `admin`.

**Foreign keys** — none (root entity).

**Constraints**
- `ck_users_role` — `role IN ('buyer','supplier','admin')`.
- `ck_users_status` — `status IN ('Active','Locked','Awaiting documents')`.
- `ck_users_has_credential` — `password_hash IS NOT NULL OR email IS NOT NULL OR phone IS NOT NULL` (every row must be reachable by at least one sign-in method).

**Indexes**

| Name | Columns | Type | Query it serves |
|---|---|---|---|
| `uq_users_email` | `email` | unique, partial `WHERE email IS NOT NULL` | AUTH-001 email lookup; lets many rows have a null email |
| `uq_users_phone` | `phone` | unique, partial `WHERE phone IS NOT NULL` | AUTH-002 phone lookup |
| `idx_users_role_status` | `role, status` | btree | ADMIN-003 "list users filterable by role and status" |

**Lifecycle** — hard delete never performed by any requirement (lock/unlock
only, ADMIN-003); no soft-delete column needed.

---

### 3.2 `sessions`

**Purpose** — the session token AUTH-004 resolves back to a `users` row.
**Traces to** — AUTH-004.

| Column | Type | Null | Default | Unique | Description |
|---|---|---|---|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` | PK | |
| `user_id` | `uuid` | no | — | | Owning account |
| `token_hash` | `text` | no | — | UK | SHA-256 of the token; the raw token is never stored (mirrors `password_hash`'s rule) |
| `expires_at` | `timestamptz` | no | — | | Server-side TTL, independent of the cookie's own expiry |
| `revoked_at` | `timestamptz` | yes | — | | Null while active; set on sign-out (AUTH-004.4) — a value here means "invalidated early", not an error state |
| `created_at` | `timestamptz` | no | `now()` | | |

**Nullable columns** — `revoked_at`: absence is the normal "still signed
in" state.

**Foreign keys**

| Column | References | On delete | On update | Why |
|---|---|---|---|---|
| `user_id` | `users.id` | CASCADE | — | A session has no meaning once its account is gone |

**Constraints** — none beyond the FK and uniqueness above.

**Indexes**

| Name | Columns | Type | Query it serves |
|---|---|---|---|
| `uq_sessions_token_hash` | `token_hash` | unique btree | AUTH-004.1 resolving a request's token to a row |
| `idx_sessions_user_id` | `user_id` | btree | Listing/revoking a user's own sessions on sign-out |

**Lifecycle** — hard delete via a periodic sweep of rows past `expires_at`;
the application never reads an expired row as valid regardless of sweep
timing (the `expires_at` check runs on every resolve, not just the sweep).

---

### 3.3 `otp_codes`

**Purpose** — the phone-OTP record AUTH-002 issues and checks.
**Traces to** — AUTH-002.

| Column | Type | Null | Default | Unique | Description |
|---|---|---|---|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` | PK | |
| `phone` | `text` | no | — | | The phone the code was sent to; not FK'd to `users` because a first-time sign-up phone may not have a row yet |
| `code_hash` | `text` | no | — | | Hash of the 6-digit code — never stored or returned in plaintext (AUTH-002.1) |
| `expires_at` | `timestamptz` | no | — | | Short-lived (AUTH-002 AC-3) |
| `used` | `boolean` | no | `false` | | Single-use flag (AUTH-002 AC-4) |
| `created_at` | `timestamptz` | no | `now()` | | |

**Nullable columns** — none.

**Foreign keys** — none (a phone may not yet have a `users` row at request
time).

**Constraints** — none beyond the not-null set above.

**Indexes**

| Name | Columns | Type | Query it serves |
|---|---|---|---|
| `idx_otp_codes_phone_created_at` | `phone, created_at` | btree | AUTH-002.1's rate-limit check ("requested repeatedly in a short window") and looking up the latest code for a phone |

**Lifecycle** — hard delete via a periodic sweep of rows past
`expires_at`; `used` rows are never re-checked as valid regardless of
sweep timing.

---

### 3.4 `suppliers`

**Purpose** — one profile per Supplier account, its verification state
and bank details.
**Traces to** — SUPPLIERS-001, ADMIN-001, ADMIN-005.

| Column | Type | Null | Default | Unique | Description |
|---|---|---|---|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` | PK | |
| `user_id` | `uuid` | no | — | UK | The one account this profile belongs to |
| `name` | `text` | no | `''` | | Business name |
| `place` | `text` | no | `''` | | Based-in location |
| `kind` | `text` | no | `''` | | Tour / homestay / transport / experience operator |
| `documents` | `text[]` | no | `'{}'` | | CDN URLs from `POST /v1/media` (SUPPLIERS-006); empty array before any upload |
| `verified` | `boolean` | no | `false` | | Set `true` only by `admin` (ADMIN-001.2); never by this module |
| `commission` | `numeric(5,2)` | yes | — | | Per-supplier override percentage; null = use the global rate (ADMIN-005.1) |
| `bank_name` | `text` | yes | — | | Null until SUPPLIERS-001 is submitted once |
| `bank_account_number` | `text` | yes | — | | Same as above |
| `bank_account_holder` | `text` | yes | — | | Same as above |
| `rejection_reason` | `text` | yes | — | | Null unless an admin rejected the profile (ADMIN-001.3); cleared on re-approval |
| `created_at` | `timestamptz` | no | `now()` | | |
| `updated_at` | `timestamptz` | no | `now()` | | |

**Nullable columns** — `commission`: distinguishes "no override" from "0%
override", which are different facts (ADMIN-005 AC-2 vs the boundary case).
`bank_*`: a brand-new supplier has not submitted them yet (SUPPLIERS-001.1
runs once, after registration). `rejection_reason`: most profiles are never
rejected.

**Foreign keys**

| Column | References | On delete | On update | Why |
|---|---|---|---|---|
| `user_id` | `users.id` | RESTRICT | — | A supplier profile must not be orphaned by deleting its account; lock the account instead (ADMIN-003) |

**Constraints**
- `ck_suppliers_commission_range` — `commission IS NULL OR (commission >= 0 AND commission <= 100)`.

**Indexes**

| Name | Columns | Type | Query it serves |
|---|---|---|---|
| `uq_suppliers_user_id` | `user_id` | unique btree | One profile per account; also serves "my own profile" lookup on sign-in |
| `idx_suppliers_verified` | `verified` | btree, partial `WHERE verified = false` | ADMIN-001.1 "`suppliers` rows with `verified = false`" queue |

**Lifecycle** — hard delete never performed; a supplier is deactivated via
`users.status = 'Locked'` on the owning account, not by removing this row
(payout and audit history must survive).

---

### 3.5 `products`

**Purpose** — one listing per product, carrying its approval state.
**Traces to** — SUPPLIERS-002, SUPPLIERS-003, SUPPLIERS-004 (via
`departures`), ADMIN-001, SITE-001, SITE-002, SEARCH-001.

| Column | Type | Null | Default | Unique | Description |
|---|---|---|---|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` | PK | |
| `supplier_id` | `uuid` | no | — | | Owning supplier (SUPPLIERS-002.-, "never another's") |
| `name` | `text` | no | `''` | | |
| `kind` | `text` | no | `''` | | Tour / homestay / experience / transport / ticket |
| `destination` | `text` | no | `''` | | |
| `duration` | `text` | no | `''` | | Free text ("2N1Đ") per the existing mock field |
| `price` | `numeric(19,4)` | no | `0` | | Base per-person price; a departure row may override it (SUPPLIERS-004.2) |
| `image` | `text` | yes | — | | CDN URL from SUPPLIERS-006; null until the supplier uploads one |
| `summary` | `text` | no | `''` | | |
| `itinerary` | `text[]` | no | `'{}'` | | Day-by-day lines |
| `includes` | `text[]` | no | `'{}'` | | |
| `excludes` | `text[]` | no | `'{}'` | | |
| `policy` | `text` | yes | — | | Null means "supplier has not set one" — SITE-002.3 shows the platform's waiting-on-default line for exactly this state, so null and "" are different facts here |
| `confirmation` | `text` | yes | — | | Null = manual confirmation required; non-empty = instant-confirm note (`decision.confirmation_mode`) |
| `status` | `text` | no | `'draft'` | | `draft` / `pending` / `approved` / `rejected` / `suspended` (brief's state machine) |
| `rejection_reason` | `text` | yes | — | | Null unless currently rejected or edits-requested; cleared when resubmitted and decided again (SUPPLIERS-002.5) |
| `place` | `text` | no | `''` | | Where it starts |
| `map_x` | `numeric(6,3)` | yes | — | | Null until the supplier places it on the map (optional feature, "Map view") |
| `map_y` | `numeric(6,3)` | yes | — | | Same as above |
| `created_at` | `timestamptz` | no | `now()` | | |
| `updated_at` | `timestamptz` | no | `now()` | | |

**Nullable columns** — `image`: a draft may have no photo yet. `policy`:
distinguishes "not set" (shows the default line) from an empty string the
supplier deliberately saved — the SRS only defines the "not set" case, so
null is the one representation of absence. `confirmation`: null is the
documented default meaning manual confirmation (not an empty string, so a
supplier can never accidentally type into instant-confirm). `rejection_reason`:
most products are never rejected. `map_x`/`map_y`: optional, not MVP.

**Foreign keys**

| Column | References | On delete | On update | Why |
|---|---|---|---|---|
| `supplier_id` | `suppliers.id` | RESTRICT | — | A product must not be orphaned by deleting a supplier profile; profiles are never hard-deleted (§3.4) so this is a belt-and-suspenders rule |

**Constraints**
- `ck_products_status` — `status IN ('draft','pending','approved','rejected','suspended')`.
- `ck_products_price_nonneg` — `price >= 0`.

**Indexes**

| Name | Columns | Type | Query it serves |
|---|---|---|---|
| `idx_products_supplier_id` | `supplier_id` | btree | "my own products" (SUPPLIERS-002), payout/revenue joins |
| `idx_products_status` | `status` | btree | ADMIN-001's pending queue, SITE-001's approved featured row, SEARCH-001 |
| `idx_products_destination_kind` | `destination, kind` | btree | SEARCH-001's destination/kind filters |

**Lifecycle** — hard delete never performed; a product that should stop
being sold is moved to `suspended` (SUPPLIERS-003), never removed, so its
`bookings`/`reviews` history keeps a valid reference.

---

### 3.6 `departures`

**Purpose** — one bookable date per product, with its own capacity, seats
remaining and price.
**Traces to** — SUPPLIERS-004, BOOKING-001, SEARCH-001, SITE-001, SITE-003.

| Column | Type | Null | Default | Unique | Description |
|---|---|---|---|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` | PK | |
| `product_id` | `uuid` | no | — | | |
| `date` | `date` | no | — | | |
| `capacity` | `integer` | no | — | | Set on creation; SUPPLIERS-004.4 never lets `seats` exceed it |
| `seats` | `integer` | no | — | | Starts equal to `capacity`; decremented/incremented by `booking` module (BOOKING-001) |
| `price` | `numeric(19,4)` | yes | — | | Null means "use `products.price`"; non-null is this date's seasonal override (SUPPLIERS-004.2) |
| `season` | `text` | yes | — | | Null = standard pricing; `Weekend` / `Peak summer` / other named rule otherwise |
| `state` | `text` | no | `'Open'` | | `Open` / `Blocked` (SUPPLIERS-004.3) |
| `created_at` | `timestamptz` | no | `now()` | | |
| `updated_at` | `timestamptz` | no | `now()` | | |

**Nullable columns** — `price`: distinguishes "no override, use the base
price" from "overridden to this exact value", which matters because a base
price change must not silently repaint every departure that deliberately
chose a different number. `season`: standard-priced dates carry no rule
name.

**Foreign keys**

| Column | References | On delete | On update | Why |
|---|---|---|---|---|
| `product_id` | `products.id` | RESTRICT | — | A departure must not survive its product being removed, but products are never hard-deleted (§3.5), so RESTRICT documents the intent without ever firing |

**Constraints**
- `ck_departures_state` — `state IN ('Open','Blocked')`.
- `ck_departures_seats_bounds` — `seats >= 0 AND seats <= capacity`.
- `ck_departures_capacity_positive` — `capacity > 0`.
- `uq_departures_product_date` — `UNIQUE (product_id, date)` — one departure row per product per calendar date (the design's calendar has no concept of two rows for the same date).

**Indexes**

| Name | Columns | Type | Query it serves |
|---|---|---|---|
| `idx_departures_product_id_date` | `product_id, date` | btree | SITE-002's calendar for one product, sorted by date |
| `idx_departures_date_state` | `date, state` | btree | SITE-001's "next 6 open departures" board, SITE-003's full board sorted by date |
| `idx_departures_season` | `season` | btree | SITE-003's pricing-rule filter |

**Lifecycle** — hard delete never performed; a date that should stop
accepting bookings is `Blocked`, not removed, since past `bookings` rows
reference it.

---

### 3.7 `destinations`

**Purpose** — the Home page's destination tiles.
**Traces to** — SITE-001, ADMIN-006.

| Column | Type | Null | Default | Unique | Description |
|---|---|---|---|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` | PK | |
| `name` | `text` | no | — | UK | |
| `line` | `text` | no | `''` | | One-line description |
| `image` | `text` | yes | — | | CDN URL; null before an admin sets one |
| `from_price` | `numeric(19,4)` | no | `0` | | |
| `created_at` | `timestamptz` | no | `now()` | | |
| `updated_at` | `timestamptz` | no | `now()` | | |

**Nullable columns** — `image`: a newly added destination may have none
yet.

**Foreign keys** — none.

**Constraints** — none beyond uniqueness above.

**Indexes** — none beyond the unique index on `name`; the table is small
and always read in full (SITE-001's destination grid).

**Lifecycle** — hard delete on ADMIN-006 AC-3 ("removes a destination") —
safe because nothing else foreign-keys to this table.

---

### 3.8 `categories`

**Purpose** — the product-type chips on Home and `/search`.
**Traces to** — SITE-001, ADMIN-006.

| Column | Type | Null | Default | Unique | Description |
|---|---|---|---|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` | PK | |
| `name` | `text` | no | — | UK | |
| `icon` | `text` | yes | — | | Null is a legitimate "no icon chosen yet" state |
| `created_at` | `timestamptz` | no | `now()` | | |
| `updated_at` | `timestamptz` | no | `now()` | | |

**Foreign keys** — none.

**Constraints** — none beyond uniqueness above.

**Indexes** — none; small table, always read in full.

**Lifecycle** — hard delete; nothing foreign-keys to this table (`products.kind`
is a free-text label, not an FK, matching the existing mock shape).

---

### 3.9 `guides`

**Purpose** — travel-guide articles (`/guides`, `/guides/:slug`).
**Traces to** — SITE-004.

| Column | Type | Null | Default | Unique | Description |
|---|---|---|---|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` | PK | |
| `slug` | `text` | no | — | UK | URL key for `/guides/:slug` |
| `title` | `text` | no | `''` | | |
| `category` | `text` | no | `''` | | Exact-match filter value (SITE-004.1) |
| `published_on` | `date` | yes | — | | Null = draft/unpublished; `/guides` lists only rows with a value (no requirement to show unpublished guides) |
| `image` | `text` | yes | — | | Null before an image is set |
| `excerpt` | `text` | no | `''` | | |
| `body` | `text` | no | `''` | | |
| `created_at` | `timestamptz` | no | `now()` | | |
| `updated_at` | `timestamptz` | no | `now()` | | |

**Foreign keys** — none.

**Constraints** — none beyond uniqueness on `slug`.

**Indexes**

| Name | Columns | Type | Query it serves |
|---|---|---|---|
| `idx_guides_category_published_on` | `category, published_on` | btree, partial `WHERE published_on IS NOT NULL` | SITE-004's category filter with paging, newest first |

**Lifecycle** — hard delete; nothing references a guide.

---

### 3.10 `reviews`

**Purpose** — traveller reviews of a product, with the supplier's reply
and the admin's moderation state.
**Traces to** — SITE-002, SUPPLIERS-006B, ADMIN-002.

| Column | Type | Null | Default | Unique | Description |
|---|---|---|---|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` | PK | |
| `product_id` | `uuid` | no | — | | |
| `author` | `text` | no | `''` | | Traveller display name |
| `rating` | `integer` | no | — | | 1–5 |
| `reviewed_on` | `date` | no | `CURRENT_DATE` | | |
| `text` | `text` | no | `''` | | |
| `reply` | `text` | yes | — | | Null = no supplier reply yet (SUPPLIERS-006B AC-1); a reply replaces, never duplicates (AC-3) |
| `status` | `text` | no | `'published'` | | `published` / `hidden` / `reported` (ADMIN-002) |
| `created_at` | `timestamptz` | no | `now()` | | |
| `updated_at` | `timestamptz` | no | `now()` | | |

**Nullable columns** — `reply`: most reviews are never replied to.

**Foreign keys**

| Column | References | On delete | On update | Why |
|---|---|---|---|---|
| `product_id` | `products.id` | RESTRICT | — | Products are never hard-deleted (§3.5); documents intent |

**Constraints**
- `ck_reviews_rating_range` — `rating >= 1 AND rating <= 5`.
- `ck_reviews_status` — `status IN ('published','hidden','reported')`.

**Indexes**

| Name | Columns | Type | Query it serves |
|---|---|---|---|
| `idx_reviews_product_id_status` | `product_id, status` | btree | SITE-002's published-reviews list for one product |
| `idx_reviews_status` | `status` | btree, partial `WHERE status = 'reported'` | ADMIN-002's moderation queue |

**Lifecycle** — hard delete never performed; a policy-violating review is
`hidden` (ADMIN-002), not removed, preserving the supplier's reply and the
moderation record.

---

### 3.11 `bookings`

**Purpose** — one reservation per Buyer attempt, carrying the seat hold,
traveller details, total and state-machine status.
**Traces to** — BOOKING-001 to BOOKING-004, PAYMENTS-001, SUPPLIERS-005,
ACCOUNT-001, ADMIN-004.

| Column | Type | Null | Default | Unique | Description |
|---|---|---|---|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` | PK | |
| `code` | `text` | no | — | UK | Human-facing booking code (`NA-7X42K9` style), generated at creation |
| `departure_id` | `uuid` | no | — | | The specific date/product combination booked |
| `buyer_id` | `uuid` | no | — | | The owning account (ACCOUNT-001.1 — filtered "by the booking's owning user id") |
| `voucher_id` | `uuid` | yes | — | | Null = no voucher applied (BOOKING-002) |
| `adults` | `integer` | no | `1` | | |
| `children` | `integer` | no | `0` | | |
| `traveller_name` | `text` | no | — | | Required field (BOOKING-001.4) |
| `traveller_phone` | `text` | no | — | | Same |
| `traveller_email` | `text` | no | — | | Same |
| `traveller_note` | `text` | yes | — | | Optional free text |
| `total` | `numeric(19,4)` | no | — | | Set from the departure price × party size, minus any voucher discount |
| `status` | `text` | no | `'Awaiting Payment'` | | Brief's state machine: `Awaiting Payment` / `Paid` / `Confirmed` / `Completed` / `Cancelled` / `Refunded` |
| `payment` | `text` | yes | — | | Null until paid; set to the provider used on success (PAYMENTS-001 AC-1) |
| `held_until` | `timestamptz` | no | — | | `created_at + 15 minutes` (BOOKING-001.3) |
| `created_at` | `timestamptz` | no | `now()` | | |
| `updated_at` | `timestamptz` | no | `now()` | | |

**Nullable columns** — `voucher_id`: most bookings use none.
`traveller_note`: optional by design. `payment`: unset until a successful
payment writes it.

**Foreign keys**

| Column | References | On delete | On update | Why |
|---|---|---|---|---|
| `departure_id` | `departures.id` | RESTRICT | — | A booking must never be orphaned; departures are never hard-deleted |
| `buyer_id` | `users.id` | RESTRICT | — | Booking history (ACCOUNT-001) and finance records must survive; a buyer account is locked, never deleted |
| `voucher_id` | `vouchers.id` | SET NULL | — | A voucher's own lifecycle (expiry) must not retroactively break a past booking's record; the booking keeps its `total` either way |

**Constraints**
- `ck_bookings_status` — `status IN ('Awaiting Payment','Paid','Confirmed','Completed','Cancelled','Refunded')`.
- `ck_bookings_party_positive` — `adults + children > 0`.
- `ck_bookings_total_nonneg` — `total >= 0`.

**Indexes**

| Name | Columns | Type | Query it serves |
|---|---|---|---|
| `uq_bookings_code` | `code` | unique btree | BOOKING-003's `/booking/:code` lookup, ADMIN-004's exact-code search |
| `idx_bookings_buyer_id` | `buyer_id` | btree | ACCOUNT-001's "only the signed-in Buyer's own bookings" |
| `idx_bookings_departure_id` | `departure_id` | btree | SUPPLIERS-005's passenger list by departure |
| `idx_bookings_status_held_until` | `status, held_until` | btree, partial `WHERE status = 'Awaiting Payment'` | BOOKING-001.3's hold-expiry sweep |
| `idx_bookings_status_created_at` | `status, created_at` | btree | ADMIN-004's filter by status and date range |

**Lifecycle** — hard delete never performed; every terminal state
(`Completed`/`Cancelled`/`Refunded`) is a status value, not a deletion —
required for SUPPLIERS-007's revenue sums and ADMIN-004's full history.

---

### 3.12 `payments`

**Purpose** — one row per payment attempt against a booking, independent
of the booking's own status, so a retried/duplicate callback can be
de-duplicated.
**Traces to** — PAYMENTS-001.

| Column | Type | Null | Default | Unique | Description |
|---|---|---|---|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` | PK | |
| `booking_id` | `uuid` | no | — | | |
| `provider` | `text` | no | — | | `vnpay` for this iteration (PAYMENTS-001); `momo`/`zalopay`/`bank_transfer` reserved for later |
| `amount` | `numeric(19,4)` | no | — | | Equals `bookings.total` at initiation |
| `status` | `text` | no | `'pending'` | | `pending` / `succeeded` / `failed` |
| `gateway_transaction_id` | `text` | yes | — | | Null until the gateway assigns one at redirect; used to de-duplicate a retried IPN (PAYMENTS-001 AC-4) once set |
| `created_at` | `timestamptz` | no | `now()` | | |
| `updated_at` | `timestamptz` | no | `now()` | | |

**Nullable columns** — `gateway_transaction_id`: not known until VNPay
responds; a row is created before redirect (PAYMENTS-001.1), so it starts
null.

**Foreign keys**

| Column | References | On delete | On update | Why |
|---|---|---|---|---|
| `booking_id` | `bookings.id` | RESTRICT | — | A payment record is financial history; bookings are never hard-deleted so this never fires |

**Constraints**
- `ck_payments_provider` — `provider IN ('vnpay','momo','zalopay','bank_transfer')`.
- `ck_payments_status` — `status IN ('pending','succeeded','failed')`.

**Indexes**

| Name | Columns | Type | Query it serves |
|---|---|---|---|
| `idx_payments_booking_id` | `booking_id` | btree | Looking up a booking's payment attempts on callback |
| `uq_payments_gateway_transaction_id` | `gateway_transaction_id` | unique, partial `WHERE gateway_transaction_id IS NOT NULL` | PAYMENTS-001 AC-4's duplicate-callback de-dup |

**Lifecycle** — hard delete never performed (financial audit trail).

---

### 3.13 `vouchers`

**Purpose** — discount codes applied at checkout.
**Traces to** — BOOKING-002, ADMIN-006.

| Column | Type | Null | Default | Unique | Description |
|---|---|---|---|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` | PK | |
| `code` | `text` | no | — | UK (case-insensitive, see below) | |
| `discount_percent` | `numeric(5,2)` | yes | — | | Null if this voucher is a fixed-amount discount instead |
| `discount_amount` | `numeric(19,4)` | yes | — | | Null if this voucher is a percentage discount instead |
| `used` | `integer` | no | `0` | | Incremented once per distinct booking (BOOKING-002.2) |
| `limit` | `integer` | no | — | | Column named `"limit"` (quoted — reserved word) |
| `expires` | `date` | no | — | | |
| `status` | `text` | no | `'Active'` | | `Active` / `Inactive` |
| `created_at` | `timestamptz` | no | `now()` | | |
| `updated_at` | `timestamptz` | no | `now()` | | |

**Nullable columns** — exactly one of `discount_percent`/`discount_amount`
is set per row; the other is null by design (a voucher is either a percent
or a fixed amount, never both and never neither).

**Foreign keys** — none (referenced by `bookings.voucher_id`).

**Constraints**
- `ck_vouchers_status` — `status IN ('Active','Inactive')`.
- `ck_vouchers_one_discount_kind` — `(discount_percent IS NOT NULL) <> (discount_amount IS NOT NULL)` (exactly one is set).
- `ck_vouchers_used_bounds` — `used >= 0 AND used <= "limit"`.
- `uq_vouchers_code_ci` — `UNIQUE` on `lower(code)` via a unique index (see below) — BOOKING-002.1 looks up case-insensitively.

**Indexes**

| Name | Columns | Type | Query it serves |
|---|---|---|---|
| `uq_vouchers_code_lower` | `lower(code)` | unique btree (expression index) | BOOKING-002.1's case-insensitive code lookup |

**Lifecycle** — hard delete never performed; an expired/retired code is
`status = 'Inactive'`, preserving `used` history and the `bookings` rows
that reference it (FK is `SET NULL` on the booking side, §3.11).

---

### 3.14 `payouts`

**Purpose** — one row per supplier per reconciled period.
**Traces to** — ADMIN-005, SUPPLIERS-007.

| Column | Type | Null | Default | Unique | Description |
|---|---|---|---|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` | PK | |
| `supplier_id` | `uuid` | no | — | | |
| `period` | `text` | no | — | | e.g. `"2026-10"`; free text matching the existing mock shape |
| `gross` | `numeric(19,4)` | no | — | | Sum of the supplier's confirmed bookings in the period |
| `commission` | `numeric(19,4)` | no | — | | `gross × applicable rate` at reconciliation time |
| `net` | `numeric(19,4)` | no | — | | `gross - commission` |
| `status` | `text` | no | `'Pending'` | | `Pending` / `Paid` |
| `paid_on` | `date` | yes | — | | Null until marked paid |
| `created_at` | `timestamptz` | no | `now()` | | |
| `updated_at` | `timestamptz` | no | `now()` | | |

**Nullable columns** — `paid_on`: unset until the payout is actually sent.

**Foreign keys**

| Column | References | On delete | On update | Why |
|---|---|---|---|---|
| `supplier_id` | `suppliers.id` | RESTRICT | — | Payout history is financial record; suppliers are never hard-deleted |

**Constraints**
- `ck_payouts_status` — `status IN ('Pending','Paid')`.
- `uq_payouts_supplier_period` — `UNIQUE (supplier_id, period)` — ADMIN-005 AC-4: reconciliation already run for a period is never re-created, only read.

**Indexes**

| Name | Columns | Type | Query it serves |
|---|---|---|---|
| `idx_payouts_supplier_id` | `supplier_id` | btree | SUPPLIERS-007's "payout history for this supplier" |

**Lifecycle** — hard delete never performed (financial record).

---

### 3.15 `complaints`

**Purpose** — a Buyer's cancellation/rescheduling/refund request, and the
admin's resolution of it.
**Traces to** — BOOKING-004, ADMIN-004.

| Column | Type | Null | Default | Unique | Description |
|---|---|---|---|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` | PK | |
| `booking_id` | `uuid` | no | — | | |
| `customer` | `text` | no | — | | Denormalized traveller name at time of request, matching the existing mock column; the booking itself is the source of truth via `booking_id` |
| `issue` | `text` | no | — | | |
| `opened_at` | `timestamptz` | no | `now()` | | |
| `refund_requested` | `numeric(19,4)` | yes | — | | Null if the request did not name an amount |
| `status` | `text` | no | `'Open'` | | `Open` / `Resolved` / `Refunded` |
| `created_at` | `timestamptz` | no | `now()` | | |
| `updated_at` | `timestamptz` | no | `now()` | | |

**Nullable columns** — `refund_requested`: a rescheduling request may name
no amount.

**Foreign keys**

| Column | References | On delete | On update | Why |
|---|---|---|---|---|
| `booking_id` | `bookings.id` | RESTRICT | — | Dispute history is kept with the booking; bookings are never hard-deleted |

**Constraints**
- `ck_complaints_status` — `status IN ('Open','Resolved','Refunded')`.
- `uq_complaints_booking_open` — `UNIQUE (booking_id)` partial `WHERE status = 'Open'` — BOOKING-004's "a second request does not create a duplicate open record".

**Indexes**

| Name | Columns | Type | Query it serves |
|---|---|---|---|
| `idx_complaints_booking_id` | `booking_id` | btree | BOOKING-004's own-booking check, ADMIN-004's refund action |
| `idx_complaints_status` | `status` | btree, partial `WHERE status = 'Open'` | ADMIN-004's dispute queue |

**Lifecycle** — hard delete never performed (dispute/audit history).

---

### 3.16 `campaigns`

**Purpose** — marketing campaign records for the admin's content tools.
**Traces to** — ADMIN-006 (brief's "Marketing campaigns management", not
MVP-gated separately but part of the same content module's data).

| Column | Type | Null | Default | Unique | Description |
|---|---|---|---|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` | PK | |
| `name` | `text` | no | `''` | | |
| `channel` | `text` | no | `''` | | |
| `starts_on` | `date` | yes | — | | Null = not yet scheduled |
| `ends_on` | `date` | yes | — | | Null = open-ended |
| `bookings_count` | `integer` | no | `0` | | Denormalized counter, matching the existing mock shape; not maintained by a trigger in this iteration (read-mostly admin reporting field) |
| `status` | `text` | no | `'Draft'` | | `Draft` / `Active` / `Ended` |
| `created_at` | `timestamptz` | no | `now()` | | |
| `updated_at` | `timestamptz` | no | `now()` | | |

**Nullable columns** — `starts_on`/`ends_on`: a draft campaign may have
neither set yet.

**Foreign keys** — none.

**Constraints** — `ck_campaigns_status` — `status IN ('Draft','Active','Ended')`.

**Indexes** — none; small table, admin-only, no requirement implies a
filtered list beyond what a full scan handles at this volume.

**Lifecycle** — hard delete; no other table references a campaign.

---

### 3.17 `audit`

**Purpose** — one immutable row per state-changing admin action.
**Traces to** — ADMIN-007.

| Column | Type | Null | Default | Unique | Description |
|---|---|---|---|---|---|
| `id` | `bigint` | no | `generated always as identity` | PK | Append-only log; a bigint identity is cheaper than a uuid for a table that is written constantly and never looked up by a client-supplied id |
| `actor_id` | `uuid` | yes | — | | Null only if the system itself (not a human admin) ever writes a row; every requirement so far names an admin actor, so this is expected to always be set in practice |
| `actor_label` | `text` | no | — | | Denormalized name/email at the time of the action, so the log reads correctly even if the account is later renamed |
| `action` | `text` | no | — | | e.g. `"approved"`, `"rejected"`, `"locked"` |
| `target` | `text` | no | — | | Free-text description of what was acted on (ADMIN-007.3) |
| `created_at` | `timestamptz` | no | `now()` | | |

**Nullable columns** — `actor_id`: kept nullable because `SET NULL` is the
chosen delete behavior (below) and because a theoretical system-originated
row has no human actor; `actor_label` always carries the readable record
either way.

**Foreign keys**

| Column | References | On delete | On update | Why |
|---|---|---|---|---|
| `actor_id` | `users.id` | SET NULL | — | The log must survive even a (currently unused) account removal; `actor_label` keeps the row meaningful either way |

**Constraints** — none beyond not-null.

**Indexes**

| Name | Columns | Type | Query it serves |
|---|---|---|---|
| `idx_audit_created_at` | `created_at` | btree | `/admin/system`'s audit log, newest first |
| `idx_audit_actor_id` | `actor_id` | btree | Filtering the log by one admin |

**Lifecycle** — append-only; no update, no delete, by any requirement
(ADMIN-007.3's own wording: "never a manual admin entry").

---

### 3.18 `notifications`

**Purpose** — one row per channel attempted for a triggering event.
**Traces to** — NOTIF-001.

| Column | Type | Null | Default | Unique | Description |
|---|---|---|---|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` | PK | |
| `event` | `text` | no | — | | e.g. `"booking.confirmed"`, `"product.rejected"` |
| `channel` | `text` | no | — | | `Email` / `Zalo` / `Dashboard` |
| `template` | `text` | no | — | | Template name used |
| `status` | `text` | no | `'pending'` | | `pending` / `sent` / `failed` |
| `created_at` | `timestamptz` | no | `now()` | | |

**Foreign keys** — none (the `event` string names the trigger; the design
does not call for joining back to the specific booking/product row from
this table, matching the existing mock's flat shape).

**Constraints**
- `ck_notifications_channel` — `channel IN ('Email','Zalo','Dashboard')`.
- `ck_notifications_status` — `status IN ('pending','sent','failed')`.
- `uq_notifications_event_channel` — `UNIQUE (event, channel)` where `event`
  is expected to already encode the specific transition instance (e.g. a
  booking id) so this constraint is the de-dup guard for NOTIF-001 AC-3; see
  Open Questions §9 for the one assumption this rests on.

**Indexes**

| Name | Columns | Type | Query it serves |
|---|---|---|---|
| `idx_notifications_created_at` | `created_at` | btree | `/admin/system`'s notifications table, newest first |

**Lifecycle** — hard delete never performed by any requirement; retention
is an operational decision outside this SRS's scope.

---

### 3.19 `settings`

**Purpose** — platform-wide admin-set defaults (cancellation window,
commission rate reference text, policy/T&C/email-template text).
**Traces to** — ADMIN-005.1, ADMIN-007.

| Column | Type | Null | Default | Unique | Description |
|---|---|---|---|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` | PK | |
| `name` | `text` | no | — | UK | e.g. `"Default cancellation window"`, `"Global commission percent"` |
| `value` | `text` | yes | — | | Null = not yet decided by an admin (matches ADMIN-007 AC-1's starting state and `decision.commission_rate`'s "unset = 0%") |
| `note` | `text` | no | `''` | | What the setting decides, for the admin reading the list |
| `created_at` | `timestamptz` | no | `now()` | | |
| `updated_at` | `timestamptz` | no | `now()` | | |

**Nullable columns** — `value`: a setting the admin has not decided yet is
the documented starting state, not an error.

**Foreign keys** — none.

**Constraints** — none beyond uniqueness on `name`.

**Indexes** — none; small table, always read in full on `/admin/system`.

**Lifecycle** — hard delete never performed; rows are seeded once and only
ever updated.

---

### 3.20 `wishlists`

**Purpose** — the per-account saved-products join (ACCOUNT-002).
**Traces to** — ACCOUNT-002.

| Column | Type | Null | Default | Unique | Description |
|---|---|---|---|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` | PK | |
| `user_id` | `uuid` | no | — | | |
| `product_id` | `uuid` | no | — | | |
| `created_at` | `timestamptz` | no | `now()` | | |

**Foreign keys**

| Column | References | On delete | On update | Why |
|---|---|---|---|---|
| `user_id` | `users.id` | CASCADE | — | A wishlist entry has no meaning once the account is gone; accounts are locked not deleted in practice, but the rule is correct either way |
| `product_id` | `products.id` | CASCADE | — | Toggling a product off the catalogue should not leave a dangling saved-item row the UI must then defend against |

**Constraints** — `uq_wishlists_user_product` — `UNIQUE (user_id, product_id)` — toggling twice never creates two rows (ACCOUNT-002.1, idempotent save).

**Indexes**

| Name | Columns | Type | Query it serves |
|---|---|---|---|
| `uq_wishlists_user_product` | `user_id, product_id` | unique btree | Also serves "my wishlist" lookup by `user_id` alone |

**Lifecycle** — hard delete on toggle-off (ACCOUNT-002 AC-2) — this is the
one table in the schema where hard delete is the whole point of the
feature, not a workaround.

## 4. Enumerations

| Name | Values | Mechanism | Why |
|---|---|---|---|
| `users.role` | buyer, supplier, admin | `CHECK` | Fixed by the brief's RBAC model; a deploy, not an admin, adds a new role |
| `users.status` | Active, Locked, Awaiting documents | `CHECK` | Fixed set, deploy-only additions |
| `products.status` | draft, pending, approved, rejected, suspended | `CHECK` | The brief's own state machine, closed set |
| `departures.state` | Open, Blocked | `CHECK` | Closed set |
| `bookings.status` | Awaiting Payment, Paid, Confirmed, Completed, Cancelled, Refunded | `CHECK` | The brief's own state machine, closed set |
| `payments.status` | pending, succeeded, failed | `CHECK` | Closed set |
| `payments.provider` | vnpay, momo, zalopay, bank_transfer | `CHECK` | Closed set of integrations; MoMo/ZaloPay/bank columns reserved ahead of being wired (§7 architecture note) |
| `vouchers.status` | Active, Inactive | `CHECK` | Closed set |
| `payouts.status` | Pending, Paid | `CHECK` | Closed set |
| `complaints.status` | Open, Resolved, Refunded | `CHECK` | Closed set |
| `campaigns.status` | Draft, Active, Ended | `CHECK` | Closed set |
| `reviews.status` | published, hidden, reported | `CHECK` | Closed set |
| `notifications.channel` | Email, Zalo, Dashboard | `CHECK` | Closed set, matches the brief's three channels |
| `notifications.status` | pending, sent, failed | `CHECK` | Closed set |

No `pg enum` is used anywhere: every one of these is a product/business
rule that could plausibly gain a value later (a fourth payment provider, a
new booking state for a future refund flow) without a type rewrite — a
`CHECK` constraint is a one-line migration either way, so the extra
convenience of `pg enum` is not worth its removal cost. `categories.name`
and `products.kind` stay free text (not a lookup table) because
`admin`/`suppliers` already treat them as admin-entered strings with no
closed set implied anywhere in the SRS.

## 5. Access patterns

| # | Pattern | Frequency | Index used |
|---|---|---|---|
| 1 | Resolve a session token on every request | Every authenticated request | `uq_sessions_token_hash` |
| 2 | Look up a user by email / phone at sign-in | High | `uq_users_email` / `uq_users_phone` |
| 3 | List/filter users by role and status (`/admin/users`) | Admin-only, low | `idx_users_role_status` |
| 4 | Pending-verification suppliers queue (`/admin/queue`) | Admin-only, low | `idx_suppliers_verified` |
| 5 | A supplier's own products (`/supplier/products`) | High (every supplier dashboard load) | `idx_products_supplier_id` |
| 6 | Approved products for Home/search (`/`, `/search`) | Very high | `idx_products_status`, `idx_products_destination_kind` |
| 7 | A product's departures calendar (`/tours/:id`) | High | `idx_departures_product_id_date` |
| 8 | Open departures board, next-6 and full (`/`, `/departures`) | High | `idx_departures_date_state` |
| 9 | A buyer's own bookings (`/account`) | High | `idx_bookings_buyer_id` |
| 10 | Booking lookup by code (`/booking/:code`, `/admin/bookings` search) | High | `uq_bookings_code` |
| 11 | Hold-expiry sweep over `Awaiting Payment` bookings | Background, every few seconds or on-read | `idx_bookings_status_held_until` |
| 12 | Passenger list by departure (`/supplier/bookings`) | Medium | `idx_bookings_departure_id` |
| 13 | Payment de-dup on IPN callback | Per callback | `uq_payments_gateway_transaction_id` |
| 14 | Voucher lookup at checkout (case-insensitive) | Medium | `uq_vouchers_code_lower` |
| 15 | A supplier's payout history | Low | `idx_payouts_supplier_id` |
| 16 | Open complaints queue (`/admin/bookings`) | Low | `idx_complaints_status` |
| 17 | Published reviews for a product | High | `idx_reviews_product_id_status` |
| 18 | Reported reviews queue (`/admin/moderation`) | Low | `idx_reviews_status` |
| 19 | Audit log, newest first | Low (admin-only) | `idx_audit_created_at` |
| 20 | Guides by category, published, newest first | Medium | `idx_guides_category_published_on` |

Tables with no dedicated index beyond their PK/UK — `destinations`,
`categories`, `campaigns`, `settings`, `notifications` (beyond
`created_at`) — are all small (tens to low hundreds of rows) and read in
full or near-full by the one screen that uses them; adding an index would
cost write throughput for no measured gain.

## 6. Data volume and growth

| Table | Rows at launch | Growth | Retention |
|---|---|---|---|
| `users` | tens (seed) | Slow — organic sign-ups | Indefinite |
| `sessions` | 0 | One per sign-in, swept on expiry | 30 days past `expires_at` |
| `otp_codes` | 0 | One per OTP request, swept | 24 hours past `expires_at` |
| `suppliers` | single digits | Slow | Indefinite |
| `products` | ~10–20 (seed) | Slow | Indefinite |
| `departures` | ~100s (seed) | Moderate — each product adds dates over time | Indefinite (small per-row footprint) |
| `bookings` | 0 | The platform's main growth table | Indefinite (financial record) |
| `payments` | 0 | Tracks `bookings` 1:1-ish | Indefinite |
| `reviews` | small (seed) | Slow | Indefinite |
| `payouts` | 0 | One row per supplier per period | Indefinite |
| `complaints` | 0 | Low, tied to disputed bookings | Indefinite |
| `audit` | 0 | One row per admin action — the fastest-growing table after `bookings` | Indefinite, but a candidate for partitioning by month past ~5M rows |
| `notifications` | 0 | ~3 rows per booking/approval event | 1 year, then archive (not a dispute-relevant record) |
| the rest | small, seed-sized | Negligible | Indefinite |

Nothing here is expected to exceed ~10M rows within the first year at this
project's scale (a regional tourism platform, not a national one); no
partitioning is implemented now. `audit` is the one table worth revisiting
if admin activity volume is far higher than assumed.

## 7. Integrity, privacy, and security

- **Enforced by the database**: every status/role/provider enumeration
  (§4) via `CHECK`; seat-hold bounds (`departures.seats <= capacity`,
  `>= 0`); one profile per supplier account (`uq_suppliers_user_id`); one
  open dispute per booking (`uq_complaints_booking_open`); exactly one
  discount kind per voucher; uniqueness of email/phone/booking
  code/voucher code/departure-per-date.
- **Enforced by the application**: the atomic seat decrement/release
  itself (BOOKING-001's race-safety, per `docs/architecture/overview.md`
  §7 — a conditional `UPDATE`, not a database constraint, since the
  "available seats" check is a read-then-conditional-write, not a static
  invariant); the re-approval-on-edit rule (SUPPLIERS-002.3); sub-admin
  `permissions` scoping (ADMIN-003.4) — the database has no row-level
  security policy for this; every handler checks the resolved session's
  role/permissions before querying.
- **Personal data**: `users.email`, `users.phone`, `users.name`;
  `bookings.traveller_name/phone/email/note`; `suppliers.bank_*`. No
  separate retention rule beyond the account's own lifecycle is specified
  by any SRS — these are kept indefinitely as booking/financial history,
  matching ADMIN-004's "view all bookings" requirement, which would break
  if traveller data were purged. If the stakeholder later wants a
  deletion-on-request policy (e.g. for GDPR-style compliance), that is a
  product decision outside the brief and not assumed here.
- **Secrets**: `users.password_hash` (bcrypt/argon2, never returned to a
  client); `sessions.token_hash` and `otp_codes.code_hash` (SHA-256 of a
  random token/code, never the raw value, mirroring `password_hash`'s
  rule per AUTH module's non-functional requirement); `VNPAY_HASH_SECRET`
  is an environment variable, not a database column, and is never stored
  in any table.
- **Row-level access**: a Buyer's own session resolves only to `bookings`/
  `wishlists` rows where `buyer_id`/`user_id` matches (ACCOUNT-001,
  ACCOUNT-002); a Supplier's session resolves only to `products`/
  `departures`/`bookings`/`payouts`/`reviews` rows reachable through their
  own `supplier_id` (SUPPLIERS module, throughout). None of this is a
  Postgres `ROW LEVEL SECURITY` policy — every query is application-scoped
  by the resolved session's id, matching the simpler of the two approaches
  the architecture overview already chose (no new security primitive
  introduced here).

## 8. Migrations

| # | Change | Forward | Backward | Safe on non-empty table |
|---|---|---|---|---|
| 1 | `0002_users_auth.up/down.sql` — create `users`, `sessions`, `otp_codes` | Create 3 tables + their indexes/checks | Drop all 3 | n/a (empty database at this point — `0001_init` created nothing but the `pgcrypto` extension) |
| 2 | `0003_suppliers.up/down.sql` — create `suppliers` | Create table + FK to `users` + indexes | Drop table | n/a |
| 3 | `0004_catalogue.up/down.sql` — create `products`, `departures`, `destinations`, `categories`, `guides`, `reviews` | Create 6 tables + FKs + indexes | Drop all 6 (reverse FK order: `reviews`, `departures` before `products`) | n/a |
| 4 | `0005_vouchers.up/down.sql` — create `vouchers` | Create table | Drop table | n/a |
| 5 | `0006_booking_flow.up/down.sql` — create `bookings`, `payments`, `complaints` | Create 3 tables + FKs (including `bookings.voucher_id` to `vouchers`) | Drop in reverse FK order | n/a |
| 6 | `0007_finance_admin.up/down.sql` — create `payouts`, `campaigns`, `audit`, `notifications`, `settings`, `wishlists` | Create 6 tables + FKs + indexes | Drop all 6 | n/a |
| 7 | `0008_seed_settings.up/down.sql` — seed `settings` rows (default cancellation window = unset, global commission = unset, per `decision.commission_rate`/`decision.cancellation_window`) | `INSERT` the named rows with `value = NULL` | `DELETE` those named rows | Safe — the rows do not exist yet |

Each migration group is ordered so every `CREATE TABLE ... REFERENCES`
runs after the table it points to already exists (`users` → `suppliers` →
`products`/catalogue → `vouchers` → `bookings`/`payments`/`complaints` →
everything that references `bookings`/`suppliers`/`users` last). Every
`.down.sql` drops in the reverse order for the same reason. Since the
project has no production data yet (this is the first schema, applied to
an empty database per `0001_init`), none of steps 1–7 needs the
add-nullable → backfill → set-`NOT NULL` dance; that pattern applies to
any *future* migration that adds a `NOT NULL` column to one of these
tables once it holds rows, which is a Dev-time concern at that point, not
here. No step here is irreversible.

## 9. Open questions

| Question | Owner | Blocking |
|---|---|---|
| `notifications.event` is assumed to already encode the specific instance (e.g. a booking id string, not just the type name) so that `uq_notifications_event_channel` can de-duplicate a retried webhook per NOTIF-001 AC-3. If `event` were instead a bare type name shared across many bookings, the unique constraint would incorrectly block a second booking's legitimate notification. Confirm this at `services.md` time when the exact event-string format is decided. | TL (service design phase) | No — the column type (`text`) and the constraint shape do not change either way; only the exact string format decided in `services.md` needs to respect it |
| Does the commission rate vary by supplier type, or is one global rate enough for MVP? (carried from `admin`/`booking` SRS) | Stakeholder | No — `suppliers.commission` (nullable override) plus a single `settings` row already supports either answer without a schema change |
| Which cancellation/refund window applies by default? (carried from `booking` SRS) | Stakeholder | No — stored as a `settings` row's `value`; no schema impact either answer |
| Does the platform cover departures only from Nghệ An, or also inbound tours from Hà Nội/HCM? (carried from `booking` SRS) | Stakeholder | No — `products`/`departures` carry no origin-city column either way; adding one later is a single nullable-column migration, not a redesign |
