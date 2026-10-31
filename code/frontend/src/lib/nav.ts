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
    { to: "/admin/queue", label: "Approval queue", badge: 2 },
    { to: "/admin/moderation", label: "Reviews" },
  ] },
  { heading: "Operations", items: [
    { to: "/admin/bookings", label: "Bookings & disputes" },
    { to: "/admin/users", label: "Users & roles" },
  ] },
  { heading: "Money", items: [
    { to: "/admin/finance", label: "Finance" },
  ] },
  { heading: "Platform", items: [
    { to: "/admin/content", label: "Content & marketing" },
    { to: "/admin/system", label: "System" },
  ] },
];
