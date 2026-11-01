import type { NavGroup } from "../components/DashboardLayout";

export const SUPPLIER_NAV: readonly NavGroup[] = [
  { heading: "Selling", items: [
    { to: "/supplier", label: "Overview" },
    { to: "/supplier/products", label: "Products" },
    { to: "/supplier/bookings", label: "Bookings" },
  ] },
  { heading: "Guests", items: [
    { to: "/supplier/reviews", label: "Reviews" },
  ] },
  { heading: "Account", items: [
    { to: "/supplier/account", label: "Profile & payouts" },
  ] },
];

export const ADMIN_NAV: readonly NavGroup[] = [
  { heading: "Moderation", items: [
    { to: "/admin", label: "Overview" },
    { to: "/admin/queue", label: "Approval queue", badge: 2, permission: "moderation-only" },
    { to: "/admin/moderation", label: "Reviews", permission: "moderation-only" },
  ] },
  { heading: "Operations", items: [
    { to: "/admin/bookings", label: "Bookings & disputes", permission: "finance-only" },
    { to: "/admin/users", label: "Users & roles", permission: "users-only" },
  ] },
  { heading: "Money", items: [
    { to: "/admin/finance", label: "Finance", permission: "finance-only" },
  ] },
  { heading: "Platform", items: [
    { to: "/admin/content", label: "Content & marketing", permission: "content-only" },
    { to: "/admin/system", label: "System" },
  ] },
];
