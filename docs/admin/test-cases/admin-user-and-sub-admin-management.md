# Test Cases — Admin user and sub-admin management

Module: `admin` · Requirement: `ADMIN-003` (`docs/admin/SRS.md` §4.3) ·
Contract: `GET /v1/admin/users`, `POST /v1/admin/users/{id}/lock`,
`POST /v1/admin/users/{id}/unlock`, `POST /v1/admin/users/sub-admins`
(`docs/architecture/services.md` §3.9.7–§3.9.9); sign-in rejection for a
locked account per `POST /v1/auth/login` (§3.2.2) and §2.3's error
catalog.

No story plan file exists for this item (`docs/admin/stories/` is
absent); per the test-writing rule, ADMIN-003's own acceptance criteria
(AC-1–AC-4) plus its failure/boundary/permission table are the list this
file covers, together with the contract rules the four endpoints above
are held to.

Risk level: **High**. This function gates account access (locking shuts
a person out of the whole platform) and gates delegated admin power
(creating a sub-admin hands out real authority). A bug here either locks
out the wrong account, leaves a locked account able to sign in, lets a
sub-admin reach a section their `permissions` value should hide, or lets
one click strip the platform of every unlocked admin. Coverage below is
deep on the lock/unlock state change and its effect on sign-in, on the
sub-admin `permissions` scoping (both the allowed sections and the
refused ones), on the self-lock boundary, and on permission denial for a
scoped sub-admin acting outside user management; shallower on cosmetic
table styling.

---

## AC-1 — Locking an active account

**Scenario**: Admin locks an active account from the Users & roles UI
**Given**: Signed in as an Admin; a `users` row (`u-01`, Buyer) with `status: "Active"` is listed on `/admin/users`
**When**: The Admin clicks that row's "Lock" action
**Then**: The row's status badge updates to "Locked" on screen without a page reload; a subsequent read of that user shows `status: "Locked"`
**Traces**: AC-1 (ADMIN-003 AC-1)
**Check**: interact_page

---

**Scenario**: Locking a user at the API sets status Locked
**Given**: A `users` row with `status: "Active"`
**When**: `POST /v1/admin/users/{id}/lock` is called by an Admin
**Then**: Response is `200`; the body shows `status: "Locked"`
**Traces**: AC-1 (ADMIN-003 AC-1), contract (POST /v1/admin/users/{id}/lock)
**Check**: fetch_url

---

**Scenario**: A locked account's next sign-in attempt is rejected
**Given**: A `users` row just locked (`status: "Locked"`), with known email/password
**When**: `POST /v1/auth/login` is called with that account's correct email and password
**Then**: Response is `403 PERMISSION_DENIED`; no session token is returned; the account's `status` is still `"Locked"`
**Traces**: AC-1 (ADMIN-003 AC-1 — "that account's next sign-in attempt is rejected"), contract (POST /v1/auth/login §3.2.2)
**Check**: fetch_url

---

## AC-2 — Unlocking a locked account

**Scenario**: Admin unlocks a locked account from the Users & roles UI
**Given**: Signed in as an Admin; a `users` row with `status: "Locked"` is listed on `/admin/users`
**When**: The Admin clicks that row's "Unlock" action
**Then**: The row's status badge updates to "Active" on screen without a page reload; a subsequent read of that user shows `status: "Active"`
**Traces**: AC-2 (ADMIN-003 AC-2)
**Check**: interact_page

---

**Scenario**: Unlocking a user at the API sets status Active
**Given**: A `users` row with `status: "Locked"`
**When**: `POST /v1/admin/users/{id}/unlock` is called by an Admin
**Then**: Response is `200`; the body shows `status: "Active"`
**Traces**: AC-2 (ADMIN-003 AC-2), contract (POST /v1/admin/users/{id}/unlock)
**Check**: fetch_url

---

**Scenario**: Sign-in succeeds again after unlocking
**Given**: A `users` row just unlocked (`status: "Active"`), with known email/password
**When**: `POST /v1/auth/login` is called with that account's correct email and password
**Then**: Response is `200`; the body contains a session token and `user.status: "Active"`
**Traces**: AC-2 (ADMIN-003 AC-2 — "sign-in succeeds again"), contract (POST /v1/auth/login §3.2.2)
**Check**: fetch_url

