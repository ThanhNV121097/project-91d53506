import { useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import RequireRole from "../components/RequireRole";
import DataTable from "../components/DataTable";
import TableFilters, { SearchBox, FilterSelect, Badge } from "../components/TableFilters";
import Select from "../components/Select";
import { collections, setCollection, useCollection, type Row } from "../data";
import { PERMISSIONS, newSubAdmin } from "../lib/mock/admin-user-and-sub-admin-management";
import { useTableQuery } from "../lib/table";
import { usePageMeta } from "../seo";
import { formatDate } from "../lib/format";
import { ADMIN_NAV } from "../lib/nav";

/** Flips one user's `status` between Active and Locked, in the shared mock store. */
function toggleLock(row: Row) {
  const rows = collections().users ?? [];
  const next = rows.map((r) => (r.id === row.id ? { ...r, status: r.status === "Locked" ? "Active" : "Locked" } : r));
  setCollection("users", next);
}

export default function AdminUsers() {
  usePageMeta("pages.adminUsers.title");
  const t = useTableQuery({ size: 20, sort: "-joined" });
  const { items, total, pages, page, loading } = useCollection("users", {
    page: t.page, pageSize: t.size, sort: t.sort, q: t.q, search: ["name", "email", "role"],
    where: { role: t.get("role"), status: t.get("status") },
  });
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState<string>(PERMISSIONS[0].value);

  const submit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setCollection("users", [...(collections().users ?? []), newSubAdmin(name, email, permissions)]);
    setOpen(false);
    setEmail("");
    setName("");
    setPermissions(PERMISSIONS[0].value);
  };

  return (
    <RequireRole roles={["admin"]}>
      <DashboardLayout title="Users & roles" nav={ADMIN_NAV} brand="Nghệ An Departures"
        actions={
          <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)}
            className="rounded-[var(--radius-sm)] bg-accent px-4 py-2 text-sm text-accent-ink">
            Add a sub-admin
          </button>
        }>
        {open && (
          <form onSubmit={submit} className="flex max-w-[52ch] flex-col gap-4 rounded-[var(--radius-sm)] border border-line bg-surface p-4">
            <h2 className="text-base text-ink">New sub-admin</h2>
            <label className="flex flex-col gap-1">
              <span className="label text-ink-soft">Name</span>
              <input id="sub-name" required value={name} onChange={(e) => setName(e.target.value)}
                className="rounded-[var(--radius-sm)] border border-field bg-surface px-3 py-2 text-sm text-ink" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="label text-ink-soft">Email</span>
              <input id="sub-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="rounded-[var(--radius-sm)] border border-field bg-surface px-3 py-2 text-sm text-ink" />
            </label>
            <span className="flex flex-col gap-1">
              <span className="label text-ink-soft">Permissions</span>
              <Select value={permissions} onChange={setPermissions} aria-label="Permissions" options={PERMISSIONS} />
            </span>
            <button type="submit" className="self-start rounded-[var(--radius-sm)] bg-accent px-6 py-2.5 text-sm text-accent-ink">
              Create sub-admin
            </button>
          </form>
        )}
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
            <button type="button" onClick={() => toggleLock(r)} className="text-sm text-ink underline hover:text-accent">
              {r.status === "Locked" ? "Unlock" : "Lock"}
            </button>
          )}
        />
      </DashboardLayout>
    </RequireRole>
  );
}
