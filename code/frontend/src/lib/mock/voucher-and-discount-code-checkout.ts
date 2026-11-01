/**
 * Validates a discount code against the `vouchers` collection and computes
 * the amount it takes off — BOOKING-002. Active, `used < limit`, not expired
 * applies; anything else is rejected naming why. Deleted once the real
 * `POST /v1/bookings/{id}/voucher` endpoint exists.
 */
import type { Row } from "../../data";

export type VoucherRejection = "NOT_FOUND" | "EXPIRED" | "OVER_LIMIT" | "INACTIVE";

export interface VoucherResult {
  ok: boolean;
  voucher?: Row;
  amount: number;
  rejection?: VoucherRejection;
}

/** "10%" off a base amount, or "150.000 ₫ off" as a fixed amount. */
function discountOf(voucher: Row, base: number): number {
  const text = String(voucher.discount ?? "");
  const percent = /^(\d+(?:\.\d+)?)\s*%/.exec(text);
  if (percent) return Math.round(base * (Number(percent[1]) / 100));
  const amount = /([\d.]+)\s*₫/.exec(text);
  if (amount) return Math.round(Number(amount[1].replace(/\./g, "")));
  return 0;
}

/** Looks up `code` (case-insensitive) in `vouchers` and validates it against `base`, the total before this discount. */
export function checkVoucher(code: string, vouchers: Row[], base: number): VoucherResult {
  const voucher = vouchers.find((v) => String(v.code ?? "").toLowerCase() === code.trim().toLowerCase());
  if (!voucher) return { ok: false, amount: 0, rejection: "NOT_FOUND" };
  if (voucher.status !== "Active") return { ok: false, voucher, amount: 0, rejection: "INACTIVE" };
  const used = Number(voucher.used ?? 0);
  const limit = Number(voucher.limit ?? 0);
  if (used >= limit) return { ok: false, voucher, amount: 0, rejection: "OVER_LIMIT" };
  const expires = String(voucher.expires ?? "");
  if (expires && new Date(expires).getTime() < Date.now()) return { ok: false, voucher, amount: 0, rejection: "EXPIRED" };
  return { ok: true, voucher, amount: discountOf(voucher, base) };
}
