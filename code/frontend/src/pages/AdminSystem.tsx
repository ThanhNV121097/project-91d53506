import DashboardLayout from "../components/DashboardLayout";
import RequireRole from "../components/RequireRole";
import DataTable from "../components/DataTable";
import { Badge } from "../components/TableFilters";
import { useCollection, type Row } from "../data";
import { useTableQuery } from "../lib/table";
import { usePageMeta } from "../seo";
import { formatDate } from "../lib/format";
import { ADMIN_NAV } from "../lib/nav";

const FIELD = "w-full rounded-[var(--radius-sm)] border border-field bg-surface px-3 py-2 text-sm text-ink";

export default function AdminSystem() {
  usePageMeta("pages.adminSystem.title");
  const t = useTableQuery({ size: 20, sort: "-at" });
  const audit = useCollection("audit", { page: t.page, pageSize: t.size, sort: t.sort });
  const notifications = useCollection("notifications", { pageSize: 10 });
  const settings = useCollection("settings", { pageSize: 10 });
  return (
    <RequireRole roles={["admin"]}>
      <DashboardLayout title="System" nav={ADMIN_NAV} brand="Nghệ An Departures">
        <h2 className="text-base text-ink">Decisions waiting on you</h2>
        <ul className="flex flex-col gap-2">
          {settings.items.map((s) => (
            <li key={s.id} data-record={`settings:${s.id}`} className="rounded-[var(--radius-sm)] border border-line bg-surface p-4">
              <p className="text-sm text-ink">{String(s.name)}</p>
              <p className="mt-1 text-sm text-ink-soft">{String(s.note)}</p>
              <input aria-label={String(s.name)} defaultValue={String(s.value)} placeholder="Not set" className={`${FIELD} mt-3 max-w-sm`} />
            </li>
          ))}
        </ul>

        <h2 className="mt-4 text-base text-ink">Policies, terms and email templates</h2>
        <form className="grid max-w-3xl gap-4 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="label text-ink-soft">Terms and conditions</span>
            <textarea id="terms" rows={3} className={FIELD} />
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="label text-ink-soft">Booking confirmation email</span>
            <textarea id="template" rows={3} className={FIELD} />
          </label>
          <button type="submit" className="self-start rounded-[var(--radius-sm)] bg-accent px-6 py-2.5 text-sm text-accent-ink sm:col-span-2">Save</button>
        </form>

        <h2 className="mt-4 text-base text-ink">Notifications</h2>
        <DataTable<Row>
          columns={[
            { key: "event", label: "Event" },
            { key: "channel", label: "Channel" },
            { key: "template", label: "Template", secondary: true },
            { key: "status", label: "Status", render: (r) => <Badge tone={r.status === "On" ? "good" : "neutral"}>{String(r.status)}</Badge> },
          ]}
          rows={notifications.items} total={notifications.total} page={1} pages={1} size={10}
          onPage={() => undefined} rowKey={(r) => r.id}
          caption="What the platform sends, and on which channel"
          empty={<p>No notification is configured.</p>}
        />

        <h2 className="mt-4 text-base text-ink">Audit log</h2>
        <DataTable<Row>
          columns={[
            { key: "at", label: "When", sortable: true, render: (r) => <span className="fig">{formatDate(String(r.at))}</span> },
            { key: "who", label: "Who" },
            { key: "action", label: "Action" },
            { key: "target", label: "On", secondary: true },
          ]}
          rows={audit.items} total={audit.total} page={audit.page} pages={audit.pages}
          size={t.size} sort={t.sort} onSort={t.toggleSort} onPage={t.setPage} onSize={t.setSize}
          loading={audit.loading} rowKey={(r) => r.id}
          caption="Everything anyone has changed on the platform"
          empty={<p>Nothing has been recorded yet.</p>}
        />
      </DashboardLayout>
    </RequireRole>
  );
}
