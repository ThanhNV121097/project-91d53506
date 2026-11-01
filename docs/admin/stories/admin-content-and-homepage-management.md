# Story: Admin content and homepage management

## User story

As an Admin, I want to add, edit and remove categories, destinations, and
homepage content on `/admin/content`, so that the storefront's Home page
reflects current offerings without a separate publish step.

## Scope

**In scope**

- `/admin/content` screen (`AdminContent.tsx`) listing and editing
  `categories` rows (`name`, `icon`) and `destinations` rows (`name`,
  `line`, `image`, `from_price`).
- Create, edit and delete for both `categories` and `destinations`.
- Inline validation: a destination name left empty on save is rejected.
- The change is visible on the storefront `/` through the existing data
  API — no separate publish/approval step for this content type.
- Permission scoping: a sub-admin without content permission is refused
  this screen and its write actions (ADMIN-003 permission model).
- One `audit` row per create/edit/delete this screen performs
  (ADMIN-007 behaviour 3 — the audit write is this story's side effect,
  not a redesign of the audit mechanism itself).

**Out of scope**

- Homepage "banners" as a distinct content type: `schema.json` and the
  approved design carry no separate banner table or screen — the
  Home page's banner-like content is the destinations grid and category
  chips themselves (HOME-001 reads `destinations`/`categories` directly).
  If the stakeholder wants a banner distinct from a destination tile,
  that is new scope, raised via `add_item`, not built silently here.
- Featured products, discount codes, marketing campaigns, blog
  posts/guides — plan items of their own, not this module's SRS.
- The approval queue that decides which *products* get published
  (ADMIN-001) — this story only edits catalogue content (categories,
  destinations), never `products.status`.
- The `audit` log *screen* itself (viewing/searching audit rows) —
  ADMIN-007, a separate plan item (`Admin platform settings and audit
  log`). This story only writes the rows.
- Sub-admin creation and permission assignment — ADMIN-003, a separate
  plan item (`Admin user and sub-admin management`). This story only
  reads/respects an existing `permissions` value to gate its own screen.
- The storefront Home page's own rendering of destinations/categories —
  already built (`HOME-001`); this story changes the data it reads, not
  the component that reads it.

## UI scope

Screen: `/admin/content` (`AdminContent.tsx`), inside `DashboardLayout`.

States:
- **Default** — two sections (Categories, Destinations), each a
  `DataTable` (§2.10) with inline add/edit, using `Input`/`TextArea`
  (§2.3) and `TableFilters`/`SearchBox` (§2.11) conventions already
  established by other CMS screens.
- **Empty** — no categories or no destinations yet: `DataTable`'s
  caller-supplied empty message.
- **Validation error** — empty destination name on save: inline error
  per §2.3, not a toast (none exists in this design system).
- **Denied** — a sub-admin without content permission hitting this
  route: `RequireRole`'s "no access" page (§2.18), consistent with every
  other `/admin/*` route's permission gate.

No new component is introduced; this screen reuses `DataTable`,
`Input`, `TextArea`, `DashboardLayout`, `RequireRole` already documented
in `design/design-system.md`.

## Acceptance criteria

- SC-1 [ADMIN-006 AC-1]: Given a destination exists, when the admin edits
  its name and from-price and saves, then `/` shows the updated name and
  price for that destination.
- SC-2 [ADMIN-006 AC-2]: Given the admin adds a new category and saves,
  then `/`'s category chip row includes the new category, linking to
  `/search?kind=<id>`.
- SC-3 [ADMIN-006 AC-3]: Given the admin removes a destination and saves,
  then it no longer appears on `/`'s destinations grid.
- SC-4 [ADMIN-006, failure row "Not permitted"]: Given a sub-admin without
  content permission, when they visit `/admin/content` or call its write
  action directly, then the action is rejected and the UI shows
  `RequireRole`'s denied state.
- SC-5 [ADMIN-006, failure row "Invalid input"]: Given a destination name
  field left empty, when the admin attempts to save, then an inline error
  is shown and no write occurs.
- SC-6 [ADMIN-007 behaviour 3]: Given any create, edit or delete this
  screen performs on a category or destination, then exactly one `audit`
  row is created recording when, who, the action, and the target.

## Dependencies

- `auth` module: signed-in admin/sub-admin session and `permissions`
  value (ADMIN-003's permission model, reused here, not redefined).
- `data` module: the storefront `/` Home page's existing read of
  `categories`/`destinations` — this story writes through the same API
  the Home page already reads, per the architecture's single data
  layer; no new read endpoint for the storefront side.
- Backend story stage (step 6/7) extends `erd.md`/`services.md` with
  `POST/PATCH/DELETE` endpoints for `categories` and `destinations`,
  plus the `audit` insert — it does not redesign either table.
