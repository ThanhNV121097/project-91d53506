import { useMemo, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import RequireRole from "../components/RequireRole";
import DataTable from "../components/DataTable";
import Stat from "../components/Stat";
import { Badge } from "../components/TableFilters";
import Select from "../components/Select";
import { useTableQuery } from "../lib/table";
import { usePageMeta } from "../seo";
import { formatPrice, formatDate } from "../lib/format";
import { ADMIN_NAV } from "../lib/nav";
import { PAYOUTS, SUPPLIERS, split, type PayoutRow } from "../lib/mock/admin-commission-and-payout-reconciliation";

const FIELD = "w-full appearance-none rounded-[var(--radius-sm)] border border-field bg-surface px-3 py-2 text-sm text-ink";

function rateError(raw: string): string {
  if (raw === "") return "";
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 100) return "Enter a rate between 0 and 100.";
  return "";
}

export default function AdminFinance() {
  usePageMeta("pages.adminFinance.title");
  const t = useTableQuery({ size: 20, sort: "-period" });
  const [payouts, setPayouts] = useState<PayoutRow[]>(PAYOUTS);
  const [globalRate, setGlobalRate] = useState("");
  const [rateInput, setRateInput] = useState("");
  const [rateErr, setRateErr] = useState("");
  const [overrideSupplier, setOverrideSupplier] = useState("");
  const [overrideInput, setOverrideInput] = useState("");
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  const rateFor = (supplierId: string) => overrides[supplierId] ?? globalRate;

  /** The rate that applies to a payout row's own figures: the rate frozen
   * at reconciliation time for an already-reconciled row, never the live
   * global/override rate — a later commission change must not alter a
   * period already reconciled (ADMIN-005 AC-4). */
  const appliedRateFor = (row: PayoutRow) => row.appliedRate ?? Number(rateFor(row.supplierId)) || 0;

  function save(e: React.FormEvent) {
    e.preventDefault();
    const err = rateError(rateInput);
    setRateErr(err);
    if (err) return;
    if (rateInput !== "") setGlobalRate(rateInput);
    if (overrideSupplier && overrideInput !== "") {
      setOverrides((o) => ({ ...o, [overrideSupplier]: overrideInput }));
    }
  }

  function markPaid(id: string) {
    setPayouts((rows) => rows.map((r) => (r.id === id ? { ...r, status: "Paid" } : r)));
  }

  const sorted = useMemo(() => {
    const dir = t.sort.startsWith("-") ? -1 : 1;
    const key = t.sort.replace(/^-/, "") as keyof PayoutRow;
    if (!key) return payouts;
    return [...payouts].sort((a, b) => {
      const x = a[key];
      const y = b[key];
      if (typeof x === "number" && typeof y === "number") return (x - y) * dir;
      return String(x).localeCompare(String(y)) * dir;
    });
  }, [payouts, t.sort]);

  const gross = payouts.reduce((n, p) => n + p.gross, 0);
  const revenue = payouts.reduce((n, p) => n + split(p.gross, Number(rateFor(p.supplierId)) || 0).commission, 0);
  const owed = gross - revenue;

  return (
    <RequireRole roles={["admin"]}>
      <DashboardLayout title="Finance" nav={ADMIN_NAV} brand="Nghệ An Departures">
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Gross booked" value={formatPrice(gross)} icon="wallet" />
          <Stat label="Platform revenue" value={formatPrice(revenue)} icon="tag"
            note={globalRate === "" ? "Follows the commission rate below, which nobody has set." : undefined} />
          <Stat label="Owed to suppliers" value={formatPrice(owed)} icon="card" />
        </div>

        <h2 className="mt-4 text-base text-ink">Commission</h2>
        <form className="grid max-w-3xl gap-4 sm:grid-cols-2" onSubmit={save}>
          <label className="flex flex-col gap-1">
            <span className="label text-ink-soft">Global rate, %</span>
            <input id="rate" type="number" min={0} max={100} placeholder="Not set" value={rateInput}
              onChange={(e) => { setRateInput(e.target.value); setRateErr(""); }}
              aria-invalid={rateErr ? true : undefined} aria-describedby={rateErr ? "rate-error" : undefined}
              className={`${FIELD} fig text-right`} />
            {rateErr && <span id="rate-error" role="alert" className="text-xs text-accent">{rateErr}</span>}
          </label>
          <span className="flex flex-col gap-1">
            <span className="label text-ink-soft">Override for one supplier</span>
            <Select value={overrideSupplier} onChange={setOverrideSupplier} aria-label="Supplier" placeholder="Every supplier"
              options={SUPPLIERS.map((s) => ({ value: s.id, label: s.name }))} />
            {overrideSupplier && (
              <input type="number" min={0} max={100} placeholder="Rate for this supplier" value={overrideInput}
                onChange={(e) => setOverrideInput(e.target.value)} aria-label="Rate for this supplier"
                className={`${FIELD} fig text-right`} />
            )}
          </span>
          <p className="text-sm text-ink-soft sm:col-span-2">
            {globalRate === ""
              ? "Nobody has set a rate yet, so every payout below shows its gross. Set one and the figures recalculate."
              : "A later change here never alters a period already reconciled."}
          </p>
          <button type="submit" className="self-start rounded-[var(--radius-sm)] bg-accent px-6 py-2.5 text-sm text-accent-ink sm:col-span-2">Save commission</button>
        </form>

        <h2 className="mt-4 text-base text-ink">Payout reconciliation</h2>
        <DataTable<PayoutRow>
          columns={[
            { key: "period", label: "Period", sortable: true, render: (r) => <span className="fig">{formatDate(r.period)}</span> },
            { key: "supplierName", label: "Supplier" },
            { key: "gross", label: "Gross", align: "right", sortable: true, render: (r) => <span className="fig">{formatPrice(r.gross)}</span> },
            { key: "commission", label: "Commission", align: "right", render: (r) => <span className="fig">{formatPrice(split(r.gross, Number(rateFor(r.supplierId)) || 0).commission)}</span> },
            { key: "net", label: "Payout", align: "right", render: (r) => <span className="fig">{formatPrice(split(r.gross, Number(rateFor(r.supplierId)) || 0).net)}</span> },
            { key: "status", label: "Status", render: (r) => <Badge tone={r.status === "Paid" ? "good" : "warn"}>{r.status}</Badge> },
          ]}
          rows={sorted} total={sorted.length} page={1} pages={1}
          size={t.size} sort={t.sort} onSort={t.toggleSort} onPage={() => undefined}
          loading={false} rowKey={(r) => r.id}
          caption="What each supplier is owed, period by period"
          empty={<p>No payout period has closed yet.</p>}
          actions={(r) => (
            r.status === "Pending"
              ? <button type="button" onClick={() => markPaid(r.id)} className="text-sm text-accent underline">Mark paid</button>
              : <span className="text-sm text-ink-soft">Paid {formatDate(r.paidOn)}</span>
          )}
        />
      </DashboardLayout>
    </RequireRole>
  );
}
