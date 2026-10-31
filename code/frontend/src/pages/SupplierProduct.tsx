import { useState } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import RequireRole from "../components/RequireRole";
import { Badge } from "../components/TableFilters";
import Icon from "../components/Icon";
import Select from "../components/Select";
import { useRecord, useCollection } from "../data";
import { usePageMeta } from "../seo";
import { formatPrice, formatDate } from "../lib/format";
import { SUPPLIER_NAV } from "../lib/nav";
import type { Trip, Departure } from "../lib/trips";

const FIELD = "w-full rounded-[var(--radius-sm)] border border-field bg-surface px-3 py-2 text-sm text-ink";

export default function SupplierProduct() {
  usePageMeta("pages.supplierProduct.title");
  const { id } = useParams();
  const { item } = useRecord<Trip>("products", id);
  const dates = useCollection<Departure>("departures", { where: { product: id ?? "" }, sort: "date", pageSize: 12 });
  const [status, setStatus] = useState(item?.status ?? "draft");
  const [saved, setSaved] = useState("");
  return (
    <RequireRole roles={["supplier"]}>
      <DashboardLayout title={item?.name ?? "New product"} nav={SUPPLIER_NAV} brand="Nghệ An Departures"
        actions={
          <span className="flex items-center gap-2">
            <Badge tone={status === "approved" ? "good" : status === "pending" ? "warn" : "neutral"}>{status}</Badge>
            <button type="button" onClick={() => { setStatus("draft"); setSaved("Saved as a draft."); }}
              className="rounded-[var(--radius-sm)] border border-field px-3 py-2 text-sm text-ink">Save draft</button>
            <button type="button" onClick={() => { setStatus("pending"); setSaved("Submitted. An admin reviews it before it is published."); }}
              className="rounded-[var(--radius-sm)] bg-accent px-3 py-2 text-sm text-accent-ink">Submit for approval</button>
          </span>
        }>
        {saved && <p className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-line bg-surface px-4 py-3 text-sm text-ink"><Icon name="info" size={16} className="text-accent" />{saved}</p>}
        {status === "approved" && <p className="flex items-center gap-2 text-sm text-ink-soft"><Icon name="alert" size={16} />Changing the price or the itinerary of an approved product sends it back for approval.</p>}

        <form className="grid gap-6 [grid-template-columns:1fr] lg:[grid-template-columns:1fr_1fr]">
          <label className="flex flex-col gap-1 lg:col-span-2">
            <span className="label text-ink-soft">Title</span>
            <input id="title" defaultValue={item?.name ?? ""} className={FIELD} />
          </label>
          <label className="flex flex-col gap-1 lg:col-span-2">
            <span className="label text-ink-soft">Description</span>
            <textarea id="description" rows={4} defaultValue={item?.summary ?? ""} className={FIELD} />
          </label>
          <label className="flex flex-col gap-1 lg:col-span-2">
            <span className="label text-ink-soft">Day by day</span>
            <textarea id="itinerary" rows={4} defaultValue={(item?.itinerary ?? []).join("\n")} className={FIELD} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label text-ink-soft">Price per person</span>
            <input id="price" type="number" defaultValue={item?.price ?? 0} className={`${FIELD} fig text-right`} />
          </label>
          <span className="flex flex-col gap-1">
            <span className="label text-ink-soft">Type</span>
            <Select value={item?.kind ?? "tour"} onChange={() => undefined} aria-label="Type" placeholder="Tour"
              options={[{ value: "tour", label: "Tour" }, { value: "homestay", label: "Homestay" }, { value: "experience", label: "Experience" }, { value: "transport", label: "Transport" }, { value: "ticket", label: "Ticket" }]} />
          </span>
          <label className="flex flex-col gap-1 lg:col-span-2">
            <span className="label text-ink-soft">Cancellation policy</span>
            <textarea id="policy" rows={3} defaultValue={item?.policy ?? ""} placeholder="Waiting on the platform's default window" className={FIELD} />
          </label>
          <label className="flex flex-col gap-1 lg:col-span-2">
            <span className="label text-ink-soft">Photographs</span>
            <input id="photos" type="file" multiple className={FIELD} />
            <span className="text-xs text-ink-soft">Pictures are compressed and served from the CDN when they are uploaded.</span>
          </label>
          <label className="flex items-center gap-2 lg:col-span-2">
            <input id="paused" type="checkbox" className="h-4 w-4" />
            <span className="text-sm text-ink">Pause the sale of this product</span>
          </label>
        </form>

        <h2 className="mt-4 text-base text-ink">Dates, capacity and seasonal pricing</h2>
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">Departure dates for this product</caption>
          <thead>
            <tr className="border-y border-line">
              <th scope="col" className="label py-2 pr-4 font-normal text-ink-soft">Date</th>
              <th scope="col" className="label py-2 pr-4 font-normal text-ink-soft">Rule</th>
              <th scope="col" className="label py-2 pr-4 text-right font-normal text-ink-soft">Capacity</th>
              <th scope="col" className="label py-2 pr-4 text-right font-normal text-ink-soft">Seats left</th>
              <th scope="col" className="label py-2 pr-4 text-right font-normal text-ink-soft">Price</th>
              <th scope="col" className="label py-2 text-right font-normal text-ink-soft">State</th>
            </tr>
          </thead>
          <tbody>
            {dates.items.map((d) => (
              <tr key={d.id} data-record={`departures:${d.id}`} className="border-b border-line">
                <td className="fig py-2 pr-4">{formatDate(d.date)}</td>
                <td className="py-2 pr-4 text-ink-soft">{d.season}</td>
                <td className="fig py-2 pr-4 text-right">{d.capacity}</td>
                <td className="fig py-2 pr-4 text-right">{d.seats}</td>
                <td className="fig py-2 pr-4 text-right">{formatPrice(d.price)}</td>
                <td className="py-2 text-right"><Badge tone={d.state === "Open" ? "good" : "bad"}>{d.state}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-sm text-ink-soft">{dates.total} dates</p>
      </DashboardLayout>
    </RequireRole>
  );
}
