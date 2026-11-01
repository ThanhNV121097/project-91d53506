import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import RequireRole from "../components/RequireRole";
import { Badge } from "../components/TableFilters";
import Icon from "../components/Icon";
import ProductForm, { type ProductFormValues } from "../components/ProductForm";
import DepartureEditor from "../components/DepartureEditor";
import { useRecord, useCollection } from "../data";
import { usePageMeta } from "../seo";
import { SUPPLIER_NAV } from "../lib/nav";
import type { Trip, Departure } from "../lib/trips";
import { nextOnSave, nextOnSubmit, nextOnPauseToggle } from "../lib/mock/supplier-product-create-edit-and-approval";

const TONE: Record<string, "neutral" | "good" | "warn" | "bad"> = {
  approved: "good", pending: "warn", rejected: "bad", draft: "neutral", suspended: "bad",
};

function valuesFrom(item?: Trip): ProductFormValues {
  return {
    name: item?.name ?? "",
    summary: item?.summary ?? "",
    itinerary: item ? item.itinerary.join("\n") : "",
    price: item ? String(item.price) : "",
    kind: item?.kind ?? "tour",
    policy: item?.policy ?? "",
  };
}

/**
 * Create/edit a product and move it through Draft → Pending → Approved /
 * Rejected → Suspended (docs/suppliers/SRS.md §4.2, §4.3). Saving content on
 * an approved product returns it to pending; pausing/unpausing is its own
 * action and never triggers re-approval.
 */
export default function SupplierProduct() {
  usePageMeta("pages.supplierProduct.title");
  const { id } = useParams();
  const { item } = useRecord<Trip>("products", id);
  const dates = useCollection<Departure>("departures", { where: { product: id ?? "" }, sort: "date", pageSize: 12 });
  const initial = useMemo(() => valuesFrom(item), [item]);
  const [values, setValues] = useState<ProductFormValues>(initial);
  const [status, setStatus] = useState(item?.status ?? "draft");
  const [priceError, setPriceError] = useState("");
  const [saved, setSaved] = useState("");

  function onChange(field: keyof ProductFormValues, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    if (field === "price" && priceError) setPriceError("");
  }

  function saveDraft() {
    setStatus((s) => nextOnSave(s, initial, values));
    setSaved("Saved as a draft.");
  }

  function submit() {
    const result = nextOnSubmit(status, values.price);
    if (result.error) {
      setPriceError(result.error);
      return;
    }
    setStatus(result.status);
    setSaved("Submitted. An admin reviews it before it is published.");
  }

  function togglePause() {
    const wasSuspended = status === "suspended";
    setStatus(nextOnPauseToggle(status));
    setSaved(wasSuspended ? "Back on sale." : "Paused. It no longer appears in search.");
  }

  const canPause = status === "approved" || status === "suspended";
  const canSubmit = status === "draft" || status === "pending" || status === "rejected";

  return (
    <RequireRole roles={["supplier"]}>
      <DashboardLayout title={item?.name ?? "New product"} nav={SUPPLIER_NAV} brand="Nghệ An Departures"
        actions={
          <span className="flex items-center gap-2">
            <Badge tone={TONE[status] ?? "neutral"}>{status}</Badge>
            {canPause && (
              <button type="button" onClick={togglePause} className="rounded-[var(--radius-sm)] border border-field px-3 py-2 text-sm text-ink">
                {status === "suspended" ? "Unpause" : "Pause the sale"}
              </button>
            )}
            <button type="button" onClick={saveDraft} className="rounded-[var(--radius-sm)] border border-field px-3 py-2 text-sm text-ink">Save draft</button>
            {canSubmit && (
              <button type="button" data-testid="submit-product" onClick={submit} className="rounded-[var(--radius-sm)] bg-accent px-3 py-2 text-sm text-accent-ink">Submit for approval</button>
            )}
          </span>
        }>
        {saved && (
          <p data-testid="product-saved" className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-line bg-surface px-4 py-3 text-sm text-ink">
            <Icon name="info" size={16} className="text-accent" />{saved}
          </p>
        )}
        {status === "rejected" && item?.rejection_reason && (
          <p data-testid="rejection-reason" className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-field bg-surface px-4 py-3 text-sm text-ink">
            <Icon name="alert" size={16} className="text-accent" />Rejected: {item.rejection_reason}
          </p>
        )}
        <ProductForm values={values} onChange={onChange} priceError={priceError} />
        <h2 className="mt-4 text-base text-ink">Dates, capacity and seasonal pricing</h2>
        <DepartureEditor dates={dates.items} total={dates.total} />
      </DashboardLayout>
    </RequireRole>
  );
}
