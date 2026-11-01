import Icon from "./Icon";
import Select from "./Select";

export interface ProductFormValues {
  name: string;
  summary: string;
  itinerary: string;
  price: string;
  kind: string;
  policy: string;
}

const FIELD = "w-full appearance-none rounded-[var(--radius-sm)] border border-field bg-surface px-3 py-2 text-sm text-ink";

/** A supplier's product: title, description, itinerary, price, policy, photographs. */
export default function ProductForm({ values, onChange, priceError }: {
  values: ProductFormValues;
  onChange: (field: keyof ProductFormValues, value: string) => void;
  priceError?: string;
}) {
  return (
    <form className="flex max-w-3xl flex-col gap-5" onSubmit={(e) => e.preventDefault()}>
      <label className="flex flex-col gap-1">
        <span className="label text-ink-soft">Title</span>
        <input id="title" value={values.name} onChange={(e) => onChange("name", e.target.value)} className={FIELD} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="label text-ink-soft">Description</span>
        <textarea id="description" rows={4} value={values.summary} onChange={(e) => onChange("summary", e.target.value)} className={FIELD} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="label text-ink-soft">Day by day</span>
        <textarea id="itinerary" rows={4} value={values.itinerary} onChange={(e) => onChange("itinerary", e.target.value)} className={FIELD} />
      </label>
      <div className="flex flex-wrap gap-5">
        <label className="flex flex-col gap-1">
          <span className="label text-ink-soft">Price per person</span>
          <input id="price" type="number" value={values.price} onChange={(e) => onChange("price", e.target.value)}
            aria-invalid={priceError ? true : undefined} aria-describedby={priceError ? "price-error" : undefined}
            className={`${FIELD} fig text-right`} />
          {priceError && <span id="price-error" role="alert" className="text-xs text-accent">{priceError}</span>}
        </label>
        <span className="flex min-w-[12rem] flex-col gap-1">
          <span className="label text-ink-soft">Type</span>
          <Select value={values.kind} onChange={(v) => onChange("kind", v)} aria-label="Type" placeholder="Tour"
            options={[
              { value: "tour", label: "Tour" }, { value: "homestay", label: "Homestay" },
              { value: "experience", label: "Experience" }, { value: "transport", label: "Transport" },
              { value: "ticket", label: "Ticket" },
            ]} />
        </span>
      </div>
      <label className="flex flex-col gap-1">
        <span className="label text-ink-soft">Cancellation policy</span>
        <textarea id="policy" rows={3} value={values.policy} onChange={(e) => onChange("policy", e.target.value)}
          placeholder="Waiting on the platform's default window" className={FIELD} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="label text-ink-soft">Photographs</span>
        <input id="photos" type="file" multiple className={FIELD} />
        <span className="text-xs text-ink-soft">Pictures are compressed and served from the CDN when they are uploaded.</span>
      </label>
      <p className="flex items-center gap-2 text-sm text-ink-soft">
        <Icon name="alert" size={16} />Changing the price or the itinerary of an approved product sends it back for approval.
      </p>
    </form>
  );
}
