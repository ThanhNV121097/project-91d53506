/**
 * /search's own filtering (SEARCH-001): narrows `products` by destination,
 * kind, duration and price as the page already did, and — when a travel
 * date is asked for — by real availability in `departures`, not just the
 * product's static fields. Mirrors the shape the backend's eventual
 * GET /v1/search join will return (docs/architecture/services.md §3.4.1):
 * a product with no open, big-enough departure on that date is excluded
 * even though its own destination/kind/price match.
 *
 * Deleted once that endpoint exists — Search.tsx then reads its response
 * instead of joining src/data/products.json and src/data/departures.json
 * itself.
 */
import type { Trip, Departure } from "../trips";

export interface SearchCriteria {
  where?: string;
  kind?: string;
  duration?: string;
  max?: number;
  date?: string;
  people?: number;
}

function fold(v: string): string {
  return v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** The departure a search date resolves to for one product, if any. */
export function matchingDeparture(productId: string, date: string, departures: readonly Departure[]): Departure | undefined {
  return departures.find((d) => d.product === productId && d.date === date);
}

/**
 * Trips matching the search criteria. When `date` is given, a product is
 * included only if it has an `Open` departure that date with seats enough
 * for `people` (SEARCH-001 AC-1–AC-3); the price ceiling then checks that
 * departure's own price, not the product's base price (AC-4). With no
 * date, filtering is on the product's own fields, unchanged (AC-5).
 */
export function searchTrips(criteria: SearchCriteria, products: readonly Trip[], departures: readonly Departure[]): Trip[] {
  const people = criteria.people && criteria.people > 0 ? criteria.people : 1;
  return products.filter((p) => {
    if (p.status !== "approved") return false;
    if (criteria.where && fold(p.destination) !== fold(criteria.where)) return false;
    if (criteria.kind && p.kind !== criteria.kind) return false;
    if (criteria.duration && p.duration !== criteria.duration) return false;

    let price = p.price;
    if (criteria.date) {
      const dep = matchingDeparture(p.id, criteria.date, departures);
      if (!dep || dep.state !== "Open" || dep.seats < people) return false;
      price = dep.price;
    }
    if (criteria.max !== undefined && price > criteria.max) return false;
    return true;
  });
}

/** The same three orderings Search.tsx's own Select already offers. */
export function sortTrips(items: readonly Trip[], sort: string): Trip[] {
  if (sort === "-price") return [...items].sort((a, b) => b.price - a.price);
  if (sort === "next_date") return [...items].sort((a, b) => a.next_date.localeCompare(b.next_date));
  return [...items].sort((a, b) => a.price - b.price);
}
