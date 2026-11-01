# Test Cases — Contact message form

Module: `contact` · Function: CONTACT-001 · SRS: `docs/contact/SRS.md` ·
Contract: `docs/architecture/services.md` §3.10 (`POST /v1/contact`), §2.3
(error envelope/catalog).

Risk: low-medium. No payment, no stored data (message is forwarded, not
persisted), single actor (Visitor), no permission model. Depth is weighted
toward the two behaviors that are easy to get wrong: the honeypot's fake
success and distinguishing a real delivery failure from it.

Instruments available for this task: `interact_page`, `render_url`,
`measure_styles`, `fetch_url`, `manual`.

---

## AC-1 — valid submission delivers and shows "sent"

**Scenario**: Valid submission shows the sent confirmation
**Given**: Visitor is on `/contact` with the form in its `idle` state
**When**: Fills name, reply-to and message, leaves the hidden honeypot field
blank, and submits
**Then**: The form is replaced by the one-line "sent" confirmation
(`contact.form.sent` content, per design system §2.16); no validation error
and no `role="alert"` text is shown
**Traces**: SC-1 (CONTACT-001 AC-1)
**Check**: interact_page

**Scenario**: Valid submission reaches the contract endpoint as `202`
**Given**: A well-formed body — `name`, `contact`, `message` all non-blank,
`honeypot` blank
**When**: `POST /v1/contact` is called with that body
**Then**: Response is `202` with body `{}`
**Traces**: Contract (§3.10.1, success response)
**Check**: fetch_url

**Scenario**: Submit button shows the sending state while the request is in flight
**Given**: Visitor has filled the form validly
**When**: Submits, before the response returns
**Then**: The submit button is disabled and its label reads "Sending…"
(`contact.form.sending`); once the response resolves, the button is gone,
replaced by the sent line
**Traces**: SRS §5 (Screens — `sending` state must exist)
**Check**: interact_page

---

## AC-2 — honeypot filled is silently dropped, visitor still sees "sent"

**Scenario**: A filled honeypot still shows the sent confirmation to the visitor
**Given**: Visitor is on `/contact`, name/reply-to/message filled
**When**: The hidden `website` field is given a value (simulating a bot that
fills every field) and the form is submitted
**Then**: The visitor sees the identical "sent" confirmation as AC-1 — no
error, no different wording, nothing that would let a bot tell its message
was dropped
**Traces**: SC-2 (CONTACT-001 AC-2)
**Check**: interact_page

**Scenario**: A filled honeypot returns the identical `202` the contract defines for a real send
**Given**: A body identical to the valid AC-1 body except `honeypot` is
non-blank
**When**: `POST /v1/contact` is called with that body
**Then**: Response is `202` with body `{}` — byte-identical in status and
shape to the valid-submission response, so the two cases are
indistinguishable from outside (per §3.10.1 "Notes": the honeypot case
returns `202` same as a real send; only a genuine delivery failure differs,
at `503`)
**Traces**: Contract (§3.10.1, honeypot vs. delivery-failure distinction)
**Check**: fetch_url

---

## AC-3 — missing required fields fail client-side, before any request

**Scenario**: Empty name blocks submission client-side
**Given**: Visitor is on `/contact`, reply-to and message filled, name left
empty
**When**: Attempts to submit
**Then**: The browser's inline required-field validation fires on the name
input (the field is marked invalid/focused); no network request is sent and
the form stays in `idle` — no "sending" or "sent" state appears
**Traces**: SC-3 (CONTACT-001 AC-3)
**Check**: interact_page

**Scenario**: Empty reply-to blocks submission client-side
**Given**: Visitor is on `/contact`, name and message filled, reply-to left
empty
**When**: Attempts to submit
**Then**: The browser's inline required-field validation fires on the
reply-to input; no network request is sent
**Traces**: SC-3 (CONTACT-001 AC-3)
**Check**: interact_page

**Scenario**: A blank field that reaches the API anyway is still rejected server-side
**Given**: A body with `name` blank (empty string), `contact` and `message`
non-blank — simulating a client that skipped its own validation
**When**: `POST /v1/contact` is called with that body
**Then**: Response is `422` with `error.code = "VALIDATION_FAILED"` and a
`details` array naming the `name` field; no forwarding happens
**Traces**: Contract (§3.10.1 Errors; SRS NFR — a submission is never
forwarded silently on a request the contract rejects)
**Check**: fetch_url

