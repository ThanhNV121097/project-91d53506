# Test cases — Buyer & role sign-up and sign-in

Module: `auth`
Story: `docs/auth/stories/buyer-role-sign-up-and-sign-in.md`
SRS: `docs/auth/SRS.md`

Risk level: **high**. This function is the gate for every role-restricted
screen in the whole platform (Buyer account/booking, all `/supplier/*`, all
`/admin/*`). A gap here is not a cosmetic bug — it is "anybody acts as
Admin" or "a locked account still signs in". Coverage below is deliberately
deep on negative, boundary and permission paths, and shallow on cosmetic UI
(copy wording beyond what the SRS pins down).

Endpoints for `/register`, `/signin`, OTP request/verify and the Google
callback are this story's own and are not yet in `docs/architecture/services.md`
(technical design runs after this file, step 6 of the story flow). Cases that
need to hit those endpoints directly describe the action by what it does
("the registration endpoint", "the OTP verify endpoint"), not by a path —
verification resolves the concrete route once TL's technical design lands.

---

## AUTH-001 — Email and password sign-up and sign-in

**Scenario**: New email registers successfully
**Given**: No `users` row exists for `buyer-new@example.com`
**When**: Visitor submits `/register` with that email, password `Secret123!`, role `buyer`
**Then**: Registration succeeds (confirmation shown, no inline error); signing in immediately afterward with that exact email+password succeeds and routes to `/account` — proving a row was created with that email, that role, and a password hash the server can verify (never the plaintext, since a plaintext-equality check would also "work" but the requirement is a hash comparison, exercised identically either way at this boundary)
**Traces**: SC-1 (AUTH-001 AC-1)
**Check**: interact_page

**Scenario**: Duplicate email is rejected, no second row
**Given**: A `users` row already exists for `dup@example.com` (created by a prior registration)
**When**: Visitor submits `/register` again with `dup@example.com` and any password
**Then**: Rejected with an inline/form error; no success confirmation shown; the original account is unaffected — signing in with the original account's real password still succeeds exactly as before
**Traces**: SC-2 (AUTH-001 AC-2)
**Check**: interact_page

**Scenario**: Concurrent duplicate registrations — only one row survives
**Given**: No `users` row exists for `race@example.com`
**When**: Two registration requests for `race@example.com` are fired back-to-back (near-simultaneously) against the registration endpoint
**Then**: Exactly one request returns success; the other returns the same rejection as the duplicate-email case; no state exists where both succeeded
**Traces**: SC-2 (AUTH-001 conflict)
**Check**: fetch_url

**Scenario**: Buyer signs in and is routed to /account
**Given**: A `users` row with role `buyer` and a known password exists
**When**: Submits that email+password on `/signin`
**Then**: Session is issued (subsequent visits to `/account` are allowed, not redirected); lands on `/account`
**Traces**: SC-3 (AUTH-001 AC-3)
**Check**: interact_page

**Scenario**: Supplier signs in and is routed to /supplier
**Given**: A `users` row with role `supplier` and a known password exists
**When**: Submits that email+password on `/signin`
**Then**: Session is issued; lands on `/supplier`
**Traces**: SC-3 (AUTH-001 AC-3)
**Check**: interact_page

**Scenario**: Admin signs in and is routed to /admin
**Given**: A `users` row with role `admin` and a known password exists
**When**: Submits that email+password on `/signin`
**Then**: Session is issued; lands on `/admin`
**Traces**: SC-3 (AUTH-001 AC-3)
**Check**: interact_page

**Scenario**: Wrong password is rejected with a generic message
**Given**: A `users` row with a known password
**When**: Submits that email with an incorrect password on `/signin`
**Then**: No session is issued (a subsequent visit to `/account` still redirects to `/signin`); form shows a generic "incorrect email or password" message that does not say which field was wrong
**Traces**: SC-4 (AUTH-001 AC-4)
**Check**: interact_page

**Scenario**: Unknown email is rejected with the same generic message, no row created
**Given**: No `users` row exists for `ghost@example.com`
**When**: Submits `ghost@example.com` with any password on `/signin`
**Then**: Same generic "incorrect email or password" message as the wrong-password case; no row is created as a side effect — registering `ghost@example.com` afterward still succeeds as a brand-new account (no pre-existing row blocking it)
**Traces**: SC-5 (AUTH-001 AC-5)
**Check**: interact_page

**Scenario**: Locked account is rejected even with the correct password
**Given**: A `users` row with `status = 'Locked'` and a known, correct password (status set via `set_db_state`)
**When**: Submits the correct email+password on `/signin`
**Then**: No session is issued (`/account` still redirects to `/signin` afterward); message names the account as locked, distinct text from the generic incorrect-credentials message
**Traces**: SC-6 (AUTH-001 AC-6)
**Check**: interact_page

**Scenario**: Empty/invalid email shape blocks submission client-side
**Given**: `/register` open, no backend call made yet
**When**: Visitor leaves the email field empty (or types `not-an-email`) and attempts to submit
**Then**: Inline validation error shown; the visitor remains on `/register` with no success/failure network round trip (no row written either way)
**Traces**: SC-1 (AUTH-001 invalid input)
**Check**: interact_page

