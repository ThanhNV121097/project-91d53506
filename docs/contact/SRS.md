# SRS — Contact

Module: `contact`
Design: [View the approved design](http://localhost:9400)
Design system: `design/design-system.md`

## 1. Purpose

Delivers `/contact`'s form (name, phone-or-email, message) to the owner's
Agent Team inbox, wiring up `ContactForm`/`sendEnquiry` already built in the
design against a real key.

## 2. Actors

| Actor | Who they are | What they may do in this module |
|---|---|---|
| Visitor | Any visitor | Submit the contact form |

## 3. Scope

**In scope**: Contact message form.

**Out of scope**: the form's layout and fields — already built by `site`/the
approved design (`ContactForm.tsx`); booking-specific extra fields
(date/people) on `/contact`'s booking-enquiry variant are the same component,
already built.

## 4. Functional requirements

### 4.1 Contact message form

**Requirement CONTACT-001 — Deliver a valid submission to the owner**

*As a* Visitor, *I want to* send my name, phone or email, and a message,
*so that* the owner receives it.

Behaviour:

1. A submission with name, a reply-to (phone or email) and a message, and an
   empty honeypot field, is forwarded to the configured Agent Team endpoint
   (`site.ts`'s `sendEnquiry`) and the sender sees the "sent" confirmation.
2. A submission with the honeypot field filled is silently dropped — the
   sender still sees "sent" (so a bot cannot tell it failed), but nothing is
   forwarded.
3. Required fields (name, reply-to) missing fail client-side validation
   before any request is sent.
4. A forwarding failure (the endpoint rejects or is unreachable) shows the
   "failed" state with a message, and the visitor may resubmit.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | Name, reply-to and message filled, honeypot empty | Submits | The owner's inbox receives the message; the visitor sees the "sent" state |
| AC-2 | Honeypot field is filled (by a bot) | Submits | Nothing is forwarded to the inbox; the visitor still sees "sent" |
| AC-3 | Name field empty | Attempts to submit | Inline validation error; no request is sent |
| AC-4 | The forwarding endpoint returns an error | Submits a valid form | The "failed" state renders with a message; the visitor may retry |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Invalid input | Required field missing | AC-3 |
| Upstream failure | Endpoint unreachable or errors | AC-4 |
| Not applicable | — | No permission model: the form is open to every visitor |

**Data touched** — the submission is forwarded, not stored in this project's own database (per `site.ts`'s existing design).

## 5. Screens

| Screen | Section in the design | Functions it serves | States that must exist |
|---|---|---|---|
| Contact (`/contact`) | Contact | CONTACT-001 | idle, sending, sent, failed, offline (per `ContactForm` §2.16 of the design system) |

## 6. Non-functional requirements

| Area | Requirement |
|---|---|
| Reliability | A submission is never lost silently on a 2xx response; a non-2xx always surfaces the "failed" state |

## 7. Dependencies and assumptions

- **Depends on:** the Agent Team key/endpoint already referenced by `site.json`/`site.ts` (already configured at the platform level; no new secret requested here).

| Open question | Proposed default | Who decides |
|---|---|---|
| — | — | None open |

## 8. Traceability

| Plan item | Requirement ids | Test cases |
|---|---|---|
| Contact message form | CONTACT-001 | `test-cases/contact-message-form.md` |