---

## AC-3 — Sub-admin scoped by permissions

**Scenario**: Admin creates a sub-admin scoped to moderation-only
**Given**: Signed in as an Admin on `/admin/users`
**When**: The Admin clicks "Add a sub-admin" and submits the form with email, password, name, and permissions set to "moderation-only"
**Then**: The new row appears in the users table with `role: "Admin"` and `permissions: "moderation-only"` visible; a subsequent read of that user confirms the same values
**Traces**: AC-3 (ADMIN-003 AC-3 — setup)
**Check**: interact_page

---

**Scenario**: Creating a sub-admin at the API stores the scoped permissions value
**Given**: Signed in as an Admin (`full` permissions)
**When**: `POST /v1/admin/users/sub-admins` is called with `{ "email": "modsub@example.com", "password": "Str0ngP@ss!", "name": "Mod Sub", "permissions": "moderation-only" }`
**Then**: Response is `201`, `role: "admin"`, `permissions: "moderation-only"` in the created row
**Traces**: AC-3 (ADMIN-003 AC-3 — setup), contract (POST /v1/admin/users/sub-admins)
**Check**: fetch_url

---

**Scenario**: A moderation-only sub-admin reaches the sections their permissions grant
**Given**: A sub-admin account with `permissions: "moderation-only"`, signed in
**When**: That sub-admin opens `/admin/moderation` and `/admin/queue`
**Then**: Both pages render their content (not the "You do not have access to this area" fallback); the moderation and queue sections appear in the dashboard nav
**Traces**: AC-3 (ADMIN-003 AC-3 — "they reach /admin/moderation and /admin/queue")
**Check**: render_url

---

**Scenario**: A moderation-only sub-admin typing /admin/finance directly is refused
**Given**: A sub-admin account with `permissions: "moderation-only"`, signed in
**When**: That sub-admin navigates directly to `/admin/finance`
**Then**: The page renders the "You do not have access to this area" fallback naming the admin role, not the finance dashboard content
**Traces**: AC-3 (ADMIN-003 AC-3 — "a direct visit to /admin/finance is refused")
**Check**: render_url

---

**Scenario**: A moderation-only sub-admin's session is denied the finance API, not just hidden in the UI
**Given**: A session token resolving to a sub-admin with `permissions: "moderation-only"`
**When**: `PATCH /v1/admin/commission` is called with that token and a valid body
**Then**: Response is `403 PERMISSION_DENIED`; the global commission rate is unchanged
**Traces**: AC-3 (ADMIN-003 AC-3), NFR (admin/SRS.md §6 — "never returns data for a section their permissions value does not grant, even via a direct API call")
**Check**: fetch_url

---

## AC-4 — Search by name/email/role

**Scenario**: Admin searches the users table from the UI
**Given**: Signed in as an Admin; `/admin/users` lists multiple users including one named "Cửa Lò Beach Stays" among others
**When**: The Admin types "cualohomestay" into the search box
**Then**: Only rows matching that text in name/email/role remain in the table on screen; unrelated rows are no longer shown
**Traces**: AC-4 (ADMIN-003 AC-4)
**Check**: interact_page

---

**Scenario**: Searching users at the API returns only matching rows
**Given**: `users` rows exist, one of which has "cualohomestay" in its email
**When**: `GET /v1/admin/users?q=cualohomestay` is called by a signed-in Admin
**Then**: Response is `200`; every returned row matches "cualohomestay" in name/email/role; no non-matching row is present
**Traces**: AC-4 (ADMIN-003 AC-4), contract (GET /v1/admin/users)
**Check**: fetch_url

---

**Scenario**: Filtering users by role and status at the API
**Given**: `users` rows exist across roles (`buyer`, `supplier`, `admin`) and statuses (`Active`, `Locked`, `Awaiting documents`)
**When**: `GET /v1/admin/users?role=supplier&status=Active` is called
**Then**: Response is `200`; every row in the body has `role: "supplier"` and `status: "Active"`
**Traces**: ADMIN-003 behaviour 1 ("filterable by role and status"), contract (GET /v1/admin/users)
**Check**: fetch_url

