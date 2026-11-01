/**
 * The booking a visitor is building, in this browser only — the backend owns
 * it later. Holds the 15-minute inventory hold the brief asks for, the
 * traveller details, the voucher and the payment method, and mints the
 * booking code the confirmation shows.
 */
export interface Draft {
  productId: string;
  date: string;
  adults: number;
  children: number;
  pack: string;
  name: string;
  phone: string;
  email: string;
  note: string;
  voucher: string;
  payment: string;
  code: string;
  heldUntil: number;
}

const KEY = "nad:draft";
export const HOLD_MINUTES = 15;

export const PACKS: { id: string; label: string; extra: number }[] = [
  { id: "standard", label: "Standard", extra: 0 },
  { id: "private", label: "Private group", extra: 400000 },
  { id: "pickup", label: "With hotel pick-up", extra: 150000 },
];

/** The codes a voucher in src/data/vouchers.json stands for, as a fraction off. */
export const DISCOUNTS: Record<string, number> = { CUALO10: 0.1, GROUP5: 0.05 };

export function emptyDraft(productId: string, date = ""): Draft {
  return {
    productId, date, adults: 2, children: 0, pack: "standard",
    name: "", phone: "", email: "", note: "", voucher: "", payment: "vnpay",
    code: "", heldUntil: Date.now() + HOLD_MINUTES * 60000,
  };
}

export function readDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

export function writeDraft(draft: Draft): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    /* a private window: the draft lasts this page */
  }
}

/** NA-7X42K9: the code on the confirmation, the QR and the check-in list. */
export function newCode(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i += 1) out += letters[Math.floor(Math.random() * letters.length)];
  return `NA-${out}`;
}

export function total(price: number, draft: Pick<Draft, "adults" | "children" | "pack" | "voucher">): {
  subtotal: number; extra: number; discount: number; due: number;
} {
  const pack = PACKS.find((p) => p.id === draft.pack) ?? PACKS[0];
  const subtotal = price * draft.adults + Math.round(price * 0.5) * draft.children;
  const extra = pack.extra;
  const rate = DISCOUNTS[draft.voucher.trim().toUpperCase()] ?? 0;
  const discount = Math.round((subtotal + extra) * rate);
  return { subtotal, extra, discount, due: subtotal + extra - discount };
}

export const PAYMENTS: { id: string; label: string }[] = [
  { id: "vnpay", label: "VNPay" },
  { id: "momo", label: "MoMo" },
  { id: "zalopay", label: "ZaloPay" },
  { id: "vietqr", label: "Bank transfer / VietQR" },
];

/** Seats left for the picked date: the matching departure row, else the product's own `seats`. */
export function seatsRemaining(
  dates: readonly { date: string; seats: number }[],
  date: string,
  fallback: number,
): number {
  return dates.find((d) => d.date === date)?.seats ?? fallback;
}

/** Which required traveller fields are blank — the backend's own check, mirrored here (BOOKING-001 SC-7). */
export function missingFields(draft: Pick<Draft, "name" | "phone" | "email">): Record<string, boolean> {
  return { name: !draft.name.trim(), phone: !draft.phone.trim(), email: !draft.email.trim() };
}
