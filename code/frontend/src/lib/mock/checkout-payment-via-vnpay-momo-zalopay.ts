/**
 * Checkout payment via VNPay MoMo ZaloPay — mock only, deleted once the
 * backend's POST /v1/bookings/{id}/checkout/vnpay and the IPN callback land
 * (docs/architecture/services.md §3.6.1-§3.6.4). Stands in for the whole
 * round trip: initiation + VNPay's own redirect + the verified callback.
 */

export interface PaymentMethod {
  id: "vnpay" | "momo" | "zalopay" | "vietqr";
  label: string;
  enabled: boolean;
}

export const PAYMENT_METHODS: PaymentMethod[] = [
  { id: "vnpay", label: "VNPay", enabled: true },
  { id: "momo", label: "MoMo", enabled: false },
  { id: "zalopay", label: "ZaloPay", enabled: false },
  { id: "vietqr", label: "Bank transfer / VietQR", enabled: false },
];

/**
 * Stands in for POST /v1/bookings/{id}/checkout/vnpay, VNPay's own redirect,
 * and the verified success IPN together — the real flow splits across a
 * server call and VNPay's own page, which this mock has no way to visit.
 * Always resolves with a booking code: the failed state this story draws is
 * reached by landing on /checkout/:id?payment=failed, the address the
 * backend's callback redirects to on a real decline — not by a page toggle.
 */
export async function payWithVnpay(code: string): Promise<{ code: string }> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return { code };
}
