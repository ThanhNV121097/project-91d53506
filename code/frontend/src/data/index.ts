/**
 * The site's records — products, categories, a menu, branches, the team —
 * one JSON file per kind in this folder, described in schema.json. Words
 * that are not records stay in content.json.
 *
 * Components read records ONLY through these hooks, never by importing a
 * JSON file: in the design they read the files here; once the site has a
 * backend, this one module is rewritten to call its API — base
 * import.meta.env.VITE_API_URL ?? "/api";
 * GET <base>/v1/<name>?page=&limit=&sort=&q=&<field>=<value> → { items, total, page, limit }
 *   — <field>=a,b is "any of"; <field>_from / <field>_to is a range; sort is
 *   "price" or "-created_at". A CMS list is a page of a table, so the backend
 *   answers a page, not a window: `total` is every match;
 * GET <base>/v1/<name>/<id> → the record — and the JSON files are deleted. The
 * components, their paging and their loading states stay exactly as they are,
 * and so does useCollection's return: `items` (the pages loaded) and `total`
 * (every match, for "24 products").
 */
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import schemaFile from "./schema.json";

/** Where a record came from: the owner's own data, a page on the web, or an assumption. */
export type Source = "owner" | "assumed" | `web:${string}`;

export interface Row {
  id: string;
  _source?: Source;
  [field: string]: unknown;
}

export interface Field {
  key: string;
  label?: string;
  /** text | longtext | number | price | image | url | bool | ref:<collection> | list */
  type: string;
  currency?: string;
}

export interface Collection {
  label?: string;
  fields: Field[];
}

export const schema = schemaFile as { collections: Record<string, Collection> };

const files = import.meta.glob<{ default: Row[] }>(["./*.json", "!./schema.json"], { eager: true });

let store: Record<string, Row[]> = {};
for (const [path, mod] of Object.entries(files)) {
  store[path.slice(2, -5)] = mod.default;
}
const listeners = new Set<() => void>();

/** The Studio's unsaved edits, shown live in its frame. */
export function setCollection(name: string, rows: Row[]) {
  store = { ...store, [name]: rows };
  listeners.forEach((l) => l());
}

