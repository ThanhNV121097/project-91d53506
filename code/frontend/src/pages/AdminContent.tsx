import DashboardLayout from "../components/DashboardLayout";
import RequireRole from "../components/RequireRole";
import DataTable from "../components/DataTable";
import { Badge } from "../components/TableFilters";
import { useCollection, type Row } from "../data";
import { useTableQuery } from "../lib/table";
import { usePageMeta } from "../seo";
import { formatDate } from "../lib/format";
import { ADMIN_NAV } from "../lib/nav";

export default function AdminContent() {
  usePageMeta("pages.adminContent.title");
  const t = useTableQuery({ size: 20 });
  const vouchers = useCollection("vouchers", { page: t.page, pageSize: t.size, sort: t.sort });
  const campaigns = useCollection("campaigns", { pageSize: 10 });
  const destinations = useCollection("destinations", { pageSize: 10 });
  const guides = useCollection("guides", { pageSize: 10 });
  return (
    <RequireRole roles={["admin"]}>
      <DashboardLayout title="Content & marketing" nav={ADMIN_NAV} brand="Nghệ An Departures"
        actions={<button type="button" className="rounded-[var(--radius-sm)] bg-accent px-4 py-2 text-sm text-accent-ink">New discount code</button>}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[var(--radius-sm)] border border-line bg-surface p-4">
            <p className="label text-ink-soft">Destinations and homepage banners</p>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {destinations.items.map((d) => (
                <li key={d.id} data-record={`destinations:${d.id}`} className="flex items-center justify-between gap-3 border-b border-line pb-2">
                  <span className="text-ink">{String(d.name)}</span>
                  <button type="button" className="text-xs text-ink underline hover:text-accent">Edit</button>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[var(--radius-sm)] border border-line bg-surface p-4">
            <p className="label text-ink-soft">Guides and travel posts</p>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {guides.items.map((g) => (
                <li key={g.id} data-record={`guides:${g.id}`} className="flex items-center justify-between gap-3 border-b border-line pb-2">
                  <span className="truncate text-ink">{String(g.title)}</span>
                  <span className="fig shrink-0 text-xs text-ink-soft">{formatDate(String(g.date))}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <h2 className="mt-4 text-base text-ink">Discount codes and vouchers</h2>
        <DataTable<Row>
          columns={[
            { key: "code", label: "Code", sortable: true, render: (r) => <span className="fig">{String(r.code)}</span> },
            { key: "discount", label: "Discount" },
            { key: "used", label: "Used", align: "right", render: (r) => <span className="fig">{Number(r.used)}</span> },
            { key: "limit", label: "Limit", align: "right", render: (r) => <span className="fig">{Number(r.limit)}</span> },
            { key: "expires", label: "Expires", align: "right", sortable: true, render: (r) => <span className="fig">{formatDate(String(r.expires))}</span> },
            { key: "status", label: "Status", render: (r) => <Badge tone={r.status === "Active" ? "good" : "neutral"}>{String(r.status)}</Badge> },
          ]}
          rows={vouchers.items} total={vouchers.total} page={vouchers.page} pages={vouchers.pages}
          size={t.size} sort={t.sort} onSort={t.toggleSort} onPage={t.setPage} onSize={t.setSize}
          loading={vouchers.loading} rowKey={(r) => r.id}
          caption="Discount codes buyers can use at checkout"
          empty={<p>No discount code yet.</p>}
          actions={() => <button type="button" className="text-sm text-ink underline hover:text-accent">Edit</button>}
        />

        <h2 className="mt-4 text-base text-ink">Marketing campaigns</h2>
        <DataTable<Row>
          columns={[
            { key: "name", label: "Campaign" },
            { key: "channel", label: "Channel" },
            { key: "start", label: "Starts", align: "right", render: (r) => <span className="fig">{formatDate(String(r.start))}</span> },
            { key: "end", label: "Ends", align: "right", render: (r) => <span className="fig">{formatDate(String(r.end))}</span> },
            { key: "bookings", label: "Bookings", align: "right", render: (r) => <span className="fig">{Number(r.bookings)}</span> },
            { key: "status", label: "Status", render: (r) => <Badge tone={r.status === "Running" ? "good" : "neutral"}>{String(r.status)}</Badge> },
          ]}
          rows={campaigns.items} total={campaigns.total} page={1} pages={1} size={10}
          onPage={() => undefined} rowKey={(r) => r.id}
          caption="Campaigns and what they have brought in"
          empty={<p>No campaign yet.</p>}
        />
      </DashboardLayout>
    </RequireRole>
  );
}
