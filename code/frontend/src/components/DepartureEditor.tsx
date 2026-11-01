import { useState } from "react";
import { Badge } from "./TableFilters";
import Select from "./Select";
import { formatPrice, formatDate } from "../lib/format";
import type { Departure } from "../lib/trips";
import { SEASONS, addDeparture, patchDeparture, type DepartureInput } from "../lib/mock/supplier-calendar-and-seasonal-pricing";

const FIELD = "rounded-[var(--radius-sm)] border border-field bg-surface px-3 py-2 text-sm text-ink";

/** The product's dates, capacity and seasonal prices: a table, plus the add-departure form and a block toggle per row. */
export default function DepartureEditor({
  dates, total, product,
}: {
  dates: readonly Departure[];
  total: number;
  product: { id: string; name: string; supplier: string; supplierName: string; basePrice: number };
}) {
  const [error, setError] = useState("");
  const [form, setForm] = useState<DepartureInput>({ date: "", capacity: 10, price: undefined, season: "Standard" });

  function submit() {
    const result = addDeparture(product, form);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError("");
    setForm({ date: "", capacity: 10, price: undefined, season: "Standard" });
  }

  function toggleBlock(d: Departure) {
    const result = patchDeparture(d.id, { state: d.state === "Blocked" ? "Open" : "Blocked" });
    if (!result.ok) setError(result.error);
  }

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
              <th scope="col" className="label whitespace-nowrap py-2 pr-4 text-right font-normal text-ink-soft">State</th>
              <th scope="col" className="label whitespace-nowrap py-2 text-right font-normal text-ink-soft">
                <span className="sr-only">Actions</span>
              </th>
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
                <td className="py-2 pr-4 text-right"><Badge tone={d.state === "Open" ? "good" : "bad"}>{d.state}</Badge></td>
                <td className="py-2 text-right">
                  <button type="button" onClick={() => toggleBlock(d)} className="text-sm text-ink underline hover:text-accent">
                    {d.state === "Blocked" ? "Unblock" : "Block"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {dates.length === 0 && <p className="py-6 text-sm text-ink-soft">No dates yet. Add the first departure below.</p>}
      </div>
      <p className="text-sm text-ink-soft">
        <span className="fig">1–{dates.length}</span> of <span className="fig">{total}</span> dates
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <label className="flex flex-col gap-1">
          <span className="label text-ink-soft">Date</span>
          <input
            type="date"
            required
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className={`${FIELD} fig`}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="label text-ink-soft">Capacity</span>
          <input
            type="number"
            min={1}
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
            className={`${FIELD} fig w-24 text-right`}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="label text-ink-soft">Price that day</span>
          <input
            type="number"
            min={0}
            placeholder={String(product.basePrice)}
            value={form.price ?? ""}
            onChange={(e) => setForm({ ...form, price: e.target.value ? Number(e.target.value) : undefined })}
            className={`${FIELD} fig w-36 text-right`}
          />
        </label>
        <span className="flex min-w-[10rem] flex-col gap-1">
          <span className="label text-ink-soft">Pricing rule</span>
          <Select
            value={form.season ?? "Standard"}
            onChange={(v) => setForm({ ...form, season: v })}
            aria-label="Pricing rule"
            placeholder="Standard"
            options={SEASONS.map((s) => ({ value: s, label: s }))}
          />
        </span>
        <button type="submit" className="rounded-[var(--radius-sm)] bg-accent px-6 py-2.5 text-sm text-accent-ink">
          Add departure
        </button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-ink">
          {error}
        </p>
      )}
    </>
  );
}
