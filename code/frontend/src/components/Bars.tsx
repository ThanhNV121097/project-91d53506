/** Bookings by week, as bars: the dashboard's chart at a glance. */
export default function Bars({ data, label }: { data: readonly { key: string; value: number }[]; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <figure className="rounded-[var(--radius-sm)] border border-line bg-surface p-4">
      <figcaption className="label text-ink-soft">{label}</figcaption>
      <div className="mt-4 flex h-40 items-end gap-2">
        {data.map((d) => (
          <div key={d.key} className="flex flex-1 flex-col items-center gap-2">
            <span className="fig text-xs text-ink-soft">{d.value}</span>
            <div className="w-full bg-accent" style={{ height: `${(d.value / max) * 100}%`, minHeight: 2 }} />
            <span className="fig text-[10px] text-ink-soft">{d.key}</span>
          </div>
        ))}
      </div>
    </figure>
  );
}
