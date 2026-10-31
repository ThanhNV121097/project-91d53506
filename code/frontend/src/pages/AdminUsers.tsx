import DashboardLayout from "../components/DashboardLayout";
import RequireRole from "../components/RequireRole";
import DataTable from "../components/DataTable";
import TableFilters, { SearchBox, FilterSelect, Badge } from "../components/TableFilters";
import { useCollection, type Row } from "../data";
import { useTableQuery } from "../lib/table";
import { usePageMeta } from "../seo";
import { formatDate } from "../lib/format";
import { ADMIN_NAV } from "../lib/nav";

export default function AdminUsers() {
  usePageMeta("pages.adminUsers.title");
  const t = useTableQuery({ size: 20, sort: "-joined" });
  const { items, total, pages, page, loading } = useCollection("users", {
    page: t.page, pageSize: t.size, sort: t.sort, q: t.q, search: ["name", "email", "role"],
    where: { role: t.get("role"), status: t.get("status") },
  });
  return (
    <RequireRole roles={["admin"]}>
      <DashboardLayout title="Users & roles" nav={ADMIN_NAV} brand="Nghệ An Departures"
        actions={<button type="button" className="rounded-[var(--radius-sm)] bg-accent px-4 py-2 text-sm text-accent-ink">Add a sub-admin</button>}>
        <TableFilters onClear={t.filtering ? t.clear : undefined}>
          <SearchBox value={t.q} onChange={t.setQ} placeholder="Search users" />
          <FilterSelect label="Role" value={t.get("role")} onChange={(v) => t.set("role", v)}
            options={[["Buyer", "Buyer"], ["Supplier", "Supplier"], ["Admin", "Admin"], ["Sub-admin", "Sub-admin"]]} />
          <FilterSelect label="Status" value={t.get("status")} onChange={(v) => t.set("status", v)}
            options={[["Active", "Active"], ["Locked", "Locked"], ["Awaiting documents", "Awaiting documents"]]} />
        </TableFilters>
        <DataTable<Row>
          columns={[
            { key: "name", label: "Name", render: (r) => String(r.name) || "Waiting on the owner's own records" },
            { key: "role", label: "Role", sortable: true },
            { key: "permissions", label: "Permissions", secondary: true },
            { key: "joined", label: "Joined", sortable: true, align: "right", render: (r) => <span className="fig">{formatDate(String(r.joined))}</span> },
            { key: "status", label: "Status", render: (r) => <Badge tone={r.status === "Active" ? "good" : r.status === "Locked" ? "bad" : "warn"}>{String(r.status)}</Badge> },
          ]}
          rows={items} total={total} page={page} pages={pages} size={t.size} sort={t.sort}
          onSort={t.toggleSort} onPage={t.setPage} onSize={t.setSize} loading={loading}
          rowKey={(r) => r.id} caption="Everyone with an account, buyers and suppliers"
          empty={<p>No user matches these filters.</p>}
          actions={(r) => (
            <button type="button" className="text-sm text-ink underline hover:text-accent">{r.status === "Locked" ? "Unlock" : "Lock"}</button>
          )}
        />
      </DashboardLayout>
    </RequireRole>
  );
}
