# Story — Contact message form

Module: `contact`
SRS: `docs/contact/SRS.md` (CONTACT-001)
Contract: `docs/architecture/services.md` §3.10 (`POST /v1/contact`)

## User story

As a **Visitor** on `/contact`, I want to send my name, a phone or email,
and a message, so that the owner receives it without my message ever being
silently lost or a bot's spam getting through un-filtered.

## Scope

**In scope**

- A real `POST /v1/contact` backend endpoint, per `services.md` §3.10.1:
  validates `name`/`contact`/`message`, honeypot check, forwards to the
  platform's Agent Team inbox using the server-side key, returns `202`
  (sent or honeypot-dropped — indistinguishable), `422` (validation),
  `503` (`UNAVAILABLE`, a genuine forwarding failure), `400`
  (`MALFORMED_REQUEST` for an undefined field or non-JSON body).
- Pointing the already-built `ContactForm`/`sendEnquiry` (`src/site.ts`) at
  this project's own `/v1/contact` instead of calling the Agent Team API
  directly from the browser — the forwarding key moves server-side and is
  never shipped in the frontend bundle.
- The four states this drives in the already-built `ContactForm`: `sent`,
  `failed` (with its message), client-side required-field validation
  before any request.

**Out of scope**

- `ContactForm`'s layout, fields and the booking-enquiry variant's extra
  fields (date/people) — already built (`ContactForm.tsx`, `Contact.tsx`),
  per the SRS's own out-of-scope note.
- The `offline` state (`canSend` false) — that depends on whether a key is
  configured at all, not on this story's endpoint; it is a design-time
  state covered by `site` story's build, not re-tested here.
- Any new secret: the SRS confirms the Agent Team key is already
  configured at the platform level (§7).
- Storing the message in this project's own database — it is forwarded,
  never persisted (SRS §4.1 "Data touched").

## UI scope

No new screen and no visual change to `/contact` — `ContactForm` already
renders all its states (idle, sending, sent, failed, offline) per design
system §2.16. This story's UI-visible change is behavioural only: which
endpoint `sendEnquiry` calls, and that the `sent`/`failed` states now
reflect this project's own backend's response rather than a direct Agent
Team call. Folded into the backend stage rather than a separate UI PR per
the SRS's framing of this story as "wiring up … already built in the
design against a real key".

## Acceptance criteria

SC-1 [CONTACT-001 AC-1]: A submission with name, reply-to and message
filled and the honeypot empty is forwarded to the Agent Team inbox via
this project's own `POST /v1/contact` (not a direct browser call to Agent
Team), and the visitor sees the `sent` confirmation.

SC-2 [CONTACT-001 AC-2]: A submission with the honeypot field filled
returns the identical `202 {}` as SC-1 and is never forwarded to the
inbox; the visitor still sees `sent`.

SC-3 [CONTACT-001 AC-3]: Submitting with `name` or `contact` (reply-to)
empty is blocked by client-side required-field validation before any
request is sent; a body that reaches the API with one of those fields
blank is rejected `422 VALIDATION_FAILED` and never forwarded.

SC-4 [CONTACT-001 AC-4]: When the configured Agent Team endpoint rejects
the forward or is unreachable, `POST /v1/contact` returns `503
UNAVAILABLE`, the form shows the `failed` state with a message, the
visitor's typed fields are not cleared, and resubmitting works once the
endpoint recovers.

SC-5 [CONTACT-001 — contract hygiene]: A request with an undefined field
or a non-JSON body returns `400 MALFORMED_REQUEST` and is never forwarded.

## Dependencies

- `docs/architecture/services.md` §3.10.1 — the contract this story's
  backend implements exactly.
- The Agent Team key/endpoint already configured at the platform level
  (SRS §7) — read server-side only; no new secret requested.
- No dependency on any other plan item.
