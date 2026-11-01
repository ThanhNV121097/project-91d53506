# Story — Admin review moderation

Module: `admin`
Requirement: ADMIN-002 (`docs/admin/SRS.md` §4.2)
Screen: `/admin/moderation` (`AdminModeration.tsx`)

## User story

As an Admin, I want to hide a review that violates policy and publish it
again if needed, so that `/tours/:id` never shows content that should not
be public.

## Scope

**In scope**

- `/admin/moderation` lists reviews (at minimum those `reported` or
  `published`) with their current `status`.
- A "Hide" action on a visible review sets `reviews.status = 'hidden'`.
- An "Unhide" / "Publish" action on a hidden review sets
  `reviews.status = 'published'`.
- A `reported` review can be hidden or restored to `published` by the
  same two actions — there is no separate third action for it.
- The change takes effect immediately: `/tours/:id`'s review list
  (`TripReviews.tsx`, filtered to `status = 'published'`) reflects it on
  next load, with no separate publish step.
- Permission scoping: a sub-admin without moderation permission
  (`users.permissions`) cannot hide/unhide (per ADMIN-003's scoping,
  enforced server-side and in `DashboardLayout`'s nav/route guard).

**Out of scope**

- Supplier replies to a review — separate plan item ("Supplier review
  replies").
- The buyer-facing review *submission* flow — `booking`/storefront
  module, not this one.
- Deciding *why* a review was flagged `reported` in the first place (who
  reports it, from where) — not part of this story; this story only acts
  on `reviews.status` once a row exists in `reported` or `published`.
- The `AdminQueue` (supplier/product approval) screen and its actions —
  separate plan item ("Admin supplier and product approval queue").
- Notifying the review's author that their review was hidden —
  `notifications` module, out of scope per the SRS §3.
- Any UI for an admin to edit the review's text — this story only
  changes `status`, never the review's content.

## UI scope

Screen: `/admin/moderation` (`AdminModeration.tsx`), per the SRS §5 table
— states `default` and `empty`. Uses `DataTable` (§2.10 of the design
system) for the list, with a `Badge` (§2.9) for each row's status
(`good` = published, `bad` = hidden, `neutral`/`warn` for `reported` —
exact tone mapping is Dev's call within the existing Badge tones, none of
which is colour-coded per §4's documented deviation). Hide/Publish are
row actions using the `Ghost`/`Primary` button styles already defined
(§2.1) — no new component.

No separate detail page: acting on a review is a row-level action within
the table, consistent with `AdminQueue`'s pattern for the same kind of
decision.

## Acceptance criteria

- SC-1 [ADMIN-002 AC-1]: Given a review with `status = 'published'`, when
  the admin clicks Hide, then `reviews.status` becomes `hidden` and that
  review no longer appears in `/tours/:id`'s review list.
- SC-2 [ADMIN-002 AC-2]: Given a review with `status = 'hidden'`, when the
  admin clicks Publish, then `reviews.status` becomes `published` and the
  review reappears in `/tours/:id`'s review list.
- SC-3 [ADMIN-002 (behaviour 1)]: Given a review with `status =
  'reported'`, when the admin clicks Hide or Publish, then `status`
  becomes `hidden` or `published` respectively — the same two actions
  apply to a `reported` review as to a `published`/`hidden` one, with no
  third action.
- SC-4 [ADMIN-002 (failure table — not permitted)]: Given a sub-admin
  signed in with a `permissions` value that does not grant moderation,
  when they call the hide/publish action (including directly, bypassing
  the UI), then the action is rejected and `reviews.status` is unchanged.
- SC-5 [SRS §5 — empty state]: Given no reviews exist in
  `published`/`hidden`/`reported`, when the admin opens
  `/admin/moderation`, then the table shows its empty-state message
  rather than an error or an infinite loading state.

## Dependencies

- `auth` module: signed-in admin/sub-admin session and its `permissions`
  value (ADMIN-003's scoping, applied here).
- `data` module: the `reviews` table and its `status` column.
- Storefront's `TripReviews.tsx` (already built per SITE-002) already
  filters to `status = 'published'` — this story's backend write is what
  that filter now reacts to; no frontend change needed on the storefront
  side.
- No dependency on `AdminQueue` (ADMIN-001) — different requirement, same
  module, built independently.
