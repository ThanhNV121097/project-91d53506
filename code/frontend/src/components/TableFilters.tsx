import { type ReactNode } from "react";
import Select from "./Select";

/**
 * The bar above a dashboard list: search, the filters, and a way out of them.
 * The filters write themselves into the address bar (src/lib/table.ts), so the
 * question can be sent to somebody else as a link.
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

const FIELD = "appearance-none rounded-[var(--radius-sm)] border border-field bg-surface px-3 py-2 text-sm text-ink";

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
    <span className="flex flex-col gap-1 text-sm text-ink-soft">
      <span className="label">{label}</span>
      <Select value={value} onChange={onChange} aria-label={label} placeholder={anyLabel}
        className="min-w-[11rem]"
        options={options.map(([v, text]) => ({ value: v, label: text }))} />
    </span>
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
      <legend className="label mb-1">{label}</legend>
      <div className="flex items-center gap-2">
        <input type="date" value={from} onChange={(e) => onChange(e.target.value, to)} className={`${FIELD} fig`} aria-label={`${label} from`} />
        <span aria-hidden="true">–</span>
        <input type="date" value={to} onChange={(e) => onChange(from, e.target.value)} className={`${FIELD} fig`} aria-label={`${label} to`} />
      </div>
    </fieldset>
  );
}

/**
 * A record's state as a word with a mark beside it. The tone is the meaning,
 * never the only carrier of it: the word is always there.
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
