# Story — Buyer & role sign-up and sign-in

Module: `auth`
SRS: `docs/auth/SRS.md`

## User story

As a Buyer, Supplier or Admin (including sub-admin), I want to register and
sign in with email+password, phone+OTP, or Google, so that I reach the
screens my role allows and my account exists independently of this one
browser.

## In scope

- `/register`: create a `users` row (email+password method only — AUTH-001
  AC-1/AC-2), with the chosen role.
- `/signin`: all three sign-in methods (AUTH-001, AUTH-002, AUTH-003),
  replacing the design's mock `lib/session.ts`.
- Session issuance, persistence across reload, and role-based routing on
  success (AUTH-001 AC-5, AUTH-004 AC-1).
- Role-gating of `/account`, `/wishlist`, `/book/:id`, `/checkout/:id`,
  `/supplier/*`, `/admin/*` via `RequireRole` reading the server-resolved
  role, not a client-side guess (AUTH-004 AC-2/AC-3).
- Sign-out invalidating the session server-side (AUTH-004 AC-4).
- Honouring `users.status = 'Locked'` at sign-in (AUTH-001 AC-6).

## Out of scope

- Sub-admin permission scoping (which `/admin/*` sections a sub-admin may
  open) — `admin` module.
- Supplier document upload and the `Awaiting documents` status transition
  itself — `suppliers` module; this story only creates the row with that
  status when the role chosen is Supplier.
- The lock/unlock control — `admin` module; this story only reads
  `users.status` at sign-in time.
- SMS provider selection/integration — the SRS assumption names the
  provider choice a TL/architecture decision; this story implements
  against whatever OTP-send interface TL's technical design picks, behind
  a package boundary so the provider is swappable.
- Google OAuth app/console setup — external, flagged below.

## UI scope

Screens already exist in the approved design (`/signin`, `/register`,
`RequireRole`'s denial state) — this story does not add a screen, it wires
the existing forms to real endpoints and adds:

- `/signin`: error state for rejected credentials/OTP (design system §2.3
  input error pattern, `role="alert"` per design system §3), and the OTP
  step (phone entry → code entry) if not already drawn in the mock.
- `/register`: default state, submitting to the real endpoint.
- No new screens, no new components beyond what the existing forms need to
  call the backend instead of `lib/session.ts`.

## Acceptance criteria

- SC-1 [AUTH-001 AC-1]: Registering with an email not in `users` creates a
  row with that email, a `password_hash` that is not the submitted
  plaintext, and `role` matching the form's selection.
- SC-2 [AUTH-001 AC-2]: Registering again with an email already in `users`
  creates no second row and is rejected.
- SC-3 [AUTH-001 AC-3]: Submitting a known email+correct password on
  `/signin` issues a session token resolvable to that row's `id`, and
  routes Supplier → `/supplier`, Admin/sub-admin → `/admin`, Buyer →
  `/account`.
- SC-4 [AUTH-001 AC-4]: Submitting a known email with the wrong password
  issues no session token and shows a generic "incorrect email or
  password" message.
- SC-5 [AUTH-001 AC-5]: Submitting an email with no matching `users` row
  shows the same generic message as SC-4 and creates no row.
- SC-6 [AUTH-001 AC-6]: Submitting correct credentials for a row with
  `status = 'Locked'` issues no session token and shows a message naming
  the account as locked.
- SC-7 [AUTH-002 AC-1]: Requesting an OTP for a phone with an account, then
  submitting the code actually stored for it, issues a session token
  resolvable to that account and marks the OTP record used.
- SC-8 [AUTH-002 AC-2]: Submitting a code that does not match the stored
  one issues no session token, shows a rejection message, and leaves the
  stored record unused.
- SC-9 [AUTH-002 AC-3]: Submitting a code whose stored expiry has passed is
  rejected with a message distinct from "wrong code", and issues no
  session token.
- SC-10 [AUTH-002 AC-4]: Submitting an already-used code a second time is
  rejected.
- SC-11 [AUTH-003 AC-1]: Completing Google sign-in with an email already in
  `users` creates no new row and issues a session token for the existing
  row.
- SC-12 [AUTH-003 AC-2]: Completing Google sign-in with an email not in
  `users` creates exactly one new row with role `buyer` and issues a
  session token for it, routing to `/account`.
- SC-13 [AUTH-003 AC-3]: Cancelling the Google flow creates no row, issues
  no token, and returns to `/signin`.
- SC-14 [AUTH-004 AC-1]: Reloading the page after sign-in resends the
  stored token; the server resolves it to the same `users` row with no
  re-authentication prompt.
- SC-15 [AUTH-004 AC-2]: Visiting `/account`, `/wishlist`, `/book/:id`,
  `/checkout/:id`, any `/supplier/*`, or any `/admin/*` route with no
  resolvable token redirects to `/signin`.
- SC-16 [AUTH-004 AC-3]: A token resolving to a `buyer` row visiting
  `/admin/queue` sees `RequireRole`'s denial, and the server never returns
  admin queue data for that token.
- SC-17 [AUTH-004 AC-4]: Signing out, then revisiting a previously allowed
  gated route with the same token, redirects to `/signin` — the token no
  longer resolves.

## Dependencies

- `data` module: the `users` table (and this story's own `otp_codes`
  table, added in this story's technical design since no other module
  owns it).
- Google OAuth client credentials — `GOOGLE_OAUTH_CLIENT_ID` /
  `GOOGLE_OAUTH_CLIENT_SECRET` (declared in architecture `.env.example`
  already; requested as secrets below) and the redirect URI registered at
  Google (setup step below).
- SMS OTP provider credential — `SMS_OTP_API_KEY` (already declared in
  architecture `.env.example`; requested as a secret below).
- Runs after `Site data from the database` only insofar as the `users`
  table's column shape should be consistent with that story's migration
  conventions — no hard code dependency, since no other story owns `users`
  yet.
