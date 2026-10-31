/**
 * EVERY CHOICE FROM A LIST IS THIS, NEVER A BARE <select>: the native control
 * is drawn by the operating system and would be the one thing on the page
 * that did not come from theme.css.
 */
import Icon from "./Icon";

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
  return (
    <span className={`relative inline-flex items-center ${className}`}>
      <select
        id={id}
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-[var(--radius-sm)] border border-field bg-surface py-2 pl-3 pr-9 text-sm text-ink"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <Icon name="expand" size={16} className="pointer-events-none absolute right-2 text-ink-soft" />
    </span>
  );
}
