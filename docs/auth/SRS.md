# SRS — Auth

Module: `auth`
Design: [View the approved design](http://localhost:9400)
Design system: `design/design-system.md`

## 1. Purpose

The `auth` module replaces the design's mock session (`lib/session.ts`) with
real sign-up and sign-in for Buyer, Supplier and Admin (including sub-admin)
on the existing `/signin` and `/register` screens, and issues the session
every role-gated route reads. Without it, anybody can type any email into
the mock sign-in form and act as any role — the whole RBAC model the brief
marks MVP does not exist.

## 2. Actors

| Actor | Who they are | What they may do in this module |
|---|---|---|
| Visitor | Not signed in | Reach `/signin` and `/register`; is redirected away from any gated route |
| Buyer | Registered traveller | Sign in by email+password, phone+OTP, or Google; reach `/account`, `/wishlist`, `/book/:id`, `/checkout/:id` |
| Supplier | Registered operator | Sign in the same three ways; reach `/supplier/*` |
| Admin | Platform operator (including sub-admin) | Sign in the same three ways; reach `/admin/*`; a sub-admin's permitted sections are scoped by the `admin` module's user management (ADMIN-003) |

## 3. Scope

**In scope** — the one function specified below:

- Buyer & role sign-up and sign-in

**Out of scope**:

- Sub-admin permission scoping (which sections a sub-admin may open) —
  `admin` module (Admin user and sub-admin management). This module issues
  the session carrying the role and permission set; `admin` decides what each
  permission set unlocks.
- Supplier's business/licence document upload — `suppliers` module (Supplier
  registration and verification), which happens after a Supplier registers
  here.
- Locking/unlocking an account — `admin` module; this module's sign-in must
  honour a locked account's status (see AUTH-001 AC-5) but the lock control
  itself lives in `admin`.

## 4. Functional requirements

### 4.1 Buyer & role sign-up and sign-in

**Requirement AUTH-001 — Email and password sign-up and sign-in**

*As a* Buyer, Supplier or Admin, *I want to* register and sign in with my
email and password, *so that* I reach the pages my role allows and my account
exists independently of this one browser.

Behaviour:

1. `/register` creates a row in `users` with a hashed password, the chosen
   role, and status `Active` (or `Awaiting documents` for a new Supplier, per
   `suppliers` module). Submitting with an email already present in `users`
   is rejected — no second row is created.
2. `/signin`'s email and password fields are checked against that stored
   row: the server computes the password hash of what was typed and compares
   it to `users.password_hash` for that email. A match issues a session
   token the server can later look up to a specific `users.id`; no match
   issues nothing.
3. A wrong password or an unknown email is rejected with a message that does
   not reveal which of the two was wrong, and no session token is issued
   either way.
4. A row whose `status` is `Locked` is rejected even when the password hash
   matches — the check reads `users.status`, not just the password.
5. On success the visitor is routed by `users.role`: Supplier → `/supplier`,
   Admin/sub-admin → `/admin`, Buyer → `/account`.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | No `users` row for `a@x.com` | Registers with that email and a password | A `users` row exists afterward with that email, a `password_hash` that is not the plaintext password, and `role` matching what was submitted |
| AC-2 | A `users` row for `a@x.com` already exists | Registers again with that email | No second row is created; the registration is rejected |
| AC-3 | A `users` row with a known password | Submits that email+password on `/signin` | The server issues a session token resolvable to that row's `id`; the visitor is routed by its `role` |
| AC-4 | The same row, wrong password | Submits on `/signin` | No session token is issued; rejected with a generic "incorrect email or password" message |
| AC-5 | No `users` row for the email submitted | Submits on `/signin` | Rejected with the same generic message as AC-4; no row is created as a side effect |
| AC-6 | A `users` row with `status = 'Locked'` and the correct password | Submits on `/signin` | No session token is issued; rejected with a message naming the account as locked |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Invalid input | Email field is empty or not a valid email shape | Inline validation error; no request sent, no row written |
| Not permitted | `users.status = 'Locked'` | Rejected (AC-6) |
| Boundary | Password at the field's minimum/maximum accepted length | Accepted at the limits; one character over the maximum is rejected with a message naming the limit, and no row is written for that attempt |
| Conflict | Two registrations for the same email race each other | A unique constraint on `users.email` lets exactly one succeed; the other is rejected as AC-2, never two rows for one email |

**Data touched**

| Field | Type | Required | Rule |
|---|---|---|---|
| email | text | yes | Unique per account (DB constraint), used for lookup |
| password_hash | text | yes | Never returned to the client; stored hashed, never the plaintext password |
| role | text | yes | One of buyer, supplier, admin, sub-admin |
| status | text | yes | Active, Locked, or Awaiting documents |

---

**Requirement AUTH-002 — Phone number sign-in with OTP**

*As a* Buyer, Supplier or Admin, *I want to* sign in with my phone number and
a one-time code, *so that* I can use the account without a password.

Behaviour:

1. Requesting a code writes a server-side OTP record (phone, code, expiry,
   used flag) and sends the code to that phone; it is never returned in the
   request's own response body.
2. Submitting a code looks it up against that stored record: it must match
   the phone, be unexpired, and not already be marked used. A match marks
   the record used and issues a session token resolvable to the matching
   `users` row (by phone); any other outcome issues nothing.
