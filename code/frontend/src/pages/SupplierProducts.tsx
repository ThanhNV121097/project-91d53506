import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import RequireRole from "../components/RequireRole";
import DataTable from "../components/DataTable";
import TableFilters, { SearchBox, FilterSelect, Badge } from "../components/TableFilters";
import { useCollection } from "../data";
import { useTableQuery } from "../lib/table";
import { usePageMeta } from "../seo";
import { formatPrice, formatDate } from "../lib/format";
import { SUPPLIER_NAV } from "../lib/nav";
import type { Trip } from "../lib/trips";

const TONE: Record<string, "neutral" | "good" | "warn" | "bad"> = {
  approved: "good", pending: "warn", rejected: "bad", draft: "neutral", suspended: "bad",
};

export default function SupplierProducts() {
  usePageMeta("pages.supplierProducts.title");
  const t = useTableQuery({ size: 20, sort: "name" });
  const { items, total, pages, page, loading } = useCollection<Trip>("products", {
    page: t.page, pageSize: t.size, sort: t.sort, q: t.q, search: ["name", "destination"],
    where: { status: t.list("status"), kind: t.get("kind") },
  });
  return (
    <RequireRole roles={["supplier"]}>
      <DashboardLayout title="Products" nav={SUPPLIER_NAV} brand="Nghệ An Departures"
        actions={<Link to="/supplier/products/cua-lo-beach-2n1d" className="rounded-[var(--radius-sm)] bg-accent px-4 py-2 text-sm text-accent-ink">New product</Link>}>
        <TableFilters onClear={t.filtering ? t.clear : undefined}>
          <SearchBox value={t.q} onChange={t.setQ} placeholder="Search products" />
          <FilterSelect label="Status" value={t.get("status")} onChange={(v) => t.set("status", v)}
            options={[["approved", "Approved"], ["pending", "Awaiting review"], ["rejected", "Rejected"], ["draft", "Draft"], ["suspended", "Suspended"]]} />
          <FilterSelect label="Type" value={t.get("kind")} onChange={(v) => t.set("kind", v)}
            options={[["tour", "Tour"], ["homestay", "Homestay"], ["experience", "Experience"], ["transport", "Transport"], ["ticket", "Ticket"]]} />
        </TableFilters>
        <DataTable<Trip>
          columns={[
            { key: "name", label: "Product", sortable: true },
            { key: "kind", label: "Type", secondary: true },
            { key: "destination", label: "Destination", secondary: true },
            { key: "next_date", label: "Next date", sortable: true, align: "right", render: (r) => <span className="fig">{formatDate(r.next_date)}</span> },
            { key: "seats", label: "Seats", align: "right", render: (r) => <span className="fig">{r.seats}</span> },
            { key: "price", label: "Price", sortable: true, align: "right", render: (r) => <span className="fig">{formatPrice(r.price)}</span> },
            { key: "status", label: "Status", render: (r) => <Badge tone={TONE[r.status] ?? "neutral"}>{r.status}</Badge> },
          ]}
          rows={items} total={total} page={page} pages={pages} size={t.size} sort={t.sort}
          onSort={t.toggleSort} onPage={t.setPage} onSize={t.setSize} loading={loading}
          rowKey={(r) => r.id} href={(r) => `/supplier/products/${r.id}`}
          caption="Your products and their approval status"
          empty={<p>No product matches these filters. Clear them, or create a product.</p>}
          actions={(r) => <Link to={`/supplier/products/${r.id}`} className="text-sm text-ink underline hover:text-accent">Edit</Link>}
        />
      </DashboardLayout>
    </RequireRole>
  );
}
