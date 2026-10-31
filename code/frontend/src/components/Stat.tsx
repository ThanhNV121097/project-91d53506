import Icon from "./Icon";
import type { IconName } from "./Icon";

/** One figure in a dashboard's top row: the number large and mono, its label small. */
export default function Stat({ label, value, icon, note }: {
  label: string;
  value: string;
  icon: IconName;
  note?: string;
}) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-line bg-surface p-4">
      <p className="label flex items-center gap-2 text-ink-soft"><Icon name={icon} size={14} />{label}</p>
      <p className="fig mt-2 text-[length:var(--size-price)] leading-none text-ink">{value}</p>
      {note && <p className="mt-2 text-xs text-ink-soft">{note}</p>}
    </div>
  );
}