**Scenario**: A blank `contact` (reply-to) is rejected server-side
**Given**: A body with `contact` blank, `name` and `message` non-blank
**When**: `POST /v1/contact` is called with that body
**Then**: Response is `422` with `error.code = "VALIDATION_FAILED"` and a
`details` entry for `contact`
**Traces**: Contract (§3.10.1 Errors)
**Check**: fetch_url

---

## AC-4 — forwarding failure shows "failed", input survives, retry works

**Scenario**: A delivery failure shows the failed state with a message and keeps what the visitor typed
**Given**: Visitor has filled the form validly on `/contact`, and the
configured Agent Team endpoint is made to reject the forward (or is
unreachable)
**When**: Submits
**Then**: The form does **not** show "sent"; instead a `role="alert"` line
appears with a message, the submit button is enabled again (not stuck on
"Sending…"), and the name/reply-to/message fields still hold exactly what
the visitor typed — nothing is cleared
**Traces**: SC-4 (CONTACT-001 AC-4)
**Check**: interact_page

**Scenario**: Retry after a failure succeeds once the endpoint recovers
**Given**: The failed state from the previous case is showing, with the
form's values still filled in
**When**: The endpoint is restored and the visitor presses submit again
without retyping anything
**Then**: The form moves to "sending" then to the "sent" confirmation — the
same fields that survived the failure are what gets (re)submitted
**Traces**: SC-4 (CONTACT-001 AC-4 — "the visitor may resubmit")
**Check**: interact_page

**Scenario**: A genuine delivery failure is distinguishable from the honeypot's fake success at the contract level
**Given**: A well-formed, non-honeypot body, with the configured Agent Team
endpoint made to reject the forward or be unreachable
**When**: `POST /v1/contact` is called with that body
**Then**: Response is `503` with `error.code = "UNAVAILABLE"` — not the
`202` that a valid send or a honeypot drop both return
**Traces**: Contract (§3.10.1 Notes — distinguishes real failure from the
honeypot's deliberate fake-success)
**Check**: fetch_url

---

## Contract rules not named by an SC but required by the backend convention

**Scenario**: A field the contract does not define is rejected, not ignored
**Given**: A well-formed body (`name`, `contact`, `message` all non-blank)
plus an extra field the contract never defines, e.g. `"admin": true`
**When**: `POST /v1/contact` is called with that body
**Then**: Response is `400` with `error.code = "MALFORMED_REQUEST"`; nothing
is forwarded — the undefined field is never silently accepted and ignored
**Traces**: Contract (§2.3 error catalog; §3.10.1 — "the body carries a
field this contract does not define" is `MALFORMED_REQUEST`)
**Check**: fetch_url

**Scenario**: A non-JSON body is rejected as malformed, not as a validation failure
**Given**: A request body that is not valid JSON
**When**: `POST /v1/contact` is called with that body
**Then**: Response is `400` with `error.code = "MALFORMED_REQUEST"`
**Traces**: Contract (§2.3 error catalog — "Body is not valid JSON")
**Check**: fetch_url

**Scenario**: The endpoint requires no authentication
**Given**: No `Authorization` header or session cookie is sent
**When**: `POST /v1/contact` is called with a well-formed, non-honeypot body
**Then**: Response is `202` with body `{}` — identical to the authenticated
case, since the form is open to every visitor
**Traces**: SRS §4.1 "Failure, boundary and permission behaviour" (Not
applicable — no permission model); Contract (§3.10, "Auth — none")
**Check**: fetch_url

---

## State required by the design system but not named by an SC

**Scenario**: With no Agent Team key configured, the form shows the offline note instead of submitting
**Given**: The platform-level Agent Team key/endpoint (`site.json`'s `key`/
`api`) is unset, so `canSend` is false
**When**: Visitor opens `/contact`
**Then**: A note using `contact.form.offline` content renders under the
form (`--ink-soft` token per design system §2.16); the form is otherwise
still visible and usable, but no request can succeed
**Traces**: SRS §5 (Screens — `offline` state must exist)
**Check**: manual — this state depends on the platform-level key/endpoint
being absent at build/deploy time, which is not a condition this role's
instruments can toggle on a running instance; no tool here rebuilds the
site without its configured key.
