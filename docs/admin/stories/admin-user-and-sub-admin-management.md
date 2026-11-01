# Story — Admin user and sub-admin management

Module: `admin`
Requirement: ADMIN-003 (`docs/admin/SRS.md` §4.3)

## User story

As an Admin, I want to search Buyers and Suppliers, lock/unlock their
accounts, and create a sub-admin scoped to a restricted permission set, so
that I can manage access and delegate without giving away full control.

## Scope

### In scope

- `/admin/users` screen (`AdminUsers.tsx`): lists `users` rows, filterable
  by role and status, searchable by name/email/role.
- Lock / unlock action per row, backed by `users.status` (`Active` ↔
  `Locked`).
- A locked account's sign-in is rejected (reads the existing `auth` module
  status check — this story does not touch `auth`'s sign-in endpoint, only
  guarantees `users.status` is the field it reads).
- Create sub-admin: a form that writes a `users` row with `role = 'admin'`
  and a `permissions` value naming a restricted set (`moderation-only`,
  `finance-only`, or any other named set the admin types/picks — MVP ships
  at least these two as the selectable options).
- Section-level gating: a sub-admin's nav (`DashboardLayout`) and each
  `/admin/*` route show/allow only the sections their `permissions` value
  grants; any other `/admin/*` route visited directly is refused the same
  way `RequireRole` refuses a non-admin role.
- Self-lock guard: an admin cannot lock their own account.

### Out of scope

- The sign-in endpoint itself and its status check (`auth` module,
  AUTH-002/003/004) — this story only guarantees `users.status` is
  accurate for that check to read.
- Buyer/Supplier's own registration (`auth` module) — this story only
  lists and acts on rows that already exist.
- Every other `/admin/*` screen's own permission check for
  moderation/finance/content/system sections — each of those screens
  (queue, moderation, bookings, finance, content, system) is responsible
  for refusing a sub-admin whose `permissions` does not grant it; this
  story defines the `permissions` value and its enum, and implements the
  check in the shared `RequireRole`/nav-gating layer so every other screen
  gets it for free, but does not re-review those other screens' own
  acceptance criteria.
- Granular per-action permission (e.g. "can approve products but not
  reject them") — `permissions` grants whole sections, not actions within
  one.
- Audit logging of lock/unlock/sub-admin-creation actions — covered by
  ADMIN-007 (`docs/admin/stories/admin-platform-settings-and-audit-log.md`),
  not re-specified here.

### UI scope

- `/admin/users`: a `DataTable` of users with `TableFilters` (role select,
  status select, `SearchBox` over name/email/role), a Lock/Unlock action
  per row, and a "Create sub-admin" action opening a form (name, email,
  `permissions` select from the enum).
- States: default (rows present), empty (no match for current
  filters/search) — per the SRS's screen table.
- Reuses `DataTable`, `TableFilters`, `SearchBox`, `FilterSelect`, `Select`,
  `Badge` (for status) from the design system — no new components.

## Acceptance criteria

- SC-1 [ADMIN-003 AC-1]: Given a `users` row with `status = 'Active'`, when the admin clicks Lock, `status` becomes `Locked`.
- SC-2 [ADMIN-003 AC-2]: Given a locked account, when the admin clicks Unlock, `status` becomes `Active`.
- SC-3 [ADMIN-003 AC-3]: Given the admin creates a sub-admin with `permissions = 'moderation-only'`, when that sub-admin signs in, they reach `/admin/moderation` and `/admin/queue`, and a direct visit to `/admin/finance` is refused.
- SC-4 [ADMIN-003 AC-4]: Given a search for "cualohomestay", the result list returns only `users` rows matching that text in name/email/role.
- SC-5 [ADMIN-003, boundary]: Given an admin viewing their own row, the Lock action on that row is disabled or rejected — an admin can never lock their own account via this screen.
- SC-6 [ADMIN-003, not permitted]: Given a sub-admin without a `permissions` value granting user management, an attempt to lock/unlock a user or create a sub-admin is rejected.
- SC-7 [ADMIN-003, empty state]: Given filters/search match no `users` row, `/admin/users` shows the table's empty state, not an error.
- SC-8 [ADMIN-003, privacy]: Given a sub-admin signed in with `permissions = 'finance-only'`, a direct API call for a section their `permissions` does not grant (e.g. the moderation queue data) returns no data — the restriction is enforced server-side, not only hidden in the nav.

## Dependencies

- `auth` module: session and `permissions` value on sign-in; this story
  does not modify the sign-in endpoint, only relies on it reading
  `users.status` and exposing `permissions` in the session.
- `data` module: the `users` table and its `status`, `role`, `permissions`
  columns.
- Shared `RequireRole`/nav-gating component: this story adds the
  `permissions`-aware branch used by every other `/admin/*` screen; those
  screens are expected (by their own stories) to declare which
  `permissions` value they require.
