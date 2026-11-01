# Story — Checkout payment via VNPay MoMo ZaloPay

Module: `payments`
SRS: `docs/payments/SRS.md` (PAYMENTS-001, PAYMENTS-002)

## User story

As a **Buyer** with a held booking at `/checkout/:id`, I want to pay via
VNPay and have my booking confirmed on success, so that my seats are
secured and I get a real booking code instead of a localStorage stub.

## Scope

**In scope**

- Server-side VNPay initiation: `POST` endpoint that, for a `bookings` row
  in `Awaiting Payment`, creates a `payments` row (`provider = 'vnpay'`,
  `status = 'pending'`, `amount` = the booking's stored `total`) and
  returns the VNPay redirect URL built from `VNPAY_TMN_CODE`.
- VNPay return/IPN callback handling: hash verification against
  `VNPAY_HASH_SECRET`, then the `payments` row and `bookings` row updates
  described in PAYMENTS-001.
- The booking-state transition `Awaiting Payment → Paid → Confirmed` on a
  verified success, and the no-op (stay `Awaiting Payment`) on a verified
  failure.
- De-duplication of a repeated IPN for an already-`succeeded` `payments`
  row.
- The hold-expiry interaction: a verified success arriving after the
  booking's `heldUntil` has passed does not confirm the booking.
- Wiring `Checkout.tsx`'s existing VNPay button to this real flow,
  replacing the `localStorage`-only code mint for the VNPay path.
- The four payment-method buttons rendering on `/checkout/:id`
  (PAYMENTS-002 AC-1); MoMo, ZaloPay and bank transfer/VietQR render
  **disabled** with a short "coming soon" note (the SRS §7 proposed
  default — not re-asked here: a disabled, honestly-labelled button is
  reversible and cheap to flip later, so it does not meet the bar for a
  stakeholder question).

**Out of scope** — a reader would expect these here; they live elsewhere:

- Creating the `bookings` row and the seat hold itself, and the
  `heldUntil` release job — `booking` module (Booking creation with
  inventory hold). This story only reads and transitions a booking row
  that already exists with `status = 'Awaiting Payment'`.
- Computing/applying a discount code to `bookings.total` — `booking`
  module (Voucher and discount code checkout). This story charges
  whatever total that requirement has already written; it does not
  recompute it.
- Sending the confirmation email/Zalo message on the `Confirmed`
  transition — `notifications` module. This story only writes the status
  this is a trigger for.
- Rendering the booking code/QR and the `/booking/:code` page content —
  `booking` module (Booking confirmation with QR and notice). This story
  only redirects there on success.
- MoMo, ZaloPay, bank transfer/VietQR actually taking payment — later plan
  items, once scoped. Today they are disabled buttons only.
- Any UI for a Buyer signing in — `auth` module; checkout assumes a
  signed-in Buyer with a booking id already in hand.

## UI scope

Screen: `/checkout/:id` (`Checkout.tsx`), already drawn by the approved
design. This story does not add a screen or a component; it rewires the
VNPay button's `onClick` from the mock `localStorage` write to a real
`POST` call, and reuses the existing states:

- **default** — four payment buttons, VNPay enabled, the other three
  disabled with a "coming soon" note (design system §2.16-adjacent plain
  helper-text pattern, `--ink-soft`).
- **paying** — VNPay button shows "Taking payment…", disabled, per the
  design system's existing disabled-button state (§2.1) — no new spinner
  or modal component, since the design has neither.
- **failed** — on return from a failed/cancelled VNPay callback, the page
  shows a short `role="alert"` line (ContactForm's own failed-state
  pattern, §2.16) and re-enables the VNPay button so the Buyer can retry
  while the hold lasts.

No new screen, no new component file. The redirect target after a
verified success is `/booking/:code`, owned by the `booking` module's
story — this story only performs the redirect.

## Acceptance criteria

- SC-1 [PAYMENTS-001 AC-1]: Given a `bookings` row `status = 'Awaiting Payment'` with a stored `total`, when VNPay's callback verifies and reports success, then a `payments` row exists with `status = 'succeeded'`, `provider = 'vnpay'`, and the `bookings` row reads `status = 'Confirmed'`, `payment = 'vnpay'`.
- SC-2 [PAYMENTS-001 AC-2]: Given the same booking row, when VNPay's callback reports the payment declined or cancelled, then the `payments` row for that attempt reads `status = 'failed'` and the `bookings` row's `status` is still `Awaiting Payment`.
- SC-3 [PAYMENTS-001 AC-3]: Given a callback whose computed hash does not match the expected value from `VNPAY_HASH_SECRET`, when it is received, then no `payments` row is created or updated and the `bookings` row is untouched.
- SC-4 [PAYMENTS-001 AC-4]: Given a `payments` row already `status = 'succeeded'` for a transaction, when VNPay delivers the same IPN callback again, then no second `payments` row is created and the `bookings` row's `status` stays `Confirmed`, not re-written.
- SC-5 [PAYMENTS-001 AC-5]: Given a `bookings` row whose `heldUntil` has passed before the callback arrives, when VNPay's callback reports success anyway, then the booking is not moved to `Confirmed`, the `payments` row still records the outcome, and the Buyer is told the hold expired.
- SC-6 [PAYMENTS-002 AC-1]: Given `/checkout/:id` loads, when the page renders, then VNPay, MoMo, ZaloPay and bank transfer/VietQR all render as options, with MoMo/ZaloPay/bank-transfer disabled and carrying a short "coming soon" note.
- SC-7 [PAYMENTS-002 AC-2]: Given VNPay is selected and payment completes, when the success callback is verified, then a `payments` row exists per SC-1 and the Buyer is redirected to `/booking/:code`.
- SC-8 [PAYMENTS-001 — reliability]: Given VNPay's endpoint is unreachable or errors mid-flow at initiation, when the Buyer clicks "Pay with VNPay", then the `payments` row (if created) stays `pending` and the `bookings` row stays `Awaiting Payment`, and the Buyer sees a plain error inviting retry rather than a silent hang.

## Dependencies

- `booking` module's "Booking creation with inventory hold" story: this
  story cannot be verified against a real booking row until that story's
  `bookings` table and hold logic exist; until then this story's backend
  is built and tested against the schema it specifies in
  `docs/architecture/erd.md` once extended (step 6 of this story).
- `notifications` module: consumes the `Confirmed` transition this story
  writes; not blocking this story's own completion.
- `VNPAY_TMN_CODE` and `VNPAY_HASH_SECRET` — requested from the
  stakeholder's VNPay merchant account; this story's backend reads them
  from the environment and is not verifiable end-to-end until they are
  supplied.
- The VNPay IPN callback address — requested from the stakeholder to
  register against their VNPay terminal; inbound calls cannot be tested
  until that registration exists against a reachable deployment.
