import DashboardLayout from "../components/DashboardLayout";
import RequireRole from "../components/RequireRole";
import DataTable from "../components/DataTable";
import TableFilters, { SearchBox, FilterSelect, DateRange, Badge } from "../components/TableFilters";
import { useCollection, type Row } from "../data";
import { useTableQuery } from "../lib/table";
import { usePageMeta } from "../seo";
import { formatPrice, formatDate } from "../lib/format";
import { ADMIN_NAV } from "../lib/nav";
import type { Booking } from "../lib/trips";

const TONE: Record<string, "neutral" | "good" | "warn" | "bad"> = {
  Paid: "good", Confirmed: "good", Completed: "neutral",
  "Awaiting payment": "warn", Cancelled: "bad", Refunded: "bad",
};

export default function AdminBookings() {
  usePageMeta("pages.adminBookings.title");
  const t = useTableQuery({ size: 20, sort: "-created" });
  const bookings = useCollection<Booking>("bookings", {
    page: t.page, pageSize: t.size, sort: t.sort, q: t.q, search: ["code", "product_name", "supplier_name"],
    where: { status: t.list("status"), date: t.range("date") },
  });
  const complaints = useCollection("complaints", { pageSize: 10 });
  return (
    <RequireRole roles={["admin"]} permission="finance-only">
      <DashboardLayout title="Bookings & disputes" nav={ADMIN_NAV} brand="Nghệ An Departures">
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
            { key: "supplier_name", label: "Supplier", secondary: true },
            { key: "date", label: "Travel date", sortable: true, align: "right", render: (r) => <span className="fig">{formatDate(r.date)}</span> },
            { key: "total", label: "Total", sortable: true, align: "right", render: (r) => <span className="fig">{formatPrice(r.total)}</span> },
            { key: "status", label: "Status", render: (r) => <Badge tone={TONE[r.status] ?? "neutral"}>{r.status}</Badge> },
          ]}
          rows={bookings.items} total={bookings.total} page={bookings.page} pages={bookings.pages}
          size={t.size} sort={t.sort} onSort={t.toggleSort} onPage={t.setPage} onSize={t.setSize}
          loading={bookings.loading} rowKey={(r) => r.id}
          caption="Every booking on the platform"
          empty={<p>No booking matches these filters.</p>}
        />

        <h2 className="mt-4 text-base text-ink">Complaints and manual refunds</h2>
        <DataTable<Row>
          columns={[
            { key: "booking_code", label: "Booking", render: (r) => <span className="fig">{String(r.booking_code)}</span> },
            { key: "issue", label: "Issue" },
            { key: "opened", label: "Opened", align: "right", render: (r) => <span className="fig">{formatDate(String(r.opened))}</span> },
            { key: "refund", label: "Refund asked", align: "right", render: (r) => <span className="fig">{formatPrice(Number(r.refund))}</span> },
            { key: "status", label: "Status", render: (r) => <Badge tone={r.status === "Refunded" ? "good" : "warn"}>{String(r.status)}</Badge> },
          ]}
          rows={complaints.items} total={complaints.total} page={1} pages={1} size={10}
          onPage={() => undefined} rowKey={(r) => r.id}
          caption="Complaints raised against bookings"
          empty={<p>No complaint is open.</p>}
          actions={() => <button type="button" className="text-sm text-accent underline">Refund manually</button>}
        />
      </DashboardLayout>
    </RequireRole>
  );
}
