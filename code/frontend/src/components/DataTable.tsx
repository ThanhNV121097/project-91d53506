import { type ReactNode } from "react";

/**
 * The list in a dashboard: a table, with its pages, its order and its total.
 *
 * A CMS list is not a catalogue. The person using it is at work: they scan
 * columns, compare rows, sort by date, jump to page 4, and come back to the
 * same place after opening a record. A grid of cards cannot do any of that,
 * and "Show more" is the wrong shape for it — this is why a dashboard list
 * is a <table> and its paging has page numbers.
 *
 *   <DataTable
 *     columns={[
 *       { key: "name", label: "Name", sortable: true },
 *       { key: "price", label: "Price", sortable: true, align: "right",
 *         render: (r) => formatPrice(r.price) },
 *       { key: "status", label: "Status", render: (r) => <Badge …/> },
 *     ]}
 *     rows={items} total={total} page={page} pages={pages} size={t.size}
 *     sort={t.sort} onSort={t.toggleSort} onPage={t.setPage} onSize={t.setSize}
 *     loading={loading} rowKey={(r) => r.id} href={(r) => `/admin/products/${r.id}`}
 *     empty={<p>Nothing here yet.</p>}
 *   />
 *
 * Every column a person can sort by says so with `sortable`; the arrow and
 * aria-sort follow. `href` makes the whole row open the record (a link in
 * the first cell, so the keyboard and a middle click both work).
 */
export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: "left" | "right";
  /** What the cell shows. The field's raw value when not given. */
  render?: (row: T) => ReactNode;
  /** Hidden below 1024px, for columns a phone has no room for. */
  secondary?: boolean;
}

export default function DataTable<T>({
  columns, rows, rowKey, total, page, pages, size, sort, onSort, onPage, onSize,
  loading = false, empty, href, actions, sizes = [20, 50, 100], caption,
}: {
  columns: readonly Column<T>[];
  rows: readonly T[];
  rowKey: (row: T) => string;
  total: number;
  page: number;
  pages: number;
  size: number;
  sort?: string;
  onSort?: (field: string) => void;
  onPage: (page: number) => void;
  onSize?: (size: number) => void;
  loading?: boolean;
  /** What to show when nothing matches — say what would fill it. */
  empty?: ReactNode;
  href?: (row: T) => string;
  /** The last cell of each row: approve, edit, open. */
  actions?: (row: T) => ReactNode;
  sizes?: readonly number[];
  /** What the table lists, for a screen reader. */
  caption?: string;
}) {
  const from = total === 0 ? 0 : (page - 1) * size + 1;
  const to = Math.min(page * size, total);
  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded border border-line bg-surface">
        <table className="w-full border-collapse text-left text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="border-b border-line">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={ariaSort(sort, c.key)}
                  className={`whitespace-nowrap px-4 py-3 font-medium text-ink-soft ${c.align === "right" ? "text-right" : ""} ${c.secondary ? "hidden lg:table-cell" : ""}`}
                >
                  {c.sortable && onSort ? (
                    <button type="button" onClick={() => onSort(c.key)} className="inline-flex items-center gap-1 hover:text-ink">
                      {c.label}
                      <span aria-hidden="true" className="text-[0.75em]">{arrow(sort, c.key)}</span>
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              ))}
              {actions && <th scope="col" className="px-4 py-3 text-right font-medium text-ink-soft">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} className="border-b border-line last:border-0 hover:bg-ground">
                {columns.map((c, i) => (
                  <td
                    key={c.key}
                    className={`px-4 py-3 align-middle text-ink ${c.align === "right" ? "text-right" : ""} ${c.secondary ? "hidden lg:table-cell" : ""}`}
                  >
                    {i === 0 && href ? (
                      <a href={href(row)} className="font-medium hover:underline">{cell(c, row)}</a>
                    ) : (
                      cell(c, row)
                    )}
                  </td>
                ))}
                {actions && <td className="px-4 py-3 text-right">{actions(row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="px-4 py-12 text-center text-ink-soft">
            {loading ? "Loading…" : empty ?? "Nothing to show."}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-ink-soft">
        <p>
          {total === 0 ? "No records" : `${from}–${to} of ${total}`}
          {onSize && (
            <>
              {" · "}
              <label>
                <span className="sr-only">Rows per page</span>
                <select
                  value={size}
                  onChange={(e) => onSize(Number(e.target.value))}
                  className="rounded border border-field bg-surface px-2 py-1 text-ink"
                >
                  {sizes.map((n) => (
                    <option key={n} value={n}>{n} per page</option>
                  ))}
                </select>
              </label>
            </>
          )}
        </p>
        <nav aria-label="Pages" className="flex items-center gap-1">
          <PageButton onClick={() => onPage(page - 1)} disabled={page <= 1} label="Previous">‹</PageButton>
          {pageNumbers(page, pages).map((n, i) =>
            n === 0 ? (
              <span key={`gap-${i}`} className="px-2" aria-hidden="true">…</span>
            ) : (
              <PageButton key={n} onClick={() => onPage(n)} current={n === page} label={`Page ${n}`}>{n}</PageButton>
            ),
          )}
          <PageButton onClick={() => onPage(page + 1)} disabled={page >= pages} label="Next">›</PageButton>
        </nav>
      </div>
    </div>
  );
}

function cell<T>(c: Column<T>, row: T): ReactNode {
  if (c.render) return c.render(row);
  const v = (row as Record<string, unknown>)[c.key];
  return v === undefined || v === null ? "" : String(v);
}

function ariaSort(sort: string | undefined, key: string): "ascending" | "descending" | undefined {
  if (sort === key) return "ascending";
  if (sort === `-${key}`) return "descending";
  return undefined;
}

function arrow(sort: string | undefined, key: string): string {
  if (sort === key) return "▲";
  if (sort === `-${key}`) return "▼";
  return "↕";
}

function PageButton({ children, onClick, disabled, current, label }: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  current?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-current={current ? "page" : undefined}
      className={`min-w-[2rem] rounded px-2 py-1 ${current ? "bg-accent text-accent-ink" : "text-ink hover:bg-ground"} disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

/**
 * The page numbers to draw: the first, the last, and the ones around the
 * page open now — 0 stands for the gap. 1 ‹2› 3 … 7, never seventy buttons.
 */
export function pageNumbers(page: number, pages: number, around = 1): number[] {
  const want = new Set<number>([1, pages]);
  for (let n = page - around; n <= page + around; n += 1) {
    if (n >= 1 && n <= pages) want.add(n);
  }
  const out: number[] = [];
  let last = 0;
  for (const n of [...want].sort((a, b) => a - b)) {
    if (last && n - last > 1) out.push(0);
    out.push(n);
    last = n;
  }
  return out;
}
