# SRS — payments

Module: `payments`
Design: [View the approved design](http://localhost:9400)
Design system: `design/design-system.md`

## 1. Purpose

The `payments` module takes real payment for a held booking on
`/checkout/:id` — VNPay, MoMo, ZaloPay or bank transfer/VietQR — writes a
payment record for the transaction, and moves the booking row through
`Awaiting Payment` → `Paid` → `Confirmed` on a verified success, or leaves
it `Awaiting Payment` on failure until the hold expires. Without it,
`/checkout/:id`'s "Pay now" button only mints a code in `localStorage`;
no row anywhere records that money changed hands, and no booking is real.

## 2. Actors

| Actor | Who they are | What they may do in this module |
|---|---|---|
| Buyer | Signed-in traveller with a held booking | Choose a payment method and pay |
| Payment gateway | VNPay (and, once wired, MoMo/ZaloPay) | Calls back/webhooks this module's server with the payment outcome |

## 3. Scope

**In scope** — the function specified below, by its plan title:

- Checkout payment via VNPay MoMo ZaloPay

**In scope, concretely:** VNPay wired end-to-end (server-side initiation,
redirect, return/IPN callback verified by hash, and the booking row's
state update) as the one gateway required by the plan item's acceptance
criteria. MoMo, ZaloPay and bank transfer/VietQR render as payment-method
choices on the screen (`Checkout.tsx` already draws all four buttons) but
only VNPay's callback handling is required to write a real payment record
for this iteration; the others are out of scope until a later item unless
the stakeholder says otherwise (§7).

**Out of scope** — a reader would expect these here; they live elsewhere:

- Creating the `bookings` row and the seat hold — `booking` module
  (Booking creation with inventory hold); this module only acts on a
  booking row that already exists with `status = 'Awaiting Payment'`.
- Applying a discount code to the stored total — `booking` module
  (Voucher and discount code checkout); this module charges whatever
  `bookings.total` that requirement has already written.
- Sending the confirmation email/Zalo message — `notifications` module,
  triggered by this module's write to `bookings.status`.
- Rendering the booking code and QR after payment — `booking` module
  (Booking confirmation with QR and notice).

## 4. Functional requirements

### 4.1 Checkout payment via VNPay MoMo ZaloPay

**Requirement PAYMENTS-001 — Pay a held booking via VNPay**

*As a* Buyer, *I want to* pay for my held booking through VNPay from
`/checkout/:id`, *so that* a payment record is written and my booking row
is confirmed.

Behaviour:

1. Choosing VNPay and confirming payment calls the server, which creates a
   `payments` row (booking id, provider `vnpay`, amount, status `pending`)
   and redirects the Buyer to VNPay carrying that row's reference, built
   from the booking's stored `total` (after any voucher discount already
   applied to it) and `VNPAY_TMN_CODE`.
2. VNPay's return/IPN callback is verified server-side (a hash computed
   from the callback's own parameters and `VNPAY_HASH_SECRET`, compared to
   the hash VNPay sent) before any row is written; a callback whose hash
   does not match writes nothing and updates nothing.
3. A verified successful callback updates the matching `payments` row to
   `status = 'succeeded'` and, in the same transaction, updates the
   `bookings` row from `Awaiting Payment` to `Paid` then `Confirmed`,
   setting `bookings.payment = 'vnpay'`. The Buyer is then taken to
   `/booking/:code` for that booking's code.
4. A verified failed/cancelled callback updates the `payments` row to
   `status = 'failed'` and leaves the `bookings` row at
   `status = 'Awaiting Payment'` — unchanged — so the Buyer can retry
   while the hold is still valid.
5. A second callback for a `payments` row already `succeeded` (a retried
   or duplicate IPN) is accepted without creating a second `payments` row
   and without re-running the `bookings` status transition a second time.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | A `bookings` row with `status = 'Awaiting Payment'` and a stored `total` | VNPay's callback for that transaction verifies and reports success | A `payments` row exists with `status = 'succeeded'`, `provider = 'vnpay'`; the `bookings` row's `status` reads `Confirmed` and `payment` reads `vnpay` |
