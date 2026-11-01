import type { Row } from "../../data";

/**
 * The closed set of scoped roles a sub-admin can be created with — per
 * `docs/architecture/services.md` §3.9.9. Deleted once the real
 * `POST /v1/admin/users/sub-admins` endpoint exists.
 */
export const PERMISSIONS: { value: string; label: string }[] = [
  { value: "moderation-only", label: "Moderation only" },
  { value: "finance-only", label: "Finance only" },
  { value: "content-only", label: "Content only" },
  { value: "users-only", label: "Users only" },
];

/** A new `users` row for a sub-admin, shaped like the API will return it. */
export function newSubAdmin(name: string, email: string, permissions: string): Row {
  return {
    id: `u-${Date.now()}`,
    name,
    email,
    role: "Admin",
    permissions,
    status: "Active",
    joined: new Date().toISOString().slice(0, 10),
    _source: "assumed",
  };
}
