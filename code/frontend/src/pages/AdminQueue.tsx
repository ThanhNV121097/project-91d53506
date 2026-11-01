import { useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import RequireRole from "../components/RequireRole";
import DataTable from "../components/DataTable";
import TableFilters, { SearchBox, FilterSelect, Badge } from "../components/TableFilters";
import { collections, setCollection, useCollection, type Row } from "../data";
import { useTableQuery } from "../lib/table";
import { usePageMeta } from "../seo";
import { formatPrice, formatDate } from "../lib/format";
import { ADMIN_NAV } from "../lib/nav";

/** Which pending row the reason box below the tables now applies to. */
interface Target {
  kind: "supplier" | "product";
  id: string;
  name: string;
}

export default function AdminQueue() {
  usePageMeta("pages.adminQueue.title");
  const t = useTableQuery({ size: 20, sort: "name" });
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [target, setTarget] = useState<Target | null>(null);
  const products = useCollection("products", {
    page: t.page, pageSize: t.size, sort: t.sort, q: t.q, search: ["name"],
    where: { status: t.list("status") },
  });
  const suppliers = useCollection("suppliers", { where: { verified: false }, pageSize: 10 });

  function choose(next: Target) {
    setTarget(next);
    setError("");
  }

  function approveSupplier(id: string) {
    const rows = collections().suppliers ?? [];
    setCollection("suppliers", rows.map((r) => (r.id === id ? { ...r, verified: true, rejection_reason: "" } : r)));
    if (target?.id === id) setTarget(null);
  }

  function approveProduct(id: string) {
    const rows = collections().products ?? [];
    setCollection("products", rows.map((r) => (r.id === id ? { ...r, status: "approved", rejection_reason: "" } : r)));
    if (target?.id === id) setTarget(null);
  }

  function submitReject() {
    if (!target) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      setError("Enter a reason.");
      return;
    }
    if (target.kind === "supplier") {
      const rows = collections().suppliers ?? [];
      setCollection("suppliers", rows.map((r) => (r.id === target.id ? { ...r, rejection_reason: trimmed } : r)));
    } else {
      const rows = collections().products ?? [];
      setCollection("products", rows.map((r) => (r.id === target.id ? { ...r, status: "rejected", rejection_reason: trimmed } : r)));
    }
    setTarget(null);
    setReason("");
    setError("");
  }

  return (
    <RequireRole roles={["admin"]}>
      <DashboardLayout title="Approval queue" nav={ADMIN_NAV} brand="Nghệ An Departures">
        <h2 className="text-base text-ink">Supplier profiles</h2>
        <ul className="flex flex-col gap-2">
          {suppliers.items.map((s) => (
            <li key={s.id} data-record={`suppliers:${s.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-line bg-surface px-4 py-3">
              <span className="text-sm text-ink">{String(s.name)} · <span className="text-ink-soft">{String(s.documents)}</span></span>
              <span className="flex gap-3">
                <button type="button" onClick={() => approveSupplier(s.id)} className="text-sm text-accent underline">Approve</button>
                <button type="button" onClick={() => choose({ kind: "supplier", id: s.id, name: String(s.name) })} className="text-sm text-ink underline">Reject</button>
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
          actions={(r) => (
            <span className="flex justify-end gap-3">
              <button type="button" onClick={() => approveProduct(r.id)} className="text-sm text-accent underline">Approve</button>
              <button type="button" onClick={() => choose({ kind: "product", id: r.id, name: String(r.name) })} className="text-sm text-ink underline">Request edits</button>
            </span>
          )}
        />
        <form className="flex max-w-[52ch] flex-col gap-2" onSubmit={(e) => { e.preventDefault(); submitReject(); }}>
          <label htmlFor="reason" className="label text-ink-soft">
            {target ? `Reason for rejecting “${target.name}”` : "Reason for rejection"}
          </label>
          <textarea id="reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
            aria-describedby={error ? "reason-error" : undefined}
            className="rounded-[var(--radius-sm)] border border-field bg-surface px-3 py-2 text-sm text-ink" />
          {error && <p id="reason-error" role="alert" className="text-sm text-ink">{error}</p>}
          {!target && <p className="text-sm text-ink-soft">Choose "Reject" or "Request edits" on a row above first.</p>}
          <button type="submit" disabled={!target} className="self-start rounded-[var(--radius-sm)] bg-accent px-4 py-2 text-sm text-accent-ink disabled:opacity-60">Reject with this reason</button>
        </form>
      </DashboardLayout>
    </RequireRole>
  );
}
