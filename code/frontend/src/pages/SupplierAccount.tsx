import DashboardLayout from "../components/DashboardLayout";
import RequireRole from "../components/RequireRole";
import DataTable from "../components/DataTable";
import { Badge } from "../components/TableFilters";
import Icon from "../components/Icon";
import { useCollection, type Row } from "../data";
import { useTableQuery } from "../lib/table";
import { usePageMeta } from "../seo";
import { formatPrice, formatDate } from "../lib/format";
import { SUPPLIER_NAV } from "../lib/nav";

const FIELD = "w-full rounded-[var(--radius-sm)] border border-field bg-surface px-3 py-2 text-sm text-ink";

export default function SupplierAccount() {
  usePageMeta("pages.supplierAccount.title");
  const t = useTableQuery({ size: 20, sort: "-period" });
  const { items, total, pages, page, loading } = useCollection("payouts", {
    page: t.page, pageSize: t.size, sort: t.sort,
  });
  return (
    <RequireRole roles={["supplier"]}>
      <DashboardLayout title="Profile & payouts" nav={SUPPLIER_NAV} brand="Nghệ An Departures">
        <form className="grid max-w-3xl gap-5 lg:grid-cols-2">
          <label className="flex flex-col gap-1 lg:col-span-2">
            <span className="label text-ink-soft">Business name</span>
            <input id="business" className={FIELD} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label text-ink-soft">Business licence</span>
            <input id="licence" type="file" className={FIELD} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label text-ink-soft">Travel agency licence, if you have one</span>
            <input id="agency" type="file" className={FIELD} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label text-ink-soft">Bank</span>
            <input id="bank" className={FIELD} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label text-ink-soft">Account number</span>
            <input id="account" className={`${FIELD} fig`} />
          </label>
          <label className="flex flex-col gap-1 lg:col-span-2">
            <span className="label text-ink-soft">Account holder</span>
            <input id="holder" className={FIELD} />
          </label>
          <p className="flex items-center gap-2 text-sm text-ink-soft lg:col-span-2">
            <Icon name="secure" size={16} className="text-accent" />An admin checks your documents before your products can be published.
          </p>
          <button type="submit" className="self-start rounded-[var(--radius-sm)] bg-accent px-6 py-2.5 text-sm text-accent-ink lg:col-span-2">Save profile</button>
        </form>

        <h2 className="mt-6 text-base text-ink">Revenue & commission</h2>
        <Revenue />

        <h2 className="mt-6 text-base text-ink">Payout history</h2>
        <DataTable<Row>
          columns={[
            { key: "period", label: "Period", sortable: true, render: (r) => <span className="fig">{formatDate(String(r.period))}</span> },
            { key: "gross", label: "Gross", align: "right", render: (r) => <span className="fig">{formatPrice(Number(r.gross))}</span> },
            { key: "commission", label: "Commission", align: "right", render: (r) => <span className="fig">{formatPrice(Number(r.commission))}</span> },
            { key: "net", label: "Payout", align: "right", sortable: true, render: (r) => <span className="fig">{formatPrice(Number(r.net))}</span> },
            { key: "status", label: "Status", render: (r) => <Badge tone="warn">{String(r.status)}</Badge> },
          ]}
          rows={items} total={total} page={page} pages={pages} size={t.size} sort={t.sort}
          onSort={t.toggleSort} onPage={t.setPage} onSize={t.setSize} loading={loading}
          rowKey={(r) => r.id} caption="What the platform has paid you, period by period"
          empty={<p>No payout period has closed yet.</p>}
        />
      </DashboardLayout>
    </RequireRole>
  );
}
