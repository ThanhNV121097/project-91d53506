/**
 * Mock for Buyer cancellation and refund requests (BOOKING-004). Mirrors the
 * `complaints` collection's shape (see docs/architecture/erd.md §3.15) — this
 * module is deleted once POST /v1/bookings/{id}/complaints exists.
 */
export interface CancelRequest {
  id: string;
  bookingCode: string;
  issue: string;
  refundRequested?: number;
  status: "Open" | "Resolved" | "Refunded";
  openedAt: string;
}

let store: CancelRequest[] = [
  { id: "cp-01", bookingCode: "NA-3KF95R", issue: "Trek cancelled by the operator for weather", refundRequested: 1300000, status: "Refunded", openedAt: "2026-10-16" },
  { id: "cp-02", bookingCode: "NA-4RN72T", issue: "Traveller cancelled, asking for a refund", refundRequested: 1450000, status: "Open", openedAt: "2026-10-22" },
];

/** The open-or-resolved request against one booking, if any exists. */
export function requestForBooking(bookingCode: string): CancelRequest | undefined {
  return store.find((r) => r.bookingCode === bookingCode);
}

/**
 * Creates the Buyer's request. Never changes the booking's own status —
 * that stays with admin manual refunds (BOOKING-004 AC-2).
 */
export function createRequest(bookingCode: string, issue: string): CancelRequest {
  const req: CancelRequest = {
    id: `cp-${Date.now()}`, bookingCode, issue, status: "Open",
    openedAt: new Date().toISOString().slice(0, 10),
  };
  store = [req, ...store];
  return req;
}
