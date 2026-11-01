/**
 * Mock write-side for SUPPLIERS-004 (departure dates, capacity, seasonal
 * pricing, blocking). Reads/writes the same in-browser `departures` store
 * every other screen reads through src/data — swapping this for
 * POST /v1/supplier/products/{id}/departures and
 * PATCH /v1/supplier/departures/{id} (docs/architecture/services.md
 * §3.8.6–7) is a one-file change. Not reviewed, not polished, deleted when
 * the backend lands.
 */
import { collections, setCollection, type Row } from "../../data";
import type { Departure } from "../trips";

export const SEASONS = ["Standard", "Weekend", "Holiday", "Peak summer"] as const;

function rows(): Departure[] {
  return (collections().departures ?? []) as unknown as Departure[];
}

export interface DepartureInput {
  date: string;
  capacity: number;
  price?: number;
  season?: string;
}

export type Result = { ok: true } | { ok: false; error: string };

/** SUPPLIERS-004 AC-1 / failure-table "Invalid input" and the uq_departures_product_date conflict. */
export function addDeparture(
  product: { id: string; name: string; supplier: string; supplierName: string; basePrice: number },
  input: DepartureInput,
): Result {
  if (!input.date) return { ok: false, error: "Pick a date." };
  if (!Number.isFinite(input.capacity) || input.capacity <= 0) {
    return { ok: false, error: "Capacity must be at least 1." };
  }
  const all = rows();
  if (all.some((d) => d.product === product.id && d.date === input.date)) {
    return { ok: false, error: "This product already has a departure on that date." };
  }
  const row: Departure = {
    id: `d-${Date.now()}`,
    product: product.id,
    product_name: product.name,
    supplier: product.supplier,
    supplier_name: product.supplierName,
    date: input.date,
    capacity: input.capacity,
    seats: input.capacity,
    price: input.price ?? product.basePrice,
    season: input.season ?? "Standard",
    state: "Open",
  };
  setCollection("departures", [...all, row] as unknown as Row[]);
  return { ok: true };
}

/** SUPPLIERS-004 AC-2/AC-3 and the boundary row: capacity never drops below seats already committed. */
export function patchDeparture(id: string, patch: Partial<Pick<Departure, "price" | "season" | "state" | "capacity">>): Result {
  const all = rows();
  const row = all.find((d) => d.id === id);
  if (!row) return { ok: false, error: "Departure not found." };
  if (patch.capacity !== undefined) {
    if (patch.capacity <= 0) return { ok: false, error: "Capacity must be at least 1." };
    const committed = row.capacity - row.seats;
    if (patch.capacity < committed) return { ok: false, error: "Capacity cannot go below the seats already booked." };
  }
  const next = all.map((d) => {
    if (d.id !== id) return d;
    const capacity = patch.capacity ?? d.capacity;
    const seats = patch.capacity !== undefined ? capacity - (d.capacity - d.seats) : d.seats;
    return { ...d, ...patch, capacity, seats };
  });
  setCollection("departures", next as unknown as Row[]);
  return { ok: true };
}
