import DashboardLayout from "../components/DashboardLayout";
import RequireRole from "../components/RequireRole";
import DataTable from "../components/DataTable";
import TableFilters, { SearchBox, FilterSelect, DateRange, Badge } from "../components/TableFilters";
import Icon from "../components/Icon";
import { useCollection, collections, setCollection } from "../data";
import { useTableQuery } from "../lib/table";
import { usePageMeta } from "../seo";
import { formatPrice, formatDate } from "../lib/format";
import { SUPPLIER_NAV } from "../lib/nav";
import type { Booking } from "../lib/trips";

const TONE: Record<string, "neutral" | "good" | "warn" | "bad"> = {
  Paid: "good", Confirmed: "good", Completed: "neutral",
  "Awaiting payment": "warn", Cancelled: "bad", Refunded: "bad",
};

/** Writes one booking's status into the mock store, in place of the real PATCH. */
function setStatus(id: string, status: string) {
  const rows = collections().bookings ?? [];
  setCollection("bookings", rows.map((r) => (r.id === id ? { ...r, status } : r)));
}

export default function SupplierBookings() {
  usePageMeta("pages.supplierBookings.title");
  const t = useTableQuery({ size: 20, sort: "date" });
  const { items, total, pages, page, loading } = useCollection<Booking>("bookings", {
    page: t.page, pageSize: t.size, sort: t.sort, q: t.q, search: ["code", "product_name"],
    where: { status: t.list("status"), date: t.range("date") },
  });
  const single = t.get("date_from") && t.get("date_from") === t.get("date_to") ? t.get("date_from") : "";
  // Independent of the status filter and the search box above: "everyone travelling
  // that day" means every booking on the date, whatever else is selected in the table.
  const passengers = useCollection<Booking>("bookings", {
    pageSize: 1000,
    where: { date: single || undefined },
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
              {r.status === "Paid" && !r.confirmation && (
                <>
                  <button type="button" onClick={() => setStatus(r.id, "Confirmed")} className="text-sm text-accent underline">Confirm</button>
                  <button type="button" onClick={() => setStatus(r.id, "Cancelled")} className="text-sm text-ink underline">Reject</button>
                </>
              )}
              <button type="button" className="flex items-center gap-1 text-sm text-ink underline"><Icon name="qr" size={14} />Check in</button>
            </span>
          )}
        />

        <h2 className="mt-4 text-base text-ink">Passenger list</h2>
        {single ? (
          <DataTable<Booking>
            columns={[
              { key: "code", label: "Code", render: (r) => <span className="fig">{r.code}</span> },
              { key: "product_name", label: "Product" },
              { key: "travellers", label: "Travellers", align: "right", render: (r) => <span className="fig">{r.travellers}</span> },
              { key: "status", label: "Status", render: (r) => <Badge tone={TONE[r.status] ?? "neutral"}>{r.status}</Badge> },
            ]}
            rows={passengers.items} total={passengers.total} page={1} pages={1} size={passengers.items.length} onPage={() => undefined}
            rowKey={(r) => r.id}
            caption={`Everyone travelling on ${single}`}
            empty={<p>No booking lands on this date.</p>}
            loading={passengers.loading}
          />
        ) : (
          <p className="text-sm text-ink-soft">Set the travel-date filter to the same date on both ends to see exactly who is travelling that day.</p>
        )}
      </DashboardLayout>
    </RequireRole>
  );
}
