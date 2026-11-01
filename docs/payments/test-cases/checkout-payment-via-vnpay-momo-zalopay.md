
# Test Cases — Checkout payment via VNPay MoMo ZaloPay

Module: `payments`
Function: PAYMENTS-001, PAYMENTS-002 (`docs/payments/SRS.md`,
`docs/payments/stories/checkout-payment-via-vnpay-momo-zalopay.md`,
`docs/architecture/services.md` §3.6.1–§3.6.4, §2.3, §2.5, §2.6)

Risk level: **high**. This is the project's one real money-movement path —
a wrong write here either confirms a booking nobody paid for or takes a
payment that never confirms a seat. Every acceptance criterion (SC-1…SC-8)
gets its own case, the de-duplication criterion (SC-4) and the
hold-expiry race (SC-5) are each exercised directly rather than folded
into the happy path, and every contract rule for the three endpoints in
services.md §3.6 (idempotency key, undefined body field, not-found/not-
owned, wrong booking state, VNPay's own exempted field list) gets its own
case, since the backend review is blocked on exactly those.

Endpoints exercised: `POST /v1/bookings/{id}/checkout/vnpay` (§3.6.1),
`GET /v1/payments/vnpay/return` (§3.6.2), `POST /v1/payments/vnpay/ipn`
(§3.6.3), `GET /v1/bookings/{id}/payment-methods` (§3.6.4).

---

**Scenario**: Starting a VNPay payment creates a pending payments row and a redirect URL
**Given**: A `bookings` row with `status = "Awaiting Payment"`, `total = 2500000`, owned by a signed-in Buyer
**When**: The Buyer calls `POST /v1/bookings/{id}/checkout/vnpay` with header `Idempotency-Key: a-key-1` and an empty body
**Then**: Response is `200` with `{ "redirect_url": "https://sandbox.vnpayment.vn/...?vnp_..." }`; the URL's query string includes the configured `VNPAY_TMN_CODE` value; a `payments` row now exists with `booking_id` = that booking, `provider = "vnpay"`, `status = "pending"`, `amount = 2500000`
**Traces**: SC-1 (PAYMENTS-001 AC-1, initiation half); contract (§3.6.1 Notes, "creates a payments row … before building the redirect URL")
**Check**: fetch_url

---

**Scenario**: Missing the required Idempotency-Key header is rejected
**Given**: The same booking as above, still `Awaiting Payment`
**When**: `POST /v1/bookings/{id}/checkout/vnpay` is sent with no `Idempotency-Key` header
**Then**: Response is `422` with `error.code = "VALIDATION_FAILED"`; no `payments` row is created
**Traces**: contract (§3.6.1 errors, "`VALIDATION_FAILED` 422 — `Idempotency-Key` header missing")
**Check**: fetch_url

---

**Scenario**: Replaying the same Idempotency-Key returns the original row, not a second one
**Given**: A `payments` row already created for a booking via `Idempotency-Key: a-key-1` (previous case), booking still `Awaiting Payment`
**When**: `POST /v1/bookings/{id}/checkout/vnpay` is sent again for the same booking with the same header `Idempotency-Key: a-key-1`
**Then**: Response is `200` with the same `redirect_url` as the first call; exactly one `payments` row exists for that booking afterward, not two
**Traces**: contract (§2.6, "A replay with the same key and the same booking returns the original payments row's redirect URL instead of creating a second pending row")
**Check**: fetch_url

---

**Scenario**: Starting payment on a booking that is not Awaiting Payment is a conflict
**Given**: A `bookings` row with `status = "Paid"` (or `"Confirmed"`), owned by the signed-in Buyer
**When**: `POST /v1/bookings/{id}/checkout/vnpay` is sent with a fresh `Idempotency-Key`
**Then**: Response is `409` with `error.code = "CONFLICT"`; no new `payments` row is created
**Traces**: contract (§3.6.1 errors, "`CONFLICT` 409 — `bookings.status != 'Awaiting Payment'`")
**Check**: fetch_url

---

**Scenario**: Starting payment on a booking that does not exist or is not owned by the caller
**Given**: Either a `booking_id` matching no row, or a `bookings` row owned by a different Buyer
**When**: `POST /v1/bookings/{id}/checkout/vnpay` is sent with a valid `Idempotency-Key`, signed in as the non-owning Buyer
**Then**: Response is `404` with `error.code = "NOT_FOUND"`; no `payments` row is created
**Traces**: contract (§3.6.1 errors, "`NOT_FOUND` 404 — booking not found/not owned"); permission scoping (Auth — buyer, owning the booking)
**Check**: fetch_url

---

**Scenario**: Starting payment unauthenticated is rejected
**Given**: A valid `bookings` row in `Awaiting Payment`; no session token or cookie sent
**When**: `POST /v1/bookings/{id}/checkout/vnpay` is sent with a valid `Idempotency-Key`
**Then**: Response is `401` with `error.code = "UNAUTHENTICATED"`; no `payments` row is created
**Traces**: contract (§2.3, `UNAUTHENTICATED`); (§3.6.1 Auth — buyer)
**Check**: fetch_url

---

**Scenario**: A body field the contract does not define is rejected, not ignored
**Given**: A valid `bookings` row in `Awaiting Payment`, owned by the signed-in Buyer
**When**: `POST /v1/bookings/{id}/checkout/vnpay` is sent with a valid `Idempotency-Key` header and a JSON body `{ "amount_override": 1 }`
**Then**: Response is `400` with `error.code = "MALFORMED_REQUEST"`; no `payments` row is created
**Traces**: contract (§2.5, "a field this contract does not define is rejected with 400 MALFORMED_REQUEST — never accepted and silently ignored")
**Check**: fetch_url

---

**Scenario**: VNPay unreachable at initiation leaves a pending row and a retryable Buyer-facing error
**Given**: A valid `bookings` row in `Awaiting Payment`, owned by the signed-in Buyer, `/checkout/:id` loaded, VNPay's endpoint made unreachable
**When**: The Buyer clicks the "Pay with VNPay" button
**Then**: The request to the server returns `503` with `error.code = "UNAVAILABLE"`; the `payments` row created for the attempt (if any) stays `status = "pending"`; the `bookings` row stays `status = "Awaiting Payment"`; the page shows a plain error inviting retry rather than hanging, and the VNPay button is re-enabled so the Buyer can retry with the same `Idempotency-Key` while the hold lasts
**Traces**: SC-8 (PAYMENTS-001 — reliability); contract (§3.6.1 errors, `UNAVAILABLE` 503); services.md §4 dependency table ("Buyer sees UNAVAILABLE on checkout start, retries with the same Idempotency-Key")
**Check**: interact_page

---

**Scenario**: A verified successful VNPay callback confirms the booking
**Given**: A `bookings` row `status = "Awaiting Payment"` with a stored `total`, and its matching `payments` row `status = "pending"` created at initiation
**When**: `POST /v1/payments/vnpay/ipn` is called with query parameters whose `vnp_SecureHash` verifies against `VNPAY_HASH_SECRET` and `vnp_ResponseCode = "00"`
**Then**: Response is `200` with body `{ "RspCode": "00", "Message": "Confirm Success" }`; the matching `payments` row now reads `status = "succeeded"`, `provider = "vnpay"`; the `bookings` row now reads `status = "Confirmed"`, `payment = "vnpay"`
**Traces**: SC-1 (PAYMENTS-001 AC-1)
**Check**: fetch_url

---

**Scenario**: A verified declined/cancelled VNPay callback leaves the booking awaiting payment
**Given**: The same booking and `payments` row as above, reset to `status = "Awaiting Payment"` / `"pending"`
**When**: `POST /v1/payments/vnpay/ipn` is called with a verifying `vnp_SecureHash` but `vnp_ResponseCode = "24"` (cancelled)
**Then**: Response is `200` with body `{ "RspCode": "00", "Message": "Confirm Success" }` (VNPay's notice was processed, regardless of the payment's own outcome); the `payments` row for that attempt now reads `status = "failed"`; the `bookings` row's `status` is still `"Awaiting Payment"`
**Traces**: SC-2 (PAYMENTS-001 AC-2)
**Check**: fetch_url

---

**Scenario**: A callback whose hash does not verify writes nothing
**Given**: The same booking, `bookings.status = "Awaiting Payment"`, `payments.status = "pending"`
**When**: `POST /v1/payments/vnpay/ipn` is called with a `vnp_SecureHash` that does not match the hash computed from the callback's own parameters and `VNPAY_HASH_SECRET`
**Then**: Response is `200` with body `{ "RspCode": "97", "Message": "..." }`; the `payments` row is unchanged (`status` still `"pending"`); the `bookings` row is unchanged (`status` still `"Awaiting Payment"`)
**Traces**: SC-3 (PAYMENTS-001 AC-3)
**Check**: fetch_url

---

**Scenario**: A repeated IPN for an already-succeeded payment is de-duplicated
**Given**: A `payments` row already `status = "succeeded"` for a transaction, matching `bookings` row already `status = "Confirmed"`, `payment = "vnpay"`
**When**: The same verified success IPN (same `vnp_TxnRef`/`vnp_TransactionNo`) is delivered a second time
**Then**: Response is `200` with body `{ "RspCode": "02", "Message": "..." }`; exactly one `payments` row still exists for that transaction (no second row created); the `bookings` row's `status` is still `"Confirmed"` and its `updated_at` is unchanged by this second call
**Traces**: SC-4 (PAYMENTS-001 AC-4)
**Check**: fetch_url

---

**Scenario**: A success callback arriving after the hold already expired does not confirm the booking
**Given**: A `bookings` row that was `Awaiting Payment` but whose `held_until` passed and was already swept to `status = "Cancelled"` by the hold-expiry sweep (BOOKING-001), with a matching `payments` row still `status = "pending"`
**When**: `POST /v1/payments/vnpay/ipn` is called with a verifying hash and `vnp_ResponseCode = "00"`
**Then**: Response is `200` with body `{ "RspCode": "00", "Message": "Confirm Success" }`; the `payments` row records the outcome (`status = "succeeded"`); the `bookings` row's `status` stays `"Cancelled"` — it is never moved to `"Confirmed"`
**Traces**: SC-5 (PAYMENTS-001 AC-5)
**Check**: fetch_url

---

**Scenario**: The Buyer is told the hold expired rather than seeing a confirmed booking
**Given**: The booking and payment from the previous case (hold expired, `bookings.status = "Cancelled"`, IPN already delivered and processed)
**When**: The Buyer's browser is redirected to `GET /v1/payments/vnpay/return` with the same `vnp_*` parameters VNPay sent (`vnp_ResponseCode = "00"`)
**Then**: Response is `302` to `/checkout/{booking_id}?payment=failed` (never to `/booking/{code}`, since the booking never reached `Confirmed`)
**Traces**: SC-5 (PAYMENTS-001 AC-5, "the Buyer is told the hold expired"); contract (§3.6.2, "otherwise 302 to `/checkout/{booking_id}?payment=failed`")
**Check**: fetch_url

---

**Scenario**: `/checkout/:id` renders all four payment methods, three disabled with a coming-soon note
**Given**: A `bookings` row in `Awaiting Payment` owned by the signed-in Buyer; `/checkout/:id` for that booking
**When**: The page loads
**Then**: Four payment buttons render — VNPay, MoMo, ZaloPay, bank transfer/VietQR; the VNPay button is enabled (no `disabled` attribute); the MoMo, ZaloPay and bank-transfer buttons each carry a `disabled` attribute and a short visible "coming soon"-style note
**Traces**: SC-6 (PAYMENTS-002 AC-1)
**Check**: render_url

---

**Scenario**: `GET /v1/bookings/{id}/payment-methods` reports VNPay enabled and the rest disabled
**Given**: A `bookings` row owned by the signed-in Buyer
**When**: `GET /v1/bookings/{id}/payment-methods` is called
**Then**: Response is `200` with `{ "methods": [ {"provider":"vnpay","enabled":true}, {"provider":"momo","enabled":false}, {"provider":"zalopay","enabled":false}, {"provider":"bank_transfer","enabled":false} ] }`
**Traces**: SC-6 (PAYMENTS-002 AC-1); contract (§3.6.4 success response)
**Check**: fetch_url

---

**Scenario**: The payment-methods endpoint rejects a caller who does not own the booking
**Given**: A `bookings` row owned by a different Buyer than the caller
**When**: `GET /v1/bookings/{id}/payment-methods` is called signed in as the non-owning Buyer
**Then**: Response is `404` with `error.code = "NOT_FOUND"`
**Traces**: contract (§3.6.4 Auth — buyer, owning the booking)
**Check**: fetch_url

---

**Scenario**: The payment-methods endpoint rejects an unauthenticated caller
**Given**: A valid booking id; no session token or cookie sent
**When**: `GET /v1/bookings/{id}/payment-methods` is called
**Then**: Response is `401` with `error.code = "UNAUTHENTICATED"`
**Traces**: contract (§2.3, `UNAUTHENTICATED`)
**Check**: fetch_url

---

**Scenario**: Clicking "Pay with VNPay" starts the real flow and ends at the booking code on success
**Given**: A `bookings` row in `Awaiting Payment` with a stored `total`, owned by the signed-in Buyer, `/checkout/:id` loaded with VNPay selected
**When**: The Buyer clicks the "Pay with VNPay" button, the server-side initiation succeeds, and VNPay's IPN then verifies and reports success for that transaction
**Then**: A `payments` row exists per the first scenario above (`status = "succeeded"`, `provider = "vnpay"`); `GET /v1/payments/vnpay/return` with the matching success parameters responds `302` to `/booking/{code}` for that booking's code
**Traces**: SC-7 (PAYMENTS-002 AC-2)
**Check**: interact_page

---

**Scenario**: Clicking "Pay with VNPay" shows the taking-payment state while the request is in flight
**Given**: `/checkout/:id` loaded for a booking in `Awaiting Payment`, VNPay selected
**When**: The Buyer clicks the "Pay with VNPay" button
**Then**: Immediately after the click, the button is disabled and its label reads the "Taking payment…" state text, before any navigation occurs
**Traces**: SC-7 (PAYMENTS-002 AC-2, screen state "paying"); story UI scope ("paying — VNPay button shows 'Taking payment…', disabled")
**Check**: interact_page

---

**Scenario**: Returning from a failed VNPay callback shows an alert and re-enables the VNPay button
**Given**: A booking whose VNPay attempt was declined (per the decline scenario above), the Buyer's browser now at `/checkout/{booking_id}?payment=failed`
**When**: The page renders
**Then**: A `role="alert"` line is visible on the page; the "Pay with VNPay" button is enabled (no `disabled` attribute), so the Buyer can retry while the hold lasts
**Traces**: SC-2 (PAYMENTS-001 AC-2, Buyer-visible consequence); story UI scope ("failed — … shows a short role=\"alert\" line … and re-enables the VNPay button")
**Check**: interact_page

---

**Scenario**: An IPN naming a transaction with no matching payments row
**Given**: No `payments` row exists with a `gateway_transaction_id`/`vnp_TxnRef` matching the callback
**When**: `POST /v1/payments/vnpay/ipn` is called with a verifying hash for that unknown `vnp_TxnRef`
**Then**: Response is `200` with body `{ "RspCode": "01", "Message": "..." }`; no `payments` row is created or updated
**Traces**: contract (§3.6.3, "`01` Order not found — no payments row matches vnp_TxnRef")
**Check**: fetch_url

---

**Scenario**: An IPN whose amount does not match the stored payment amount
**Given**: A `payments` row `status = "pending"` with `amount = 2500000`
**When**: `POST /v1/payments/vnpay/ipn` is called with a verifying hash, `vnp_ResponseCode = "00"`, and `vnp_Amount` corresponding to a different amount than `2500000`
**Then**: Response is `200` with body `{ "RspCode": "04", "Message": "..." }`; the `payments` row is unchanged (`status` still `"pending"`); the `bookings` row is unchanged
**Traces**: contract (§3.6.3, "`04` Invalid amount — vnp_Amount does not match payments.amount")
**Check**: fetch_url

---

**Scenario**: VNPay's own unlisted query parameters on the IPN are never rejected as malformed
**Given**: A `payments` row `status = "pending"`
**When**: `POST /v1/payments/vnpay/ipn` is called with a verifying hash plus extra `vnp_*` fields this contract's document does not individually enumerate (VNPay's own full parameter set)
**Then**: Response is `200`, not `400`; the request is processed per the matching `vnp_ResponseCode` rule, not rejected for an undefined field
**Traces**: contract (§3.6.3, "every vnp_* field VNPay sends, accepted as-is … the per-skill exception to §2.5")
**Check**: fetch_url

