import type { ProductFormValues } from "../../components/ProductForm";

/**
 * The product's approval state machine (docs/suppliers/SRS.md §4.2, §4.3),
 * worked out client-side against mock data. `POST /v1/supplier/products`,
 * `PATCH /v1/supplier/products/{id}` (action: submit/pause/unpause) replace
 * these three functions one for one once the backend lands.
 */

/** Fields whose change on an approved product returns it to pending (SUPPLIERS-002.3). */
const CONTENT_FIELDS: (keyof ProductFormValues)[] = ["name", "summary", "itinerary", "price", "policy"];

function contentChanged(a: ProductFormValues, b: ProductFormValues): boolean {
  return CONTENT_FIELDS.some((f) => a[f] !== b[f]);
}

/** Saving as a draft (the full-form write): an approved product whose price or content changed returns to pending. */
export function nextOnSave(status: string, initial: ProductFormValues, values: ProductFormValues): string {
  if (status === "approved" && contentChanged(initial, values)) return "pending";
  return status;
}

/** Submitting for approval: requires a price (SUPPLIERS-002 "Invalid input"); otherwise moves to pending. */
export function nextOnSubmit(status: string, price: string): { status: string; error?: string } {
  const n = Number(price);
  if (!price || !Number.isFinite(n) || n <= 0) return { status, error: "Enter a price before submitting." };
  return { status: "pending" };
}

/** The dedicated pause/unpause action (SUPPLIERS-003): approved ↔ suspended, never through pending. */
export function nextOnPauseToggle(status: string): string {
  if (status === "approved") return "suspended";
  if (status === "suspended") return "approved";
  return status;
}
