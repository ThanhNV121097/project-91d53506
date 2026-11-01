/**
 * Mock for GET /v1/admin/notifications, per docs/notifications/SRS.md
 * NOTIF-001 and the ERD's `notifications` table (erd.md §3.18). The UI
 * screen itself is the existing `/admin/system` notifications table
 * (AdminSystem.tsx), already built and reading the `notifications`
 * collection — no new screen, no new component for this story (SRS §5:
 * one screen, one state, "default").
 *
 * docs/architecture/services.md does not yet define a §3.7.1 contract for
 * this read endpoint (only the test cases reference it) — this mock
 * follows the ERD's column shape (event, channel, template, status) that
 * AdminSystem.tsx and src/data/notifications.json already use, so the
 * backend stage has a one-file contract to replace once services.md
 * settles the exact envelope. Nothing in the app imports this file yet.
 */

export interface NotificationRow {
  id: string;
  event: string;
  channel: "Email" | "Zalo" | "Dashboard";
  template: string;
  status: "pending" | "sent" | "failed";
}

export const SAMPLE_NOTIFICATIONS: NotificationRow[] = [
  { id: "1", event: "booking.confirmed:NA-5QJ81M", channel: "Email", template: "booking-confirmed", status: "sent" },
  { id: "2", event: "booking.confirmed:NA-5QJ81M", channel: "Zalo", template: "booking-confirmed", status: "sent" },
  { id: "3", event: "booking.confirmed:NA-5QJ81M", channel: "Dashboard", template: "booking-confirmed", status: "sent" },
  { id: "4", event: "product.rejected:P-102", channel: "Email", template: "product-rejected", status: "failed" },
];
