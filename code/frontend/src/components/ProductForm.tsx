import Icon from "./Icon";
import Select from "./Select";
import type { Trip } from "../lib/trips";

const FIELD = "w-full appearance-none rounded-[var(--radius-sm)] border border-field bg-surface px-3 py-2 text-sm text-ink";

/** A supplier's product: title, description, itinerary, price, policy, photographs. */
export default function ProductForm({ item }: { item?: Trip }) {
  const name = item ? item.name : "";
  const summary = item ? item.summary : "";
  const itinerary = item ? item.itinerary.join("\n") : "";
  const price = item ? item.price : 0;
  const policy = item ? item.policy : "";
  const kind = item ? item.kind : "tour";
  return (
    <form className="flex max-w-3xl flex-col gap-5">
      <label className="flex flex-col gap-1">
        <span className="label text-ink-soft">Title</span>
        <input id="title" defaultValue={name} className={FIELD} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="label text-ink-soft">Description</span>
        <textarea id="description" rows={4} defaultValue={summary} className={FIELD} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="label text-ink-soft">Day by day</span>
        <textarea id="itinerary" rows={4} defaultValue={itinerary} className={FIELD} />
      </label>
      <div className="flex flex-wrap gap-5">
        <label className="flex flex-col gap-1">
          <span className="label text-ink-soft">Price per person</span>
          <input id="price" type="number" defaultValue={price} className={`${FIELD} fig text-right`} />
        </label>
        <span className="flex min-w-[12rem] flex-col gap-1">
          <span className="label text-ink-soft">Type</span>
          <Select value={kind} onChange={() => undefined} aria-label="Type" placeholder="Tour"
            options={[
              { value: "tour", label: "Tour" }, { value: "homestay", label: "Homestay" },
              { value: "experience", label: "Experience" }, { value: "transport", label: "Transport" },
              { value: "ticket", label: "Ticket" },
            ]} />
        </span>
      </div>
      <label className="flex flex-col gap-1">
        <span className="label text-ink-soft">Cancellation policy</span>
        <textarea id="policy" rows={3} defaultValue={policy} placeholder="Waiting on the platform's default window" className={FIELD} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="label text-ink-soft">Photographs</span>
        <input id="photos" type="file" multiple className={FIELD} />
        <span className="text-xs text-ink-soft">Pictures are compressed and served from the CDN when they are uploaded.</span>
      </label>
      <label className="flex items-center gap-2">
        <input id="paused" type="checkbox" className="h-4 w-4" />
        <span className="text-sm text-ink">Pause the sale of this product</span>
      </label>
      <p className="flex items-center gap-2 text-sm text-ink-soft">
        <Icon name="alert" size={16} />Changing the price or the itinerary of an approved product sends it back for approval.
      </p>
    </form>
  );
}