export function collections(): Record<string, Row[]> {
  return store;
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

function useRows(name: string): Row[] {
  return useSyncExternalStore(subscribe, () => store[name] ?? EMPTY);
}
const EMPTY: Row[] = [];

/**
 * One condition on a field. A plain value is an exact match; a list is "any
 * of" (a status filter with three boxes ticked); a range is from/to
 * inclusive, for dates and prices.
 *
 * An empty value — "", an empty list, a range with neither end — filters
 * nothing. A filter the person has not set yet must not empty the table.
 */
export type Filter =
  | string
  | number
  | boolean
  | readonly (string | number)[]
  | { from?: string | number; to?: string | number };

export interface Query {
  /** Records whose field matches, e.g. { category: "iphone", status: ["pending", "rejected"] }. */
  where?: Record<string, Filter | undefined>;
  /** Free text, matched against `search` fields — accents and case ignored. */
  q?: string;
  /** Which fields `q` searches. Every text field when not given. */
  search?: readonly string[];
  /** "price" ascending, "-created_at" descending. */
  sort?: string;
  /**
   * The page to return, 1-based. Given, `items` is THAT page alone — the
   * shape a table needs. Left out, `items` grows with loadMore(), which is
   * what a catalogue's "Show more" needs.
   */
  page?: number;
  /** How many a page holds. */
  pageSize?: number;
}

/** Lowercased and stripped of accents, so "Cửa Lò" is found by "cua lo". */
function fold(v: unknown): string {
  return String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function empty(v: Filter | undefined): boolean {
  if (v === undefined || v === null || v === "") return true;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") {
    const r = v as { from?: string | number; to?: string | number };
    return !set(r.from) && !set(r.to);
  }
  return false;
}

/**
 * value against one end of a range: negative below, positive above. Two
 * numbers compare as numbers; anything else as text, which is why a date is
 * kept as ISO — "2026-01-09" < "2026-02-01" is true read either way.
 */
function compare(value: unknown, edge: string | number): number {
  const x = Number(value);
  const y = Number(edge);
  if (!Number.isNaN(x) && !Number.isNaN(y) && edge !== "") return x - y;
  return String(value ?? "").localeCompare(String(edge));
}

function set(edge: string | number | undefined): boolean {
  return edge !== undefined && edge !== "";
}

function inRange(value: unknown, r: { from?: string | number; to?: string | number }): boolean {
  if (set(r.from) && compare(value, r.from as string | number) < 0) return false;
  if (set(r.to) && compare(value, r.to as string | number) > 0) return false;
  return true;
}

function matches(row: Row, query: Query): boolean {
  const where = query.where ?? {};
  const ok = Object.entries(where).every(([k, v]) => {
    if (empty(v)) return true;
    const value = row[k];
    if (Array.isArray(v)) return v.some((one) => one === value || fold(one) === fold(value));
    if (typeof v === "object") return inRange(value, v as { from?: string | number; to?: string | number });
    return value === v || fold(v) === fold(value);
  });
  if (!ok) return false;
  const q = fold(query.q).trim();
  if (!q) return true;
  const fields = query.search ?? Object.keys(row).filter((k) => !k.startsWith("_") && typeof row[k] === "string");
  return fields.some((f) => fold(row[f]).includes(q));
}

/** Rows in `sort` order: "price" ascending, "-price" descending. */
function sorted<T extends { id: string }>(rows: T[], sort?: string): T[] {
  const key = (sort ?? "").trim();
  if (!key) return rows;
  const desc = key.startsWith("-");
  const field = desc ? key.slice(1) : key;
  const out = [...rows].sort((a, b) => {
    const x = (a as unknown as Row)[field];
    const y = (b as unknown as Row)[field];
    if (typeof x === "number" && typeof y === "number") return x - y;
    return String(x ?? "").localeCompare(String(y ?? ""), undefined, { numeric: true });
  });
  return desc ? out.reverse() : out;
}

/**
 * A page at a time: `items` grows by `pageSize` with each `loadMore()` — wire
 * it to a "Show more" button or an IntersectionObserver for lazy loading.
 *
 * Returns { items, total, pages, page, hasMore, loading, error, loadMore }:
 * - `items` — the page asked for, or the records loaded so far;
 * - `total` — how many records match in all, loaded or not. A count the
 *   visitor reads ("24 products", "1–20 of 137") is `total`, never
 *   `items.length`, which is only the page. Once the site has a backend,
 *   `total` is the API's `total`;
 * - `pages` — how many pages of `pageSize` those matches make;
 * - `page` — the page `items` holds, clamped into range: a filter narrowed
 *   while standing on page 7 shows the last page, not an empty table.
 *
 * Pass `page` for a dashboard list — a table's footer is "1–20 of 137" with
 * numbers to click — and leave it out for a catalogue, where `loadMore()`
 * appends the next page to the ones already shown.
 */
// T is the record's shape as the page reads it. Any shape with an id will do —
// an interface included: `T extends Row` asked for Row's index signature,
// which no interface has, and a design turn spent 24 builds on the error.
export function useCollection<T extends { id: string } = Row>(name: string, query: Query = {}) {
  const rows = useRows(name);
  const pageSize = query.pageSize ?? 12;
  const key = JSON.stringify([query.where ?? {}, query.q ?? "", query.search ?? null, query.sort ?? ""]);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setPages(1);
  }, [name, key]);
  useEffect(() => {
    // Async on purpose, as the API will be: components handle loading now.
    setLoading(true);
    const t = window.setTimeout(() => setLoading(false), 0);
    return () => {
      window.clearTimeout(t);
    };
  }, [name, key, pages, query.page]);
  const all = sorted(rows.filter((r) => matches(r, query)) as unknown as T[], query.sort);
  const count = all.length;
  const last = Math.max(1, Math.ceil(count / pageSize));
  // A page past the end — the person was on page 7 and narrowed the filter —
  // shows the last page rather than an empty table with no way back.
  const page = query.page === undefined ? 1 : Math.min(Math.max(1, Math.floor(query.page)), last);
  const items = query.page === undefined
    ? all.slice(0, pages * pageSize)
    : all.slice((page - 1) * pageSize, page * pageSize);
  const loadMore = useCallback(() => setPages((p) => p + 1), []);
  return { items, total: count, pages: last, page, hasMore: query.page === undefined && items.length < count, loading, error: null as Error | null, loadMore };
}

/** One record by id. */
export function useRecord<T extends { id: string } = Row>(name: string, id: string | undefined) {
  const rows = useRows(name);
  const item = rows.find((r) => r.id === id) as unknown as T | undefined;
  return { item, loading: false, error: null as Error | null };
}
