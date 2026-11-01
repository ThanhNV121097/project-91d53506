# Brief coverage

One row per line under WHAT IT MUST DO and WHAT THE FEATURES NEED, quoted
as the brief wrote it, mapped to the requirement ids that meet it.

| Brief line | Requirement ids |
|---|---|
| show what is offered — the menu, the products, the services — with prices | SITE-001, SITE-002, DATA-002, DATA-003 |
| articles or posts, with categories and an archive | SITE-004 |
| a schedule or programme, with the people in it | SITE-003, SUPPLIERS-004 |
| booking: pick a service, a time and a person or place, and book it | BOOKING-001 |
| online payment | PAYMENTS-001, PAYMENTS-002 |
| sign-up and sign-in, with each user's own account | AUTH-001, AUTH-002, AUTH-003, AUTH-004, AUTH-005 |
| a dashboard: figures and charts at a glance | SUPPLIERS-007, ADMIN-001 (Overview) |
| tables of records to search, filter, add to, edit and export | SUPPLIERS-002, SUPPLIERS-005, ADMIN-003, ADMIN-004 |
| an admin area where the owner manages the content and the records | ADMIN-001, ADMIN-002, ADMIN-003, ADMIN-004, ADMIN-005, ADMIN-006, ADMIN-007 |
| search across the site, with filters | SEARCH-001 |
| a way to call or message | SITE-005, CONTACT-001 |
| Map view of product locations | SITE-003 (search map panel, built by `site`) |
| Reviews and ratings | SITE-002, SUPPLIERS-006B, ADMIN-002 |
| Discount codes and vouchers | BOOKING-002 |
| Booking confirmation via Email/Zalo with QR | BOOKING-003, NOTIF-001 |
| Booking history & status tracking | ACCOUNT-001 |
| Cancellation/rescheduling & refund requests | BOOKING-004, ADMIN-004 |
| Wishlist | ACCOUNT-002 |
| Supplier registration & document verification | SUPPLIERS-001, SUPPLIERS-006 |
| Supplier bank account setup | SUPPLIERS-001 |
| Product approval workflow (draft/pending/approved) | SUPPLIERS-002, ADMIN-001 |
| Date-based/seasonal pricing rules | SUPPLIERS-004 |
| Guest check-in via QR code | SUPPLIERS-005 (not applicable row: not drawn in the approved design beyond a "Check in" button) |
| Responding to guest reviews | SUPPLIERS-006B |
| Review moderation | ADMIN-002 |
| Sub-admin roles & permissions | AUTH-005, ADMIN-003 |
| Complaint handling & manual refunds | ADMIN-004, BOOKING-004 |
| Commission rate configuration | ADMIN-005 |
| Payout reconciliation | ADMIN-005, SUPPLIERS-007 |
| Marketing campaigns management | ADMIN-006 (campaigns table read/edited via `/admin/content`; no dedicated requirement beyond ADMIN-006's categories/destinations scope — see open question below) |
| Policy/T&C/email template configuration | ADMIN-007 |
| Audit logs | ADMIN-007 |
| Notifications (Email/Zalo OA/in-app) | NOTIF-001 |
| Inventory hold during checkout | BOOKING-001 |
| Image upload with compression & CDN | SUPPLIERS-006 |
| SEO (meta tags, sitemaps, SSR) | SITE-006 (meta tags); sitemap and SSR deferred per SITE's open question in §7 |

Note: "Marketing campaigns management" is only partially covered —
`AdminContent.tsx` draws a campaigns table but `admin/SRS.md`'s ADMIN-006
specifies categories/destinations only. Campaigns management beyond
display is not required by any plan item; this gap is flagged rather than
invented, consistent with "a line you cannot fill is still built."
