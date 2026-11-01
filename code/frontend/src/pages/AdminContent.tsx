import { useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import RequireRole from "../components/RequireRole";
import DataTable from "../components/DataTable";
import { Badge } from "../components/TableFilters";
import { useCollection, type Row } from "../data";
import { useTableQuery } from "../lib/table";
import { usePageMeta } from "../seo";
import { formatPrice, formatDate } from "../lib/format";
import { ADMIN_NAV } from "../lib/nav";
import { updateDestination, removeDestination, addCategory } from "../lib/mock/admin-content-and-homepage-management";

const FIELD = "rounded-[var(--radius-sm)] border border-field bg-surface px-3 py-2 text-sm text-ink";

function DestinationRow({ d }: { d: Row }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(String(d.name));
  const [price, setPrice] = useState(String(d.from_price ?? ""));
  const [error, setError] = useState("");

  function save() {
    if (!name.trim()) {
      setError("Enter a name.");
      return;
    }
    updateDestination(d.id, { name: name.trim(), from_price: Number(price) || 0 });
    setError("");
    setEditing(false);
  }

  if (!editing) {
    return (
      <li data-record={`destinations:${d.id}`} className="flex items-center justify-between gap-3 border-b border-line pb-2 last:border-0">
        <span className="min-w-0 truncate text-ink">{String(d.name)} <span className="fig text-ink-soft">{formatPrice(Number(d.from_price) || 0)}</span></span>
        <span className="flex shrink-0 gap-3">
          <button type="button" onClick={() => setEditing(true)} className="text-xs text-ink underline hover:text-accent">Edit</button>
          <button type="button" onClick={() => removeDestination(d.id)} className="text-xs text-ink underline hover:text-accent">Remove</button>
        </span>
      </li>
    );
  }
  return (
    <li className="flex flex-col gap-2 border-b border-line pb-3 last:border-0">
      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} className={FIELD} />
      </label>
      {error && <p role="alert" className="text-xs text-ink">{error}</p>}
      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        From price
        <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" min={0} className={`${FIELD} fig`} />
      </label>
      <span className="flex gap-3">
        <button type="button" onClick={save} className="rounded-[var(--radius-sm)] bg-accent px-3 py-1.5 text-xs text-accent-ink">Save</button>
        <button type="button" onClick={() => setEditing(false)} className="text-xs text-ink-soft underline">Cancel</button>
      </span>
    </li>
  );
}

function AddCategoryForm() {
  const [name, setName] = useState("");
  return (
    <form
      className="mt-3 flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        addCategory(name);
        setName("");
      }}
    >
      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        <span className="sr-only">New category name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name" className={FIELD} />
      </label>
      <button type="submit" className="rounded-[var(--radius-sm)] bg-accent px-3 py-2 text-xs text-accent-ink">Add category</button>
    </form>
  );
}

export default function AdminContent() {
  usePageMeta("pages.adminContent.title");
  const t = useTableQuery({ size: 20 });
  const vouchers = useCollection("vouchers", { page: t.page, pageSize: t.size, sort: t.sort });
  const campaigns = useCollection("campaigns", { pageSize: 10 });
  const destinations = useCollection("destinations", { pageSize: 10 });
  const categories = useCollection("categories", { pageSize: 10 });
  const guides = useCollection("guides", { pageSize: 10 });
  return (
    <RequireRole roles={["admin"]}>
      <DashboardLayout title="Content & marketing" nav={ADMIN_NAV} brand="Nghệ An Departures"
        actions={<button type="button" className="rounded-[var(--radius-sm)] bg-accent px-4 py-2 text-sm text-accent-ink">New discount code</button>}>
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="min-w-0 rounded-[var(--radius-sm)] border border-line bg-surface p-4">
            <p className="label text-ink-soft">Destinations and homepage banners</p>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {destinations.items.map((d) => <DestinationRow key={d.id} d={d} />)}
            </ul>
          </div>
          <div className="min-w-0 rounded-[var(--radius-sm)] border border-line bg-surface p-4">
            <p className="label text-ink-soft">Product categories</p>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {categories.items.map((c) => (
                <li key={c.id} data-record={`categories:${c.id}`} className="flex items-center justify-between gap-3 border-b border-line pb-2 last:border-0">
                  <span className="min-w-0 truncate text-ink">{String(c.name)}</span>
                </li>
              ))}
            </ul>
            <AddCategoryForm />
          </div>
          <div className="min-w-0 rounded-[var(--radius-sm)] border border-line bg-surface p-4 lg:col-span-2">
            <p className="label text-ink-soft">Guides and travel posts</p>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {guides.items.map((g) => (
                <li key={g.id} data-record={`guides:${g.id}`} className="flex items-center justify-between gap-3 border-b border-line pb-2 last:border-0">
                  <span className="min-w-0 truncate text-ink">{String(g.title)}</span>
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
            { key: "limit", label: "Limit", align: "right", secondary: true, render: (r) => <span className="fig">{Number(r.limit)}</span> },
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
            { key: "channel", label: "Channel", secondary: true },
            { key: "start", label: "Starts", align: "right", render: (r) => <span className="fig">{formatDate(String(r.start))}</span> },
            { key: "end", label: "Ends", align: "right", secondary: true, render: (r) => <span className="fig">{formatDate(String(r.end))}</span> },
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