| AC-2 | The same booking row | VNPay's callback reports the payment declined or cancelled | The `payments` row for that attempt reads `status = 'failed'`; the `bookings` row's `status` is still `Awaiting Payment` |
| AC-3 | A callback arrives whose computed hash does not match `VNPAY_HASH_SECRET`'s expected value | — | No `payments` row is created or updated; the `bookings` row is untouched |
| AC-4 | A `payments` row already `status = 'succeeded'` for a transaction | VNPay delivers the same IPN callback again | No second `payments` row is created; the `bookings` row's `status` stays `Confirmed` and is not re-written |
| AC-5 | A `bookings` row whose `heldUntil` has passed (released per BOOKING-001) before the callback arrives | VNPay's callback reports success anyway | The booking is not moved to `Confirmed`; the `payments` row records the outcome but the Buyer is told the hold expired, since the seats may already belong to someone else |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Upstream failure | VNPay's endpoint is unreachable, or VNPay itself errors mid-flow | No `payments` row is left `pending` forever without a resolution path; the `bookings` row stays `Awaiting Payment` and the Buyer may retry while the hold lasts |
| Invalid input | The callback's hash does not verify | Rejected, nothing written (AC-3) |
| Conflict | Two callbacks for the same transaction (AC-4) | De-duplicated by the `payments` row's existing `status` |
| Boundary | The callback arrives in the final second before the hold's `heldUntil` | Whichever of the hold-release or the callback's booking update commits first wins; the other finds the row already in its terminal state and makes no further change |

**Data touched**

| Field | Type | Required | Rule |
|---|---|---|---|
| payments.booking_id | text | yes | References the `bookings` row this payment is for |
| payments.provider | text | yes | `vnpay` for this iteration |
| payments.amount | numeric | yes | Equals the booking's stored due total at initiation |
| payments.status | text | yes | pending → succeeded or failed, set only from a verified callback |
| bookings.status | text | yes | Awaiting Payment → Paid → Confirmed on verified success only |
| bookings.payment | text | yes | Set to the provider used, on success only |

**Requirement PAYMENTS-002 — Payment method choices on screen**

*As a* Buyer, *I want to* see VNPay, MoMo, ZaloPay and bank transfer/VietQR
as payment options on `/checkout/:id`, *so that* I know what ways I can
pay even where only one writes a real payment record today.

Behaviour:

1. `/checkout/:id` shows all four payment method buttons as already drawn
   in `Checkout.tsx`'s `PAYMENTS` list.
2. Selecting VNPay proceeds per PAYMENTS-001, writing the `payments` row
   described there. Selecting MoMo, ZaloPay or bank transfer/VietQR before
   that gateway is wired is handled per the open question in §7.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | `/checkout/:id` loads | — | VNPay, MoMo, ZaloPay and bank transfer/VietQR all render as selectable options |
| AC-2 | VNPay is selected and payment completes | — | A `payments` row exists per PAYMENTS-001 AC-1 |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Not applicable | — | This requirement only specifies what renders; failure behaviour for an unwired gateway is the open question in §7, not invented here |

**Data touched** — none beyond PAYMENTS-001.

## 5. Screens

| Screen | Section in the design | Functions it serves | States that must exist |
|---|---|---|---|
| Pay (`/checkout/:id`) | `Checkout.tsx` | PAYMENTS-001, PAYMENTS-002 | default, paying, failed |

The design draws no dedicated "payment failed" panel beyond the existing
disabled/"Taking payment…" button state; a failed VNPay callback is
communicated through that same mechanism, not a new screen.

## 6. Non-functional requirements

| Area | Requirement |
|---|---|
| Security | `VNPAY_HASH_SECRET` is read only server-side, used to verify and to sign, and is never logged, returned to the client, or placed in a `NEXT_PUBLIC_`-equivalent variable |
| Reliability | A duplicate callback for a `payments` row already in a terminal status never double-charges, double-confirms, or double-notifies |

## 7. Dependencies and assumptions

- **Depends on:** `booking` module, for the `bookings` row this module
  reads and transitions.
- **Depends on:** `notifications` module, consuming the `Confirmed`
  transition this module writes.
- **Depends on:** `VNPAY_TMN_CODE` and `VNPAY_HASH_SECRET` from the
  business's VNPay merchant account, and the IPN address VNPay calls
  registered against that terminal.
- **Assumption:** VNPay is the one gateway required end-to-end for this
  iteration's acceptance criteria ("at least one gateway wired end-to-end
  including its payment callback/webhook"); MoMo and ZaloPay buttons
  render but are not required to write a real `payments` row yet.

| Open question | Proposed default | Who decides |
|---|---|---|
| Should MoMo/ZaloPay/bank-transfer buttons be disabled (with a "coming soon" note) until wired, or left clickable and falling back to VNPay? | Disabled with a short note, so a Buyer is never told payment succeeded when it did not | Stakeholder |

## 8. Traceability

| Plan item | Requirement ids | Test cases |
|---|---|---|
| Checkout payment via VNPay MoMo ZaloPay | PAYMENTS-001, PAYMENTS-002 | `test-cases/checkout-payment-via-vnpay-momo-zalopay.md` |
