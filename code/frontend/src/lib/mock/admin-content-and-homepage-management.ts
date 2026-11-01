import { collections, setCollection, type Row } from "../../data";

/**
 * Local edits to destinations/categories, mirrored into the shared data
 * store the same way the Studio's own edits are (setCollection). Deleted
 * once the backend lands — PATCH/POST/DELETE /v1/admin/destinations and
 * /v1/admin/categories replace every call here (services.md §3.9.18/19).
 */
function rowsOf(name: string): Row[] {
  return collections()[name] ?? [];
}

export function updateDestination(id: string, patch: Partial<Row>): void {
  setCollection("destinations", rowsOf("destinations").map((r) => (r.id === id ? { ...r, ...patch } : r)));
}

export function removeDestination(id: string): void {
  setCollection("destinations", rowsOf("destinations").filter((r) => r.id !== id));
}

export function addCategory(name: string, icon = "tag"): void {
  const id = name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `category-${Date.now()}`;
  setCollection("categories", [...rowsOf("categories"), { id, name: name.trim(), icon, _source: "owner" }]);
}
