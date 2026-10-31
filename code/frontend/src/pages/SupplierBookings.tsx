import DashboardLayout from "../components/DashboardLayout";
import RequireRole from "../components/RequireRole";
import DataTable from "../components/DataTable";
import TableFilters, { SearchBox, FilterSelect, DateRange, Badge } from "../components/TableFilters";
import Icon from "../components/Icon";
import { useCollection } from "../data";
import { useTableQuery } from "../lib/table";
import { usePageMeta } from "../seo";
import { formatPrice, formatDate } from "../lib/format";
import { SUPPLIER_NAV } from "../lib/nav";
import type { Booking } from "../lib/trips";

const TONE: Record<string, "neutral" | "good" | "warn" | "bad"> = {
  Paid: "good", Confirmed: "good", Completed: "neutral",
  "Awaiting payment": "warn", Cancelled: "bad", Refunded: "bad",
};

export default function SupplierBookings() {
  usePageMeta("pages.supplierBookings.title");
  const t = useTableQuery({ size: 20, sort: "date" });
  const { items, total, pages, page, loading } = useCollection<Booking>("bookings", {
    page: t.page, pageSize: t.size, sort: t.sort, q: t.q, search: ["code", "product_name"],
    where: { status: t.list("status"), date: t.range("date") },
  });
  return (
    <RequireRole roles={["supplier"]}>
      <DashboardLayout title="Bookings" nav={SUPPLIER_NAV} brand="Nghệ An Departures"
        actions={
          <button type="button" aria-label="Export passenger list" title="Export passenger list"
            className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-[var(--radius-sm)] border border-field px-4 py-2 text-sm text-ink">
            <Icon name="download" size={22} /><span className="hidden sm:inline">Export passenger list</span>
          </button>
        }>
        <TableFilters onClear={t.filtering ? t.clear : undefined}>
          <SearchBox value={t.q} onChange={t.setQ} placeholder="Search by booking code" />
          <FilterSelect label="Status" value={t.get("status")} onChange={(v) => t.set("status", v)}
            options={[["Awaiting payment", "Awaiting payment"], ["Paid", "Paid"], ["Confirmed", "Confirmed"], ["Completed", "Completed"], ["Cancelled", "Cancelled"], ["Refunded", "Refunded"]]} />
          <DateRange label="Travel date" from={t.get("date_from")} to={t.get("date_to")} onChange={(from, to) => t.setRange("date", from, to)} />
        </TableFilters>
        <DataTable<Booking>
          columns={[
            { key: "code", label: "Code", sortable: true, render: (r) => <span className="fig">{r.code}</span> },
            { key: "product_name", label: "Product" },
            { key: "date", label: "Travel date", sortable: true, align: "right", render: (r) => <span className="fig">{formatDate(r.date)}</span> },
            { key: "travellers", label: "Travellers", align: "right", secondary: true, render: (r) => <span className="fig">{r.travellers}</span> },
            { key: "total", label: "Total", sortable: true, align: "right", render: (r) => <span className="fig">{formatPrice(r.total)}</span> },
            { key: "status", label: "Status", render: (r) => <Badge tone={TONE[r.status] ?? "neutral"}>{r.status}</Badge> },
          ]}
          rows={items} total={total} page={page} pages={pages} size={t.size} sort={t.sort}
          onSort={t.toggleSort} onPage={t.setPage} onSize={t.setSize} loading={loading}
          rowKey={(r) => r.id}
          caption="Bookings on your products, by travel date"
          empty={<p>No booking matches these filters.</p>}
          actions={(r) => (
            <span className="flex justify-end gap-3">
              {r.status === "Paid" && <button type="button" className="text-sm text-accent underline">Confirm</button>}
              <button type="button" className="flex items-center gap-1 text-sm text-ink underline"><Icon name="qr" size={14} />Check in</button>
            </span>
          )}
        />
      </DashboardLayout>
    </RequireRole>
  );
}
