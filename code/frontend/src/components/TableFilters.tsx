import { type ReactNode } from "react";

/**
 * The bar above a dashboard list: search, the filters, and a way out of them.
 *
 * Every list in a CMS is read through a question — "what is waiting for me",
 * "what did this supplier send last week", "which bookings are unpaid". A
 * table with no filters makes the person page through 137 rows to answer it.
 *
 *   <TableFilters onClear={t.filtering ? t.clear : undefined}>
 *     <SearchBox value={t.q} onChange={t.setQ} placeholder="Search products" />
 *     <FilterSelect label="Status" value={t.get("status")} onChange={(v) => t.set("status", v)}
 *       options={[["pending", "Awaiting review"], ["approved", "Approved"]]} />
 *     <DateRange label="Created" from={t.get("created_from")} to={t.get("created_to")}
 *       onChange={(from, to) => t.setRange("created", from, to)} />
 *   </TableFilters>
 *
 * The filters write themselves into the address bar (src/lib/table.ts), so
 * the question can be sent to somebody else as a link.
 */
export default function TableFilters({ children, onClear }: { children: ReactNode; onClear?: () => void }) {
  return (
    <div className="flex flex-wrap items-end gap-3" role="search">
      {children}
      {onClear && (
        <button type="button" onClick={onClear} className="px-2 py-2 text-sm text-ink-soft underline hover:text-ink">
          Clear filters
        </button>
      )}
    </div>
  );
}

const FIELD = "rounded border border-field bg-surface px-3 py-2 text-sm text-ink";

export function SearchBox({ value, onChange, placeholder = "Search" }: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="sr-only">{placeholder}</span>
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`${FIELD} min-w-[14rem]`}
      />
    </label>
  );
}

export function FilterSelect({ label, value, onChange, options, anyLabel = "All" }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** [value, label] pairs. */
  options: readonly (readonly [string, string])[];
  anyLabel?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-ink-soft">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className={FIELD}>
        <option value="">{anyLabel}</option>
        {options.map(([v, text]) => (
          <option key={v} value={v}>{text}</option>
        ))}
      </select>
    </label>
  );
}

export function DateRange({ label, from, to, onChange }: {
  label: string;
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-1 text-sm text-ink-soft">
      <legend className="mb-1">{label}</legend>
      <div className="flex items-center gap-2">
        <input type="date" value={from} onChange={(e) => onChange(e.target.value, to)} className={FIELD} aria-label={`${label} from`} />
        <span aria-hidden="true">–</span>
        <input type="date" value={to} onChange={(e) => onChange(from, e.target.value)} className={FIELD} aria-label={`${label} to`} />
      </div>
    </fieldset>
  );
}

/**
 * A record's state as a word with a mark beside it — awaiting review,
 * approved, rejected. The tone is the meaning, never the only carrier of it:
 * the word is always there, because a colour alone is unreadable to the
 * person who cannot see it and to the one printing the page.
 */
export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "good" | "warn" | "bad"; children: ReactNode }) {
  const TONES = {
    neutral: "border-line text-ink-soft",
    good: "border-line text-ink",
    warn: "border-field text-ink",
    bad: "border-field text-ink-soft",
  } as const;
  return (
    <span className={`inline-flex items-center gap-1 rounded-[var(--radius-pill)] border px-2 py-0.5 text-xs ${TONES[tone]}`}>
      <span aria-hidden="true">{tone === "good" ? "●" : tone === "bad" ? "■" : tone === "warn" ? "◆" : "○"}</span>
      {children}
    </span>
  );
}
