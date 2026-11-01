import { useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import RequireRole from "../components/RequireRole";
import DataTable from "../components/DataTable";
import TableFilters, { SearchBox, FilterSelect, Badge } from "../components/TableFilters";
import { useCollection, type Row } from "../data";
import { useTableQuery } from "../lib/table";
import { usePageMeta } from "../seo";
import { formatPrice, formatDate } from "../lib/format";
import { ADMIN_NAV } from "../lib/nav";

export default function AdminQueue() {
  usePageMeta("pages.adminQueue.title");
  const t = useTableQuery({ size: 20, sort: "name" });
  const [reason, setReason] = useState("");
  const products = useCollection("products", {
    page: t.page, pageSize: t.size, sort: t.sort, q: t.q, search: ["name"],
    where: { status: t.list("status") },
  });
  const suppliers = useCollection("suppliers", { where: { verified: false }, pageSize: 10 });
  return (
    <RequireRole roles={["admin"]} permission="moderation-only">
      <DashboardLayout title="Approval queue" nav={ADMIN_NAV} brand="Nghệ An Departures">
        <h2 className="text-base text-ink">Supplier profiles</h2>
        <ul className="flex flex-col gap-2">
          {suppliers.items.map((s) => (
            <li key={s.id} data-record={`suppliers:${s.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-line bg-surface px-4 py-3">
              <span className="text-sm text-ink">{String(s.name)} · <span className="text-ink-soft">{String(s.documents)}</span></span>
              <span className="flex gap-3">
                <button type="button" className="text-sm text-accent underline">Approve</button>
                <button type="button" className="text-sm text-ink underline">Reject</button>
              </span>
            </li>
          ))}
          {suppliers.items.length === 0 && <li className="text-sm text-ink-soft">No supplier profile is waiting.</li>}
        </ul>

        <h2 className="mt-4 text-base text-ink">Products</h2>
        <TableFilters onClear={t.filtering ? t.clear : undefined}>
          <SearchBox value={t.q} onChange={t.setQ} placeholder="Search products" />
          <FilterSelect label="Status" value={t.get("status")} onChange={(v) => t.set("status", v)}
            options={[["pending", "Awaiting review"], ["approved", "Approved"], ["rejected", "Rejected"], ["draft", "Draft"]]} />
        </TableFilters>
        <DataTable<Row>
          columns={[
            { key: "name", label: "Product", sortable: true },
            { key: "kind", label: "Type", secondary: true },
            { key: "next_date", label: "Next date", align: "right", render: (r) => <span className="fig">{formatDate(String(r.next_date))}</span> },
            { key: "price", label: "Price", sortable: true, align: "right", render: (r) => <span className="fig">{formatPrice(Number(r.price))}</span> },
            { key: "status", label: "Status", render: (r) => <Badge tone={r.status === "approved" ? "good" : "warn"}>{String(r.status)}</Badge> },
          ]}
          rows={products.items} total={products.total} page={products.page} pages={products.pages}
          size={t.size} sort={t.sort} onSort={t.toggleSort} onPage={t.setPage} onSize={t.setSize}
          loading={products.loading} rowKey={(r) => r.id}
          caption="Products waiting for a decision"
          empty={<p>Nothing is waiting for review.</p>}
          actions={() => (
            <span className="flex justify-end gap-3">
              <button type="button" className="text-sm text-accent underline">Approve</button>
              <button type="button" className="text-sm text-ink underline">Request edits</button>
            </span>
          )}
        />
        <form className="flex max-w-[52ch] flex-col gap-2" onSubmit={(e) => e.preventDefault()}>
          <label htmlFor="reason" className="label text-ink-soft">Reason for rejection</label>
          <textarea id="reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
            className="rounded-[var(--radius-sm)] border border-field bg-surface px-3 py-2 text-sm text-ink" />
          <button type="submit" className="self-start rounded-[var(--radius-sm)] bg-accent px-4 py-2 text-sm text-accent-ink">Reject with this reason</button>
        </form>
      </DashboardLayout>
    </RequireRole>
  );
}
