/**
 * Mock data for /admin/finance. One module, deleted once the backend lands
 * (PATCH /v1/admin/commission, PATCH /v1/admin/suppliers/{id}/commission,
 * POST /v1/admin/payouts/reconcile, GET /v1/admin/payouts,
 * POST /v1/admin/payouts/{id}/mark-paid — docs/admin/test-cases/
 * admin-commission-and-payout-reconciliation.md).
 */
export interface PayoutRow {
  id: string;
  period: string;
  supplierId: string;
  supplierName: string;
  gross: number;
  status: "Pending" | "Paid";
  paidOn: string;
  /** The commission rate applied when this period was reconciled. Set only
   * on a reconciled (`Paid` or closed-`Pending`) row — a later change to
   * the global or per-supplier rate never touches it, per ADMIN-005 AC-4. */
  appliedRate?: number;
}

export const SUPPLIERS = [
  { id: "cua-lo-stays", name: "Cửa Lò Beach Stays" },
  { id: "pu-mat-boat", name: "Pù Mát Boat & Jeep" },
  { id: "tea-walks", name: "Thanh Chương Tea Walks" },
  { id: "kim-lien-guides", name: "Kim Liên Heritage Guides" },
  { id: "ban-nua", name: "Bản Nưa Homestay" },
  { id: "vinh-transfers", name: "Vinh Airport Transfers" },
] as const;

export const PAYOUTS: PayoutRow[] = [
  { id: "po-01", period: "2026-10-01", supplierId: "cua-lo-stays", supplierName: "Cửa Lò Beach Stays", gross: 9515000, status: "Pending", paidOn: "" },
  { id: "po-02", period: "2026-10-01", supplierId: "pu-mat-boat", supplierName: "Pù Mát Boat & Jeep", gross: 6600000, status: "Pending", paidOn: "" },
  { id: "po-03", period: "2026-10-01", supplierId: "tea-walks", supplierName: "Thanh Chương Tea Walks", gross: 1600000, status: "Pending", paidOn: "" },
  { id: "po-04", period: "2026-10-01", supplierId: "kim-lien-guides", supplierName: "Kim Liên Heritage Guides", gross: 4200000, status: "Pending", paidOn: "" },
  { id: "po-05", period: "2026-10-01", supplierId: "ban-nua", supplierName: "Bản Nưa Homestay", gross: 1960000, status: "Pending", paidOn: "" },
  { id: "po-06", period: "2026-09-01", supplierId: "cua-lo-stays", supplierName: "Cửa Lò Beach Stays", gross: 7250000, status: "Paid", paidOn: "2026-09-05" },
  { id: "po-07", period: "2026-09-01", supplierId: "vinh-transfers", supplierName: "Vinh Airport Transfers", gross: 1520000, status: "Paid", paidOn: "2026-09-05" },
];

/** gross split at `rate` percent commission. */
export function split(gross: number, rate: number): { commission: number; net: number } {
  const commission = Math.round(gross * (rate / 100));
  return { commission, net: gross - commission };
}