---

**Scenario**: `VNPAY_HASH_SECRET` is never present in a response
**Given**: Any of the checkout-initiation or IPN calls above, successful or failed
**When**: The response body and headers are inspected
**Then**: Neither the literal `VNPAY_HASH_SECRET` value nor any field named `hash_secret`/similar appears anywhere in the response body or headers
**Traces**: SRS §6 NFR ("VNPAY_HASH_SECRET is read only server-side … never logged, returned to the client")
**Check**: fetch_url


---

**Scenario**: Initiating payment while the database is unreachable
**Given**: A valid `bookings` row in `Awaiting Payment`, owned by the signed-in Buyer, the database made unreachable (dependency refuses the connection)
**When**: `POST /v1/bookings/{id}/checkout/vnpay` is sent with a valid `Idempotency-Key`
**Then**: Response is `503` with `error.code = "UNAVAILABLE"`; no `payments` row is created
**Traces**: contract (§2.3, `UNAVAILABLE` — "a dependency … refused the connection")
**Check**: fetch_url

---

**Scenario**: A store failure on the IPN write path is reported as INTERNAL, not swallowed
**Given**: A `payments` row `status = "pending"` for a verifying callback, the underlying query for the booking/payment write made to fail (e.g. the target column renamed) while the database itself still accepts connections
**When**: `POST /v1/payments/vnpay/ipn` is called with a verifying hash and `vnp_ResponseCode = "00"`
**Then**: Response is `200` with body `{ "RspCode": "99", "Message": "..." }` (VNPay's own contract keeps the HTTP layer at 200 and reports failure via `RspCode`, per §3.6.3's "99 Unknown error — any other failure (e.g. database unreachable)"); the `payments` row stays `status = "pending"`; the `bookings` row is unchanged
**Traces**: contract (§3.6.3, "`99` Unknown error")
**Check**: manual — no tool available to this role can rename a column or otherwise force a query failure distinct from an unreachable database; the dependency-unreachable case above is covered by `fetch_url` with the database taken down instead