**Scenario**: Password one character over the maximum length is rejected
**Given**: `/register` open; a password string one character longer than the field's declared maximum
**When**: Visitor submits with that password
**Then**: Rejected with a message naming the length limit; no `users` row is written for the attempt
**Traces**: SC-1 (AUTH-001 boundary)
**Check**: interact_page

**Scenario**: Password at the minimum and maximum accepted length both succeed
**Given**: `/register` open; two passwords, one at exactly the field's minimum length and one at exactly its maximum
**When**: Each is submitted in turn with a distinct unused email
**Then**: Both registrations succeed (no length-related rejection at either boundary)
**Traces**: SC-1 (AUTH-001 boundary)
**Check**: interact_page

**Scenario**: Registration request with an undefined field is rejected, not silently ignored
**Given**: No `users` row exists for `strictfield@example.com`
**When**: A request to the registration endpoint sends the usual email/password/role plus one field the contract does not define
**Then**: Rejected with HTTP 400 and the contract's malformed-request code; no `users` row is created
**Traces**: SC-1 (contract: undefined field rejected)
**Check**: fetch_url

**Scenario**: Registration fails closed when the database is unreachable
**Given**: The backend is running; the database is made unavailable (`set_db_available(false)`)
**When**: A registration request is submitted for a brand-new email
**Then**: Response is 503 (dependency refused the connection), not a silent success and not a generic 500; no row is created (verified by restoring the database and confirming the email is still free to register)
**Traces**: SC-1 (contract: dependency unavailable)
**Check**: fetch_url

---

## AUTH-002 — Phone number sign-in with OTP

