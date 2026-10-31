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
              className={`flex w-full flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-line py-3 text-left disabled:opacity-50 ${here ? "text-accent" : "text-ink"}`}>
              <span className="fig w-24 shrink-0 text-sm">{formatDate(d.date)}</span>
              <span className="fig ml-auto w-14 shrink-0 text-right text-sm">{d.seats}</span>
              <span className="fig w-28 shrink-0 text-right text-sm">{formatPrice(d.price)}</span>
              <span className="w-full text-xs text-ink-soft">{open ? d.season : `${d.season} · ${d.state}`}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