3. Success routes the same way as AUTH-001 AC-3.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | A phone with an account requests a code | The visitor submits the code actually stored for that phone | A session token is issued resolvable to that account; the OTP record is marked used |
| AC-2 | A code is requested and stored | The visitor submits a code that does not match the stored one | No session token is issued; rejected with a message; the stored record stays unused |
| AC-3 | A stored code's expiry has passed | The visitor submits that exact code | Rejected with a message naming that it expired, distinct from "wrong code"; no session token is issued |
| AC-4 | A code was already used once (AC-1) | The visitor submits that same code again | Rejected — a used record is never accepted twice |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Boundary | Code requested repeatedly in a short window | Rate-limited with a message, not silently resent without limit |
| Invalid input | Phone number is not a valid shape | Inline validation error; no request sent, no OTP record written |

**Data touched**

| Field | Type | Required | Rule |
|---|---|---|---|
| phone | text | yes (for this method) | Unique per account |
| otp_code | text | yes | Stored server-side only, single use (a `used` flag), short-lived (an `expires_at`) |

---

**Requirement AUTH-003 — Google sign-in**

*As a* Buyer, *I want to* sign in with my Google account, *so that* I do not
need a separate password.

Behaviour:

1. The OAuth flow returns a Google-verified email. The server looks it up in
   `users`: a match issues a session token for that row; no match inserts a
   new `users` row (role `buyer`, no `password_hash`) and then issues a
   session token for it.
2. Success routes to `/account`.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | A `users` row already exists for the Google-verified email | Completes the Google flow | No new row is created; a session token is issued for the existing row; routed to `/account` |
| AC-2 | No `users` row exists for that email | Completes the Google flow | Exactly one new `users` row is created with that email and role `buyer`, and a session token is issued for it |
| AC-3 | The visitor cancels the Google flow | — | No `users` row is created; no session token is issued; returned to `/signin` |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Upstream failure | Google's OAuth endpoint is unreachable or returns an error | `/signin` shows an error message; no row is created, no session token is issued |

**Data touched** — `users.email`, matched or created as in AC-1/AC-2.

---

**Requirement AUTH-004 — Session persistence and role-gated routing**

*As a* signed-in visitor, *I want to* stay signed in across a page reload,
and be redirected to sign in when I try to reach a page my role does not
allow, *so that* RBAC actually keeps the dashboards separated.

Behaviour:

1. The session token issued by AUTH-001/002/003 is stored (cookie or
   equivalent) and sent with later requests; the server resolves it back to
   a `users` row on each request rather than trusting any client-supplied role.
2. An unauthenticated visit (no resolvable token) to `/account`, `/wishlist`,
   `/book/:id`, `/checkout/:id`, any `/supplier/*` route, or any `/admin/*`
   route redirects to `/signin`.
3. A resolvable token whose `users.role` is not permitted for a
   `/supplier/*` or `/admin/*` route shows `RequireRole`'s denial — the
   server-resolved role is what the gate checks, not a client-side guess.
4. Signing out invalidates the token server-side (it no longer resolves to a
   row); a subsequent visit to a gated route then redirects to `/signin`.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | A session token issued at sign-in | The page is reloaded, token resent | The server still resolves it to the same `users` row; no re-authentication prompt |
| AC-2 | No token sent | Visits `/account` directly by URL | Redirected to `/signin` |
| AC-3 | A token resolving to a `buyer` row | Visits `/admin/queue` directly by URL | `RequireRole`'s denial message renders (not the queue); the server never returns queue data to this token |
| AC-4 | A token resolving to a `supplier` row | Signs out, then visits `/supplier` with the same (now invalidated) token | The server no longer resolves the token; redirected to `/signin` |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Not permitted | Resolved role does not match the route's required role(s) | Denial per AC-3, never a silent redirect that hides the reason |
| Upstream failure | The session-check call fails (server unreachable) | Treated as unauthenticated; redirected to `/signin`, never left on the gated page |

**Data touched** — the session token and what it resolves to; no new schema field beyond `users.role`, `users.status`.

## 5. Screens

| Screen | Section in the design | Functions it serves | States that must exist |
|---|---|---|---|
| Sign in (`/signin`) | Sign in | AUTH-001, AUTH-002, AUTH-003 | default, error (rejected credentials/OTP) |
| Register (`/register`) | Register | AUTH-001 (account creation) | default |
| Every role-gated route | — | AUTH-004 | redirect-to-signin, denied (via `RequireRole`) |

## 6. Non-functional requirements

| Area | Requirement |
|---|---|
| Privacy | Passwords are stored hashed, never logged or returned to the client; OTP codes are single-use, short-lived, and stored server-side only |
| Performance | Sign-in (any of the three methods) completes within 2s at the project's seeded account volume |

## 7. Dependencies and assumptions

- **Depends on:** `data` module, for the `users` table this module reads and writes.
- **Depends on:** a Google OAuth client, configured outside this project (see `request_setup` for the redirect URI).
- **Assumption:** the OTP channel is SMS, matching "phone number with OTP" in the brief; which SMS provider is used is a TL/architecture decision, not a product one, and is not specified here.

| Open question | Proposed default | Who decides |
|---|---|---|
| Does a sub-admin need its own sign-in method restrictions (e.g. no Google sign-in for staff accounts)? | No: all three methods are available to every role unless the owner says otherwise | Stakeholder |

## 8. Traceability

| Plan item | Requirement ids | Test cases |
|---|---|---|
| Buyer & role sign-up and sign-in | AUTH-001, AUTH-002, AUTH-003, AUTH-004 | `test-cases/buyer-role-sign-up-and-sign-in.md` |
