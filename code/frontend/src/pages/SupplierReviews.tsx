import { useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import RequireRole from "../components/RequireRole";
import DataTable from "../components/DataTable";
import TableFilters, { SearchBox, Badge } from "../components/TableFilters";
import Rating from "../components/Rating";
import { useCollection, type Row } from "../data";
import { useTableQuery } from "../lib/table";
import { usePageMeta } from "../seo";
import { formatDate } from "../lib/format";
import { SUPPLIER_NAV } from "../lib/nav";

export default function SupplierReviews() {
  usePageMeta("pages.supplierReviews.title");
  const t = useTableQuery({ size: 20 });
  const [reply, setReply] = useState("");
  const { items, total, pages, page, loading } = useCollection("reviews", {
    page: t.page, pageSize: t.size, sort: t.sort, q: t.q, search: ["product_name", "text"],
    where: { status: "published" },
  });
  return (
    <RequireRole roles={["supplier"]}>
      <DashboardLayout title="Reviews" nav={SUPPLIER_NAV} brand="Nghệ An Departures">
        <TableFilters onClear={t.filtering ? t.clear : undefined}>
          <SearchBox value={t.q} onChange={t.setQ} placeholder="Search reviews" />
        </TableFilters>
        <DataTable<Row>
          columns={[
            { key: "product_name", label: "Product" },
            { key: "author", label: "Traveller", render: (r) => String(r.author) || "Waiting on the first review" },
            { key: "rating", label: "Rating", render: (r) => <Rating value={Number(r.rating) || 0} /> },
            { key: "date", label: "Date", align: "right", render: (r) => <span className="fig">{formatDate(String(r.date))}</span> },
            { key: "reply", label: "Replied", render: (r) => <Badge tone={String(r.reply) ? "good" : "neutral"}>{String(r.reply) ? "Replied" : "No reply"}</Badge> },
          ]}
          rows={items} total={total} page={page} pages={pages} size={t.size} sort={t.sort}
          onSort={t.toggleSort} onPage={t.setPage} onSize={t.setSize} loading={loading}
          rowKey={(r) => r.id} caption="Reviews left on your products"
          empty={<p>No review yet. They appear here after a trip is completed.</p>}
        />
        <form className="flex max-w-[52ch] flex-col gap-2" onSubmit={(e) => e.preventDefault()}>
          <label htmlFor="reply" className="label text-ink-soft">Reply to a review</label>
          <textarea id="reply" rows={3} value={reply} onChange={(e) => setReply(e.target.value)}
            className="rounded-[var(--radius-sm)] border border-field bg-surface px-3 py-2 text-sm text-ink" />
          <button type="submit" className="self-start rounded-[var(--radius-sm)] bg-accent px-4 py-2 text-sm text-accent-ink">Publish reply</button>
        </form>
      </DashboardLayout>
    </RequireRole>
  );
}