**Scenario**: Correct OTP signs in and marks the record used
**Given**: A `users` row exists with phone `+84900000001`; an OTP is requested for that phone (OTP record written server-side, code never present in the request's own response body)
**When**: Visitor submits the code actually stored for that phone (read via `set_db_state`/direct lookup, not from the response) on the OTP verify step
**Then**: Session is issued (subsequent visit to the role's gated route succeeds, not redirected); the OTP record is now marked used
**Traces**: SC-7 (AUTH-002 AC-1)
**Check**: interact_page

**Scenario**: OTP response body never contains the code itself
**Given**: A `users` row with a phone number
**When**: An OTP is requested for that phone
**Then**: The HTTP response body for the request contains no field holding the plaintext code
**Traces**: SC-7 (AUTH-002 AC-1, privacy)
**Check**: fetch_url

**Scenario**: Wrong OTP code is rejected, stored record stays unused
**Given**: An OTP has been requested and stored for a phone
**When**: Visitor submits a code that does not match the stored one
**Then**: No session is issued; rejected with a message; the stored record's `used` flag is still false (verified by then submitting the real stored code afterward and having it succeed)
**Traces**: SC-8 (AUTH-002 AC-2)
**Check**: interact_page

**Scenario**: Expired OTP is rejected with an expiry-specific message
**Given**: A stored OTP record whose `expires_at` has already passed (set via `set_db_state`)
**When**: Visitor submits that exact (still-correct) code
**Then**: Rejected with a message naming expiry, text distinct from the "wrong code" message in the previous case; no session is issued
**Traces**: SC-9 (AUTH-002 AC-3)
**Check**: interact_page

**Scenario**: Already-used OTP code is rejected on a second submission
**Given**: An OTP code was already successfully used once (its record's `used` flag is true)
**When**: Visitor submits that same code again
**Then**: Rejected; no session is issued on the second attempt
**Traces**: SC-10 (AUTH-002 AC-4)
**Check**: interact_page

**Scenario**: Repeated OTP requests in a short window are rate-limited
**Given**: An OTP was just requested for a phone number
**When**: The same phone requests another OTP immediately again (within the rate-limit window), repeated past the allowed count
**Then**: A later request in the burst is rejected with a rate-limit message, not silently queued or resent without limit
**Traces**: AUTH-002 boundary (rate limit)
**Check**: fetch_url

**Scenario**: Invalid phone shape blocks the OTP request client-side
**Given**: OTP request step open
**When**: Visitor types a phone number that is not a valid shape (e.g. letters, too short) and attempts to request a code
**Then**: Inline validation error shown; no OTP record is written, no network request completes successfully
**Traces**: AUTH-002 invalid input
**Check**: interact_page

**Scenario**: OTP verify request with an undefined field is rejected
**Given**: A valid stored OTP record for a phone
**When**: The OTP verify endpoint receives the usual phone/code plus one field the contract does not define
**Then**: Rejected with HTTP 400 and the contract's malformed-request code
**Traces**: AUTH-002 (contract: undefined field rejected)
**Check**: fetch_url

---

## AUTH-003 — Google sign-in

**Scenario**: Existing account via Google creates no new row
**Given**: A `users` row already exists for `googleexisting@example.com`
**When**: The Google OAuth flow completes and returns that email as Google-verified
**Then**: No new `users` row is created (row count for that email stays at one); a session is issued for the existing row; routed to `/account`
**Traces**: SC-11 (AUTH-003 AC-1)
**Check**: fetch_url

**Scenario**: New email via Google creates exactly one buyer row
**Given**: No `users` row exists for `googlenew@example.com`
**When**: The Google OAuth flow completes and returns that email as Google-verified
**Then**: Exactly one new `users` row is created, with that email and role `buyer`; a session is issued for it; routed to `/account`
**Traces**: SC-12 (AUTH-003 AC-2)
**Check**: fetch_url

**Scenario**: Cancelling the Google flow creates nothing
**Given**: Visitor starts Google sign-in from `/signin`
**When**: Visitor cancels the flow before it completes (closes the consent screen / denies)
**Then**: No `users` row is created; no session is issued (a gated route still redirects to `/signin` afterward); visitor lands back on `/signin`
**Traces**: SC-13 (AUTH-003 AC-3)
**Check**: interact_page

**Scenario**: Google OAuth upstream failure shows an error, nothing is created
**Given**: Google's OAuth endpoint is made unreachable or returns an error for this attempt
**When**: Visitor attempts Google sign-in from `/signin`
**Then**: `/signin` shows an error message; no `users` row is created; no session is issued
**Traces**: AUTH-003 (upstream failure)
**Check**: interact_page

---

## AUTH-004 — Session persistence and role-gated routing

**Scenario**: Session survives a page reload
**Given**: Visitor has signed in successfully (session token stored)
**When**: The page is reloaded
**Then**: No re-authentication prompt is shown; the visitor is still recognised as signed in (their account-only UI, e.g. account/role-specific nav, is present after reload, not a signed-out state)
**Traces**: SC-14 (AUTH-004 AC-1)
**Check**: interact_page

**Scenario**: Unauthenticated visit to each gated route redirects to /signin
**Given**: No session token is present (fresh/incognito-equivalent state)
**When**: Visitor navigates directly by URL to each of: `/account`, `/wishlist`, `/book/:id`, `/checkout/:id`, a `/supplier/*` route, an `/admin/*` route
**Then**: Each navigation redirects to `/signin`, with no gated content rendered first
**Traces**: SC-15 (AUTH-004 AC-2)
**Check**: interact_page

**Scenario**: Buyer token denied on an admin route, no data leaked
**Given**: A session token resolving to a `buyer` row
**When**: Visitor navigates to `/admin/queue`
**Then**: `RequireRole`'s denial view renders, not the queue; the underlying API response for the admin queue data (checked directly) returns no queue data for that token — either a 403 or an empty/denied payload, never the real records
**Traces**: SC-16 (AUTH-004 AC-3)
**Check**: interact_page

**Scenario**: Admin route data request is rejected at the API for a buyer token
**Given**: A session token resolving to a `buyer` row
**When**: A direct request is made to the admin queue data endpoint using that buyer token
**Then**: Response is 403 (or the contract's forbidden code), not the admin queue payload
**Traces**: SC-16 (AUTH-004 AC-3, contract)
**Check**: fetch_url

**Scenario**: Sign-out invalidates the token server-side
**Given**: A signed-in supplier session (token resolves to a `supplier` row, `/supplier` reachable)
**When**: Visitor signs out, then revisits `/supplier` using the same (now stale) token
**Then**: The server no longer resolves the token to a row; visitor is redirected to `/signin`, not shown `/supplier`
**Traces**: SC-17 (AUTH-004 AC-4)
**Check**: interact_page

**Scenario**: Session-check call failing is treated as unauthenticated
**Given**: A signed-in session; the backend (or its session-check dependency) is made unreachable
**When**: Visitor visits a gated route (e.g. `/account`)
**Then**: Treated as unauthenticated — redirected to `/signin`, never left rendering the gated page in a broken/half-loaded state
**Traces**: AUTH-004 (upstream failure)
**Check**: fetch_url

---

## Coverage check

| Story SC | Covered by |
|---|---|
| SC-1 | New email registers; invalid email shape; password boundary (min/max/over-max); undefined field rejected; DB unavailable |
| SC-2 | Duplicate email rejected; concurrent duplicate registrations |
| SC-3 | Buyer/Supplier/Admin sign-in routing (3 cases) |
| SC-4 | Wrong password rejected |
| SC-5 | Unknown email rejected, no row created |
| SC-6 | Locked account rejected |
| SC-7 | Correct OTP signs in; OTP never in response body |
| SC-8 | Wrong OTP rejected, record stays unused |
| SC-9 | Expired OTP rejected |
| SC-10 | Reused OTP rejected |
| SC-11 | Existing Google account, no new row |
| SC-12 | New Google account, exactly one row |
| SC-13 | Cancelled Google flow |
| SC-14 | Session survives reload |
| SC-15 | Unauthenticated redirect across all six gated routes |
| SC-16 | Buyer denied on admin route (UI + API) |
| SC-17 | Sign-out invalidates token |

Additional contract/failure coverage not tied to a single SC but required by
the backend rule (undefined request fields rejected 400; store failure is
500/503; rate limiting; upstream OAuth failure; session-check failure):
covered above under AUTH-001/002/003/004 boundary and failure cases.
