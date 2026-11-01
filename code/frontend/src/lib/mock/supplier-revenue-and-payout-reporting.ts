/**
 * SUPPLIERS-007 — revenue, the applicable commission rate, and what the
 * platform still owes this supplier, reconciled against bookings and any
 * payout period already closed.
 *
 * Mock data access layer: reads the same JSON collections every other
 * supplier screen reads (src/data/*.json) through useCollection. Deleted
 * once GET /v1/supplier/revenue exists (docs/architecture/services.md
 * §3.8.10) — that endpoint already returns this exact shape, so the
 * backend step swaps this file for a fetch and nothing else changes.
 */
import { useCollection } from "../../data";
import type { Booking } from "../trips";

const QUALIFYING = new Set(["Paid", "Confirmed", "Completed"]);

export interface SupplierRevenue {
  revenue: number;
  commissionRate: number;
  commission: number;
  expectedPayout: number;
  /** False when no rate is set anywhere (global or override) — AC-2. */
  rateSet: boolean;
  loading: boolean;
}

export function useSupplierRevenue(): SupplierRevenue {
  const bookings = useCollection<Booking>("bookings", { pageSize: 200 });
  const payouts = useCollection("payouts", { pageSize: 200 });
  const settings = useCollection("settings", { pageSize: 50 });
  const suppliers = useCollection("suppliers", { pageSize: 50 });

  const revenue = bookings.items
    .filter((b) => QUALIFYING.has(b.status))
    .reduce((n, b) => n + b.total, 0);

  const globalRate = Number(settings.items.find((s) => s.id === "commission-rate")?.value) || 0;
  const overrideRate = Number(suppliers.items[0]?.commission) || 0;
  const ratePercent = overrideRate || globalRate;
  const commissionRate = ratePercent / 100;
  const commission = Math.round(revenue * commissionRate);

  // Revenue already covered by a closed payout period must not be paid out
  // twice (SUPPLIERS-007 behaviour 3): expected payout applies the rate only
  // to what is left after every settled period's gross is taken out.
  const settledGross = payouts.items.reduce((n, p) => n + Number(p.gross ?? 0), 0);
  const unsettled = Math.max(0, revenue - settledGross);
  const expectedPayout = Math.round(unsettled * (1 - commissionRate));

  return {
    revenue, commissionRate, commission, expectedPayout,
    rateSet: commissionRate > 0,
    loading: bookings.loading || payouts.loading || settings.loading || suppliers.loading,
  };
}
