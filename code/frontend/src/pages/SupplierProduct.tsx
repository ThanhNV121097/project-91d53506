import { useState } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import RequireRole from "../components/RequireRole";
import { Badge } from "../components/TableFilters";
import Icon from "../components/Icon";
import ProductForm from "../components/ProductForm";
import DepartureEditor from "../components/DepartureEditor";
import { useRecord, useCollection } from "../data";
import { usePageMeta } from "../seo";
import { SUPPLIER_NAV } from "../lib/nav";
import type { Trip, Departure } from "../lib/trips";

const TONE = { approved: "good", pending: "warn" } as const;

export default function SupplierProduct() {
  usePageMeta("pages.supplierProduct.title");
  const { id } = useParams();
  const { item } = useRecord<Trip>("products", id);
  const dates = useCollection<Departure>("departures", { where: { product: id ?? "" }, sort: "date", pageSize: 12 });
  const [status, setStatus] = useState("draft");
  const [saved, setSaved] = useState("");
  const state = saved ? status : item?.status ?? "draft";
  return (
    <RequireRole roles={["supplier"]}>
      <DashboardLayout title={item?.name ?? "New product"} nav={SUPPLIER_NAV} brand="Nghệ An Departures"
        actions={
          <span className="flex items-center gap-2">
            <Badge tone={TONE[state as "approved"] ?? "neutral"}>{state}</Badge>
            <button type="button" onClick={() => { setStatus("draft"); setSaved("Saved as a draft."); }}
              className="rounded-[var(--radius-sm)] border border-field px-3 py-2 text-sm text-ink">Save draft</button>
            <button type="button" data-testid="submit-product" onClick={() => { setStatus("pending"); setSaved("Submitted. An admin reviews it before it is published."); }}
              className="rounded-[var(--radius-sm)] bg-accent px-3 py-2 text-sm text-accent-ink">Submit for approval</button>
          </span>
        }>
        {saved && (
          <p data-testid="product-saved" className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-line bg-surface px-4 py-3 text-sm text-ink">
            <Icon name="info" size={16} className="text-accent" />{saved}
          </p>
        )}
        <ProductForm item={item} />
        <h2 className="mt-4 text-base text-ink">Dates, capacity and seasonal pricing</h2>
        <DepartureEditor dates={dates.items} total={dates.total} />
      </DashboardLayout>
    </RequireRole>
  );
}
