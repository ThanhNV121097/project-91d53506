import { useCollection } from "../../data";

/** Demo supplier this screen reports for — the one the rest of the mock already books against. */
const SUPPLIER_NAME = "Cửa Lò Beach Stays";
const SUPPLIER_ID = "cua-lo-stays";

const COUNTS = new Set(["Paid", "Confirmed", "Completed"]);

/**
 * Revenue, commission and expected payout for the demo supplier, per
 * SUPPLIERS-007: revenue sums this supplier's own Paid/Confirmed/Completed
 * bookings; commission is revenue × the supplier's override rate, or else
 * the platform's global rate, or 0 when neither is set; expected payout is
 * revenue minus commission, minus whatever a closed payout period already
 * covers (its own net), so a settled period is never counted twice.
 */
export function useSupplierRevenue() {
  const bookings = useCollection("bookings", { pageSize: 200 });
  const payouts = useCollection("payouts", { pageSize: 200 });
  const suppliers = useCollection("suppliers", { pageSize: 50 });
  const settings = useCollection("settings", { pageSize: 50 });

  const revenue = bookings.items
    .filter((b) => b.supplier_name === SUPPLIER_NAME && COUNTS.has(String(b.status)))
    .reduce((n, b) => n + Number(b.total ?? 0), 0);

  const own = suppliers.items.find((s) => s.id === SUPPLIER_ID);
  const override = Number(own?.commission ?? 0);
  const globalRate = Number(settings.items.find((s) => s.id === "commission-rate")?.value ?? 0);
  const rate = override > 0 ? override : globalRate > 0 ? globalRate : 0;

  const commission = Math.round(revenue * (rate / 100));
  const settled = payouts.items
    .filter((p) => p.supplier_name === SUPPLIER_NAME)
    .reduce((n, p) => n + Number(p.net ?? 0), 0);
  const expectedPayout = Math.max(0, revenue - commission - settled);

  return {
    revenue,
    rate,
    commission,
    expectedPayout,
    loading: bookings.loading || payouts.loading,
    supplierName: SUPPLIER_NAME,
  };
}