---

## Failure, boundary and permission behaviour

**Scenario**: A sub-admin without user-management permission is denied locking an account
**Given**: A signed-in sub-admin with `permissions: "finance-only"`; a `users` row with `status: "Active"`
**When**: `POST /v1/admin/users/{id}/lock` is called with that sub-admin's session
**Then**: Response is `403 PERMISSION_DENIED`; the target user's `status` is unchanged (`"Active"`)
**Traces**: Not permitted (ADMIN-003), contract (POST /v1/admin/users/{id}/lock — Permissions: full, users-only)
**Check**: fetch_url

---

**Scenario**: A users-only sub-admin can lock an account
**Given**: A signed-in sub-admin with `permissions: "users-only"`; a `users` row with `status: "Active"`
**When**: `POST /v1/admin/users/{id}/lock` is called with that sub-admin's session
**Then**: Response is `200`; the body shows `status: "Locked"`
**Traces**: Contract (POST /v1/admin/users/{id}/lock — Permissions: full, users-only)
**Check**: fetch_url

---

**Scenario**: A sub-admin — even users-only — cannot create another sub-admin
**Given**: A signed-in sub-admin with `permissions: "users-only"`
**When**: `POST /v1/admin/users/sub-admins` is called with that sub-admin's session and a valid body
**Then**: Response is `403 PERMISSION_DENIED`; no new `users` row is created
**Traces**: Not permitted (ADMIN-003), contract (POST /v1/admin/users/sub-admins — "full only (never delegable)")
**Check**: fetch_url

---

**Scenario**: An admin attempts to lock their own account and is refused
**Given**: Signed in as an Admin whose own `users` row has `status: "Active"`
**When**: `POST /v1/admin/users/{id}/lock` is called with that admin's own id, using that same admin's session
**Then**: Response is `409 CONFLICT`; that admin's own `status` remains `"Active"`; the platform is never left with zero unlocked admins as a direct result of this one call
**Traces**: Boundary (ADMIN-003 — "an admin attempts to lock their own account"), contract (POST /v1/admin/users/{id}/lock errors — self-lock)
**Check**: fetch_url

---

**Scenario**: Locking an already-locked account is an idempotent no-op, not an error
**Given**: A `users` row already `status: "Locked"`
**When**: `POST /v1/admin/users/{id}/lock` is called again against that same id
**Then**: Response is `200`; the body still shows `status: "Locked"`, not an error
**Traces**: Contract (POST /v1/admin/users/{id}/lock errors — "already locked is a no-op 200, not an error")
**Check**: fetch_url

---

**Scenario**: Creating a sub-admin with a permissions value outside the closed set is a validation failure
**Given**: Signed in as an Admin (`full` permissions)
**When**: `POST /v1/admin/users/sub-admins` is called with `{ "email": "x@example.com", "password": "Str0ngP@ss!", "name": "X", "permissions": "superuser" }`
**Then**: Response is `422 VALIDATION_FAILED`; no new `users` row is created
**Traces**: Contract (POST /v1/admin/users/sub-admins — "permissions not one of the four values")
**Check**: fetch_url

---

**Scenario**: Creating a sub-admin with an email that already exists is a conflict
**Given**: A `users` row already exists with email `exists@example.com`
**When**: `POST /v1/admin/users/sub-admins` is called with `{ "email": "exists@example.com", "password": "Str0ngP@ss!", "name": "Dup", "permissions": "finance-only" }`
**Then**: Response is `409 CONFLICT`; no second `users` row with that email is created
**Traces**: Contract (POST /v1/admin/users/sub-admins — "email already exists")
**Check**: fetch_url

---

**Scenario**: Locking a nonexistent user id is rejected as not found
**Given**: A user id that matches no row in `users`
**When**: `POST /v1/admin/users/{id}/lock` is called against that id
**Then**: Response is `404 NOT_FOUND`
**Traces**: Contract (POST /v1/admin/users/{id}/lock errors — "no such user")
**Check**: fetch_url

---

