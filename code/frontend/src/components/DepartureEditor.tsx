import { Badge } from "./TableFilters";
import { formatPrice, formatDate } from "../lib/format";
import type { Departure } from "../lib/trips";

/** The product's dates, capacity and seasonal prices, as a table. */
export default function DepartureEditor({ dates, total }: { dates: readonly Departure[]; total: number }) {
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">Departure dates for this product</caption>
          <thead>
            <tr className="border-y border-line">
              <th scope="col" className="label whitespace-nowrap py-2 pr-4 font-normal text-ink-soft">Date</th>
              <th scope="col" className="label whitespace-nowrap py-2 pr-4 font-normal text-ink-soft">Rule</th>
              <th scope="col" className="label whitespace-nowrap py-2 pr-4 text-right font-normal text-ink-soft">Capacity</th>
              <th scope="col" className="label whitespace-nowrap py-2 pr-4 text-right font-normal text-ink-soft">Seats left</th>
              <th scope="col" className="label whitespace-nowrap py-2 pr-4 text-right font-normal text-ink-soft">Price</th>
              <th scope="col" className="label whitespace-nowrap py-2 text-right font-normal text-ink-soft">State</th>
            </tr>
          </thead>
          <tbody>
            {dates.map((d) => (
              <tr key={d.id} data-record={`departures:${d.id}`} className="border-b border-line">
                <td className="fig whitespace-nowrap py-2 pr-4">{formatDate(d.date)}</td>
                <td className="py-2 pr-4 text-ink-soft">{d.season}</td>
                <td className="fig py-2 pr-4 text-right">{d.capacity}</td>
                <td className="fig py-2 pr-4 text-right">{d.seats}</td>
                <td className="fig whitespace-nowrap py-2 pr-4 text-right">{formatPrice(d.price)}</td>
                <td className="py-2 text-right"><Badge tone={d.state === "Open" ? "good" : "bad"}>{d.state}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-ink-soft"><span className="fig">{total}</span> dates</p>
    </>
  );
}
