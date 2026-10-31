import { formatPrice, formatDate } from "../lib/format";
import type { Departure } from "../lib/trips";

/** The product's calendar: a row per date, its rule, its seats and its price. */
export default function TripDates({ dates, picked, onPick }: {
  dates: readonly Departure[];
  picked: string;
  onPick: (date: string) => void;
}) {
  return (
    <ul className="mt-4 border-t border-line">
      {dates.map((d) => {
        const open = d.state === "Open";
        const here = picked === d.date;
        return (
          <li key={d.id} data-record={`departures:${d.id}`}>
            <button type="button" disabled={!open} onClick={() => onPick(d.date)}
              className={`flex w-full items-center justify-between gap-4 border-b border-line py-3 text-left disabled:opacity-50 ${here ? "text-accent" : "text-ink"}`}>
              <span className="fig w-28 text-sm">{formatDate(d.date)}</span>
              <span className="flex-1 truncate text-xs text-ink-soft">{open ? d.season : `${d.season} · ${d.state}`}</span>
              <span className="fig w-20 text-right text-sm">{d.seats}</span>
              <span className="fig w-32 text-right text-sm">{formatPrice(d.price)}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