**Scenario**: A request body field the contract does not define is rejected on sub-admin creation
**Given**: Signed in as an Admin (`full` permissions)
**When**: `POST /v1/admin/users/sub-admins` is called with `{ "email": "y@example.com", "password": "Str0ngP@ss!", "name": "Y", "permissions": "content-only", "superAdmin": true }`
**Then**: Response is `400 MALFORMED_REQUEST`; no new `users` row is created
**Traces**: Contract (§2.3 — "the body carries a field this contract does not define")
**Check**: fetch_url

---

**Scenario**: An unauthenticated request to lock a user is rejected
**Given**: No session token (or an invalid/expired one) presented
**When**: `POST /v1/admin/users/{id}/lock` is called against an active user
**Then**: Response is `401 UNAUTHENTICATED`; the target user's `status` is unchanged
**Traces**: Contract (POST /v1/admin/users/{id}/lock — Auth: admin)
**Check**: fetch_url

---

**Scenario**: A buyer or supplier token is denied listing users, never processed
**Given**: A session token resolving to a `buyer` row (or a `supplier` row)
**When**: `GET /v1/admin/users` is called with that token
**Then**: Response is `403 PERMISSION_DENIED`; no user data is returned in the body
**Traces**: Contract (GET /v1/admin/users — Auth: admin), RBAC (admin/SRS.md §2), NFR (admin/SRS.md §6)
**Check**: fetch_url

---

**Scenario**: The password hash is never serialized in the users list
**Given**: `users` rows exist with stored password hashes
**When**: `GET /v1/admin/users` is called by a signed-in Admin
**Then**: Response is `200`; no row in the body contains a `password_hash` field or any password value
**Traces**: Contract (GET /v1/admin/users — "no password_hash, ever, in any response")
**Check**: fetch_url

---

**Scenario**: The users list shows its empty state when no user matches the filters
**Given**: Signed in as an Admin on `/admin/users`; filters set to a role/status combination matching no row
**When**: Those filters are applied
**Then**: The page renders "No user matches these filters." with no row in the table
**Traces**: Screen state "empty" (`docs/admin/SRS.md` §5)
**Check**: render_url

---

**Scenario**: Locking a user fails closed when the database is unreachable
**Given**: A `users` row with `status: "Active"`; the backend is running but the database is made unavailable
**When**: `POST /v1/admin/users/{id}/lock` is called
**Then**: Response is `503 UNAVAILABLE`; after the database is restored, a read of that user still shows `status: "Active"` (no partial write occurred)
**Traces**: Contract (dependency unavailable, §2.3 error catalog)
**Check**: fetch_url

---

## Coverage check

| ADMIN-003 criterion | Covered by |
|---|---|
| AC-1 (lock sets status, sign-in rejected) | UI lock; API lock; locked-account login rejection |
| AC-2 (unlock sets status, sign-in succeeds) | UI unlock; API unlock; unlocked-account login success |
| AC-3 (sub-admin scoped by permissions) | UI creation; API creation; allowed-section render; refused-section render; refused-section API denial |
| AC-4 (search by name/email/role) | UI search; API search; role/status filter |
| Failure table: Not permitted | Finance-only sub-admin denied lock; users-only sub-admin denied sub-admin creation |
| Failure table: Boundary (self-lock) | Admin locking own account refused |
| Contract: idempotent re-lock | Already-locked lock call returns 200 no-op |
| Contract: permissions validation | Sub-admin creation with invalid permissions value |
| Contract: duplicate email | Sub-admin creation with existing email |
| Contract: not found | Lock nonexistent user id |
| Contract: undefined field rejected | Extra field on sub-admin creation |
| Contract: unauthenticated | No/invalid token on lock |
| Contract: wrong role | Buyer/supplier token denied users list |
| Contract: password hash never serialized | Users list response body |
| Screen state: empty | Empty-filter render |
| Contract: dependency unavailable | Database unreachable on lock |

Every acceptance criterion (AC-1–AC-4) and every row of the
failure/boundary/permission table has at least one case above. A
positive control (users-only sub-admin allowed to lock) is included
alongside each negative permission case so a passing suite cannot be the
result of every permission check being wired to deny everything.
