/**
 * Mock for POST /v1/contact, per docs/architecture/services.md §3.10.1.
 *
 * ContactForm (src/components/ContactForm.tsx) and sendEnquiry (src/site.ts)
 * are already built and already cover every state the approved design shows
 * for /contact — idle, sending, sent, failed, offline (design system §2.16).
 * This story's own plan (docs/contact/stories/contact-message-form.md, "UI
 * scope") folds the one real change — pointing sendEnquiry at this project's
 * own /v1/contact instead of calling the Agent Team API straight from the
 * browser — into the backend stage, so there is no separate UI diff to ship
 * here. This module exists only so that backend stage has the response
 * shape to match. Nothing in the app imports it yet.
 */

/** 202 {} — a real send and the honeypot's silent drop return the same body. */
export const SENT_RESPONSE = {} as const;

/** 422 — name, contact or message blank. */
export const VALIDATION_ERROR = { error: { code: "VALIDATION_FAILED" } } as const;

/** 503 — the configured Agent Team endpoint rejected the forward or was unreachable. */
export const UNAVAILABLE_ERROR = { error: { code: "UNAVAILABLE" } } as const;

/** 400 — an undefined field, or a non-JSON body. */
export const MALFORMED_ERROR = { error: { code: "MALFORMED_REQUEST" } } as const;
