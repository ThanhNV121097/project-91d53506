import { type ReactNode } from "react";
import { allowed, hasPermission, useSession } from "../lib/session";

/**
 * The one way an area of the site is kept to the roles it belongs to.
 *
 * A site with more than one kind of person signing in — a buyer and a
 * supplier, a member and an admin — has pages that are not everybody's. A
 * supplier's products, a supplier's payouts, an admin's approval queue: a
 * buyer who opens one must be told no, and so must a visitor with no role at
 * all.
 *
 * Nothing about that is visible in a screenshot, which is why it is a
 * component and not advice. Wrap the page:
 *
 *   <RequireRole roles={["supplier"]}>
 *     <SupplierProducts />
 *   </RequireRole>
 *
 * and say the same thing in design/pages.json:
 *
 *   {"path": "/supplier/products", "name": "Products", "auth": true, "roles": ["supplier"]}
 *
 * The walk reads that list, opens the page as somebody else, and reports it
 * if the page draws anyway (`role-leak`). The two have to agree: a page
 * gated here and not listed there is never checked, and a page listed there
 * and not gated here is reported.
 *
 * This is the design's mock, not security. The backend repeats every one of
 * these checks on the server once the site is built — a gate in the browser
 * is a courtesy to the person, never a defence against them.
 */
export default function RequireRole({ roles, permission, children, fallback }: {
  roles: readonly string[];
  /** The sub-admin permission section this page belongs to. No restriction when not given. */
  permission?: string;
  children: ReactNode;
  /** What to show instead. The default says who the area belongs to. */
  fallback?: ReactNode;
}) {
  const session = useSession();
  if (allowed(session, roles) && hasPermission(session, permission)) return <>{children}</>;
  if (fallback !== undefined) return <>{fallback}</>;
  return (
    <div className="mx-auto flex max-w-page flex-col items-start gap-3 px-[var(--gutter)] py-16">
      <h1 className="font-display text-3xl text-ink">You do not have access to this area</h1>
      <p className="max-w-[48ch] text-ink-soft">
        {session
          ? `This area is for ${list(roles)}. Your account is signed in as ${session.role || "a visitor"}.`
          : `This area is for ${list(roles)}. Sign in with an account that has access.`}
      </p>
    </div>
  );
}

/** "suppliers and admins" — the roles in a line a person reads. */
function list(roles: readonly string[]): string {
  const names = roles.map((r) => r.trim()).filter(Boolean);
  if (names.length === 0) return "signed-in visitors";
  if (names.length === 1) return `${names[0]}s`;
  return `${names.slice(0, -1).map((n) => `${n}s`).join(", ")} and ${names[names.length - 1]}s`;
}
