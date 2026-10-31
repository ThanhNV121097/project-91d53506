import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { NavLink } from "react-router-dom";
import { allowed, useSession } from "../lib/session";
import MenuToggle from "./MenuToggle";

/**
 * The shell every page of a CMS sits in: a menu down the left, the work on
 * the right.
 *
 * A dashboard is not a page of the website with a table on it. The person in
 * it is working, not visiting: they move between areas all day, so the areas
 * are always on the screen; they read rows, so the content is dense; they
 * never want a hero, a marketing header or a footer of links to the blog.
 *
 *   <DashboardLayout
 *     title="Products"
 *     nav={[
 *       { heading: "Selling", items: [
 *         { to: "/supplier/products", label: "Products" },
 *         { to: "/supplier/calendar", label: "Dates & places" },
 *       ]},
 *       { heading: "Money", items: [{ to: "/supplier/payouts", label: "Payouts" }] },
 *       { items: [{ to: "/admin/queue", label: "Awaiting review", roles: ["admin"] }] },
 *     ]}
 *     actions={<button className="…">New product</button>}
 *   >
 *     …filters and the table…
 *   </DashboardLayout>
 *
 * An item with `roles` is shown only to those roles — a supplier never sees
 * the admin's queue in the menu. Hiding it is not the gate: the PAGE is
 * gated with <RequireRole>, because a menu the eye cannot see is still a URL
 * anyone can type.
 *
 * Below 1024px the menu becomes a drawer behind one button, drawn through a
 * portal for the reason MobileMenu gives.
 */
export interface NavItem {
  to: string;
  label: string;
  /** A count beside the item — things waiting, unread. */
  badge?: number;
  /** Which roles see it. Everyone signed in when not given. */
  roles?: readonly string[];
}

export interface NavGroup {
  heading?: string;
  items: readonly NavItem[];
}

export default function DashboardLayout({ title, nav, actions, children, brand }: {
  title: string;
  nav: readonly NavGroup[];
  /** The buttons for this page — "New product", "Export". */
  actions?: ReactNode;
  children: ReactNode;
  /** What stands at the top of the menu. The site's name when not given. */
  brand?: ReactNode;
}) {
  const session = useSession();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const groups = nav
    .map((g) => ({ ...g, items: g.items.filter((i) => allowed(session, i.roles) || !i.roles) }))
    .filter((g) => g.items.length > 0);

  const menu = (
    <nav aria-label="Sections" className="flex flex-col gap-6 p-4">
      <div className="px-2 text-sm font-medium text-ink">{brand}</div>
      {groups.map((g, i) => (
        <div key={g.heading ?? `group-${i}`} className="flex flex-col gap-1">
          {g.heading && <p className="px-2 text-xs uppercase tracking-wider text-ink-soft">{g.heading}</p>}
          {g.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between gap-2 rounded px-2 py-2 text-sm ${isActive ? "bg-accent text-accent-ink" : "text-ink hover:bg-ground"}`
              }
            >
              <span>{item.label}</span>
              {item.badge ? <span className="rounded-[var(--radius-pill)] border border-line px-1.5 text-xs">{item.badge}</span> : null}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );

  return (
    <div data-dashboard="true" className="flex min-h-screen bg-ground text-ink">
      <aside className="hidden w-64 shrink-0 border-r border-line bg-surface lg:block">
        <div className="sticky top-0 max-h-screen overflow-y-auto">{menu}</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-line bg-surface px-[var(--gutter)] py-3">
          <MenuToggle open={open} onToggle={() => setOpen((o) => !o)} className="lg:hidden" />
          <h1 className="min-w-0 flex-1 truncate font-display text-xl text-ink">{title}</h1>
          {actions}
          {session && (
            <span className="hidden text-sm text-ink-soft sm:inline">
              {session.name}
              {session.role ? ` · ${session.role}` : ""}
            </span>
          )}
        </header>
        <main className="flex min-w-0 flex-1 flex-col gap-4 px-[var(--gutter)] py-6">{children}</main>
      </div>

      {open && typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[60] lg:hidden">
            <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="absolute inset-0 bg-ink/40" />
            <div className="absolute inset-y-0 left-0 w-64 overflow-y-auto border-r border-line bg-surface">{menu}</div>
          </div>,
          document.body,
        )}
    </div>
  );
}
