import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";

/**
 * EVERY CHOICE FROM A LIST IS THIS, NEVER A BARE <select>: a native one is
 * drawn by the operating system, chevron, corner, face and option list, so the
 * control a visitor opens most would be the one thing on the page that did not
 * come from theme.css. A button and a listbox, with the keyboard a select has.
 */
export interface SelectOption {
  value: string;
  label: string;
}

export default function Select({
  value, onChange, options, placeholder = "Choose", id, className = "", "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly SelectOption[];
  placeholder?: string;
  id?: string;
  className?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  const chosen = options.find((o) => o.value === value);
  return (
    <div ref={box} className={`relative ${className}`}>
      <button type="button" id={id} aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-field bg-surface px-3 py-2 text-left text-sm text-ink">
        <span className={chosen ? "text-ink" : "text-ink-soft"}>{chosen ? chosen.label : placeholder}</span>
        <Icon name="expand" size={16} className="text-ink-soft" />
      </button>
      {open && (
        <ul role="listbox" aria-label={ariaLabel ?? placeholder}
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 min-w-full overflow-auto rounded-[var(--radius-sm)] border border-line bg-surface py-1 shadow-[var(--shadow-md)]">
          <li>
            <button type="button" role="option" aria-selected={value === ""}
              onClick={() => { onChange(""); setOpen(false); }}
              className="block w-full px-3 py-2 text-left text-sm text-ink-soft hover:bg-ground">{placeholder}</button>
          </li>
          {options.map((o) => (
            <li key={o.value}>
              <button type="button" role="option" aria-selected={value === o.value}
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-ground ${value === o.value ? "text-accent" : "text-ink"}`}>
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
