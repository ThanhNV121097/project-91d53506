import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { Filter } from "../data";

/**
 * A list's page, order, search and filters — kept in the address bar.
 *
 * `/admin/products?status=pending&page=2` is a link somebody can send to the
 * colleague who approves things, and a page that survives a refresh. State
 * held in useState does neither: the filter a person set is gone the moment
 * they open a record and come back, which is the one move every CMS list is
 * used for.
 *
 *   const t = useTableQuery({ size: 20 });
 *   const { items, total, pages, page } = useCollection("products", {
 *     page: t.page, pageSize: t.size, sort: t.sort, q: t.q,
 *     where: { status: t.list("status"), created_at: t.range("created") },
 *   });
 *
 * Setting anything but the page returns to page 1: filtering while standing
 * on page 7 of the old result is how a table shows "no records" about a
 * search that has plenty.
 */
export interface TableQuery {
  page: number;
  size: number;
  /** "price" ascending, "-price" descending, "" for the default order. */
  sort: string;
  /** What was typed in the search box. */
  q: string;
  /** One filter's value, or "" when it is not set. */
  get(name: string): string;
  /** One filter as a list: "pending,rejected" → ["pending", "rejected"]. */
  list(name: string): string[];
  /** One filter as a range, from `<name>_from` and `<name>_to`. */
  range(name: string): Filter;
  setPage(page: number): void;
  setSize(size: number): void;
  /** Sorts by field; the same field again turns the order round. */
  toggleSort(field: string): void;
  setQ(q: string): void;
  set(name: string, value: string | readonly string[]): void;
  setRange(name: string, from: string, to: string): void;
  /** Takes every filter, the search and the page off — keeps the order. */
  clear(): void;
  /** Whether anything is filtering the list now, for a "Clear" that knows. */
  filtering: boolean;
}

/** Parameters this hook owns; everything else in the URL is a filter. */
const OWN = ["page", "size", "sort", "q"];

export function useTableQuery(defaults: { size?: number; sort?: string } = {}): TableQuery {
  const [params, setParams] = useSearchParams();
  const size = Number(params.get("size")) || defaults.size || 20;
  const page = Math.max(1, Number(params.get("page")) || 1);
  const sort = params.get("sort") ?? defaults.sort ?? "";
  const q = params.get("q") ?? "";

  const write = useCallback(
    (change: (next: URLSearchParams) => void, keepPage: boolean) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          change(next);
          if (!keepPage) next.delete("page");
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const put = useCallback(
    (name: string, value: string, keepPage = false) => {
      write((next) => {
        if (value) next.set(name, value);
        else next.delete(name);
      }, keepPage);
    },
    [write],
  );

  return useMemo<TableQuery>(() => {
    const get = (name: string) => params.get(name) ?? "";
    return {
      page,
      size,
      sort,
      q,
      get,
      list: (name) => get(name).split(",").map((v) => v.trim()).filter(Boolean),
      range: (name) => ({ from: get(`${name}_from`), to: get(`${name}_to`) }),
      setPage: (p) => put("page", p > 1 ? String(p) : "", true),
      setSize: (s) => put("size", String(s)),
      toggleSort: (field) => put("sort", sort === field ? `-${field}` : sort === `-${field}` ? "" : field),
      setQ: (text) => put("q", text.trim()),
      set: (name, value) => put(name, Array.isArray(value) ? value.join(",") : String(value ?? "")),
      setRange: (name, from, to) =>
        write((next) => {
          for (const [key, v] of [[`${name}_from`, from], [`${name}_to`, to]] as const) {
            if (v) next.set(key, v);
            else next.delete(key);
          }
        }, false),
      clear: () =>
        write((next) => {
          for (const key of [...next.keys()]) {
            if (key !== "sort" && key !== "size") next.delete(key);
          }
        }, false),
      filtering: [...params.keys()].some((k) => !OWN.includes(k)) || q !== "",
    };
  }, [params, page, size, sort, q, put, write]);
}
