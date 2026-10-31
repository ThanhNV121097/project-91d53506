import DashboardLayout from "../components/DashboardLayout";
import RequireRole from "../components/RequireRole";
import DataTable from "../components/DataTable";
import Stat from "../components/Stat";
import { Badge } from "../components/TableFilters";
import Select from "../components/Select";
import { useCollection, type Row } from "../data";
import { useTableQuery } from "../lib/table";
import { usePageMeta } from "../seo";
import { formatPrice, formatDate } from "../lib/format";
import { ADMIN_NAV } from "../lib/nav";

const FIELD = "w-full rounded-[var(--radius-sm)] border border-field bg-surface px-3 py-2 text-sm text-ink";

export default function AdminFinance() {
  usePageMeta("pages.adminFinance.title");
  const t = useTableQuery({ size: 20, sort: "-period" });
  const payouts = useCollection("payouts", { page: t.page, pageSize: t.size, sort: t.sort });
  const suppliers = useCollection("suppliers", { pageSize: 20 });
  const gross = payouts.items.reduce((n, p) => n + Number(p.gross ?? 0), 0);
  return (
    <RequireRole roles={["admin"]}>
      <DashboardLayout title="Finance" nav={ADMIN_NAV} brand="Nghệ An Departures">
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Gross booked" value={formatPrice(gross)} icon="wallet" />
          <Stat label="Platform revenue" value={formatPrice(0)} icon="tag" note="Follows the commission rate below, which nobody has set." />
          <Stat label="Owed to suppliers" value={formatPrice(gross)} icon="card" />
        </div>

        <h2 className="mt-4 text-base text-ink">Commission</h2>
        <form className="grid max-w-3xl gap-4 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
          <label className="flex flex-col gap-1">
            <span className="label text-ink-soft">Global rate, %</span>
            <input id="rate" type="number" min={0} max={100} placeholder="Not set" className={`${FIELD} fig text-right`} />
          </label>
          <span className="flex flex-col gap-1">
            <span className="label text-ink-soft">Override for one supplier</span>
            <Select value="" onChange={() => undefined} aria-label="Supplier" placeholder="Every supplier"
              options={suppliers.items.map((s) => ({ value: s.id, label: String(s.name) }))} />
          </span>
          <p className="text-sm text-ink-soft sm:col-span-2">Nobody has set a rate yet, so every payout below shows its gross. Set one and the figures recalculate.</p>
          <button type="submit" className="self-start rounded-[var(--radius-sm)] bg-accent px-6 py-2.5 text-sm text-accent-ink sm:col-span-2">Save commission</button>
        </form>

        <h2 className="mt-4 text-base text-ink">Payout reconciliation</h2>
        <DataTable<Row>
          columns={[
            { key: "period", label: "Period", sortable: true, render: (r) => <span className="fig">{formatDate(String(r.period))}</span> },
            { key: "supplier_name", label: "Supplier" },
            { key: "gross", label: "Gross", align: "right", sortable: true, render: (r) => <span className="fig">{formatPrice(Number(r.gross))}</span> },
            { key: "commission", label: "Commission", align: "right", render: (r) => <span className="fig">{formatPrice(Number(r.commission))}</span> },
            { key: "net", label: "Payout", align: "right", render: (r) => <span className="fig">{formatPrice(Number(r.net))}</span> },
            { key: "status", label: "Status", render: (r) => <Badge tone="warn">{String(r.status)}</Badge> },
          ]}
          rows={payouts.items} total={payouts.total} page={payouts.page} pages={payouts.pages}
          size={t.size} sort={t.sort} onSort={t.toggleSort} onPage={t.setPage} onSize={t.setSize}
          loading={payouts.loading} rowKey={(r) => r.id}
          caption="What each supplier is owed, period by period"
          empty={<p>No payout period has closed yet.</p>}
          actions={() => <button type="button" className="text-sm text-accent underline">Mark paid</button>}
        />
      </DashboardLayout>
    </RequireRole>
  );
}
