import { collections, setCollection, type Row } from "../../data";

/**
 * Supplier review replies — the one write this story needs: set `reply` on a
 * review belonging to one of the supplier's own products.
 *
 * Mock only. Deleted once `POST /v1/supplier/reviews/{id}/reply`
 * (services.md §3.8.12) exists — the backend story replaces this file.
 */
export function publishReply(id: string, reply: string): void {
  const rows = (collections().reviews ?? []) as Row[];
  setCollection("reviews", rows.map((r) => (r.id === id ? { ...r, reply } : r)));
}
