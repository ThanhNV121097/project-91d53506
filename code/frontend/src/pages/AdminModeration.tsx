import DashboardLayout from "../components/DashboardLayout";
import RequireRole from "../components/RequireRole";
import DataTable from "../components/DataTable";
import TableFilters, { SearchBox, FilterSelect, Badge } from "../components/TableFilters";
import Rating from "../components/Rating";
import Stat from "../components/Stat";
import { useCollection, type Row } from "../data";
import { useTableQuery } from "../lib/table";
import { usePageMeta } from "../seo";
import { formatDate } from "../lib/format";
import { ADMIN_NAV } from "../lib/nav";

export default function AdminModeration() {
  usePageMeta("pages.adminModeration.title");
  const t = useTableQuery({ size: 20 });
  const reported = useCollection("reviews", { where: { status: "reported" }, pageSize: 50 });
  const hidden = useCollection("reviews", { where: { status: "hidden" }, pageSize: 50 });
  const { items, total, pages, page, loading } = useCollection("reviews", {
    page: t.page, pageSize: t.size, sort: t.sort, q: t.q, search: ["product_name", "text"],
    where: { status: t.get("status") },
  });
  return (
    <RequireRole roles={["admin"]} permission="moderation-only">
      <DashboardLayout title="Review moderation" nav={ADMIN_NAV} brand="Nghệ An Departures">
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Reviews" value={String(total)} icon="star" />
          <Stat label="Reported" value={String(reported.total)} icon="alert" note="Travellers or suppliers asked us to look at these." />
          <Stat label="Hidden" value={String(hidden.total)} icon="lock" note="Hidden for breaking policy; publish to put one back." />
        </div>
        <TableFilters onClear={t.filtering ? t.clear : undefined}>
          <SearchBox value={t.q} onChange={t.setQ} placeholder="Search reviews" />
          <FilterSelect label="Status" value={t.get("status")} onChange={(v) => t.set("status", v)}
            options={[["published", "Published"], ["reported", "Reported"], ["hidden", "Hidden"]]} />
        </TableFilters>
        <DataTable<Row>
          columns={[
            { key: "product_name", label: "Product" },
            { key: "author", label: "Traveller", render: (r) => String(r.author) || "Waiting on the first review" },
            { key: "rating", label: "Rating", render: (r) => <Rating value={Number(r.rating) || 0} /> },
            { key: "date", label: "Date", align: "right", render: (r) => <span className="fig">{formatDate(String(r.date))}</span> },
            { key: "status", label: "Status", render: (r) => <Badge tone={r.status === "published" ? "good" : r.status === "hidden" ? "bad" : "warn"}>{String(r.status)}</Badge> },
          ]}
          rows={items} total={total} page={page} pages={pages} size={t.size} sort={t.sort}
          onSort={t.toggleSort} onPage={t.setPage} onSize={t.setSize} loading={loading}
          rowKey={(r) => r.id} caption="Reviews, and the ones reported as breaking policy"
          empty={<p>No review matches these filters.</p>}
          actions={(r) => (
            <button type="button" className="text-sm text-ink underline hover:text-accent">{r.status === "hidden" ? "Publish" : "Hide"}</button>
          )}
        />
      </DashboardLayout>
    </RequireRole>
  );
}
