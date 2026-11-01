/**
 * The signed-in Buyer's own bookings, every state the status machine holds.
 * Stands in for `GET /v1/account/bookings` (buyer-scoped, server-filtered).
 * Deleted once that endpoint exists — see docs/account/test-cases/
 * buyer-booking-history-and-status.md for the contract this mock follows.
 */
import type { Booking } from "../trips";

export const MY_BOOKINGS: Booking[] = [
  { id: "b-01", code: "NA-7X42K9", product_name: "Cửa Lò beach break, 2 days 1 night", customer: "", supplier_name: "Cửa Lò Beach Stays", date: "2026-11-14", travellers: 3, total: 4625000, status: "Paid", payment: "VNPay", created: "2026-10-28", image: "/images/p-family-beach.jpg" },
  { id: "b-02", code: "NA-5QJ81M", product_name: "Thanh Chương tea hills at dawn", customer: "", supplier_name: "Thanh Chương Tea Walks", date: "2026-11-09", travellers: 2, total: 700000, status: "Confirmed", payment: "MoMo", created: "2026-10-26", image: "/images/p-tea-walk.jpg" },
  { id: "b-03", code: "NA-2PD40C", product_name: "Pù Mát by boat and jeep, 2 days", customer: "", supplier_name: "Pù Mát Boat & Jeep", date: "2026-11-13", travellers: 4, total: 6600000, status: "Awaiting payment", payment: "VietQR", created: "2026-10-30", image: "/images/p-river.jpg" },
  { id: "b-04", code: "NA-9HT63B", product_name: "Kim Liên village, half day", customer: "", supplier_name: "Kim Liên Heritage Guides", date: "2026-10-24", travellers: 2, total: 840000, status: "Completed", payment: "ZaloPay", created: "2026-10-11", image: "/images/p-village.jpg" },
  { id: "b-06", code: "NA-3KF95R", product_name: "Khe Kèm waterfall trek", customer: "", supplier_name: "Pù Mát Boat & Jeep", date: "2026-10-18", travellers: 2, total: 1300000, status: "Refunded", payment: "VNPay", created: "2026-10-02", image: "/images/p-waterfall.jpg" },
  { id: "b-08", code: "NA-4RN72T", product_name: "Cửa Lò seafood night walk", customer: "", supplier_name: "Cửa Lò Beach Stays", date: "2026-11-08", travellers: 5, total: 1450000, status: "Cancelled", payment: "VNPay", created: "2026-10-19", image: "/images/p-seafood-night.jpg" },
];
