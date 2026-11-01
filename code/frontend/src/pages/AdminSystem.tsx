import { useState, type FormEvent } from "react";
import DashboardLayout from "../components/DashboardLayout";
import RequireRole from "../components/RequireRole";
import DataTable from "../components/DataTable";
import { Badge } from "../components/TableFilters";
import { useCollection, setCollection, type Row } from "../data";
import { useTableQuery } from "../lib/table";
import { usePageMeta } from "../seo";
import { formatDate } from "../lib/format";
import { ADMIN_NAV } from "../lib/nav";

const FIELD = "w-full rounded-[var(--radius-sm)] border border-field bg-surface px-3 py-2 text-sm text-ink";

/** Saves one settings row's value, rejecting empty, and returns whether it saved. */
function saveSetting(rows: Row[], id: string, value: string): boolean {
  if (!value.trim()) return false;
  setCollection("settings", rows.map((r) => (r.id === id ? { ...r, value } : r)));
  return true;
}

function SettingField({ row, onSave }: { row: Row; onSave: (value: string) => boolean }) {
  const [value, setValue] = useState(String(row.value ?? ""));
  const [error, setError] = useState(false);
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!onSave(value)) {
      setError(true);
      return;
    }
    setError(false);
  }
  return (
    <form onSubmit={submit} className="mt-3 flex max-w-sm flex-col gap-1">
      <div className="flex gap-2">
        <input
          aria-label={String(row.name)}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(false);
          }}
          placeholder="Not set"
          className={FIELD}
        />
        <button type="submit" className="shrink-0 rounded-[var(--radius-sm)] bg-accent px-4 py-2 text-sm text-accent-ink">Save</button>
      </div>
      {error && <p role="alert" className="text-xs text-ink-soft">This field can't be saved empty.</p>}
    </form>
  );
}

export default function AdminSystem() {
  usePageMeta("pages.adminSystem.title");
  const t = useTableQuery({ size: 20, sort: "-at" });
  const audit = useCollection("audit", { page: t.page, pageSize: t.size, sort: t.sort });
  const notifications = useCollection("notifications", { pageSize: 10 });
  const settings = useCollection("settings", { pageSize: 10 });
  const byId = (id: string) => settings.items.find((r) => r.id === id);
  const platform = settings.items.filter((r) => r.id !== "terms" && r.id !== "confirmation-template");
  const terms = byId("terms");
  const template = byId("confirmation-template");
  return (
    <RequireRole roles={["admin"]}>
      <DashboardLayout title="System" nav={ADMIN_NAV} brand="Nghệ An Departures">
        <h2 className="text-base text-ink">Decisions waiting on you</h2>
        <ul className="flex flex-col gap-2">
          {platform.map((s) => (
            <li key={s.id} data-record={`settings:${s.id}`} className="rounded-[var(--radius-sm)] border border-line bg-surface p-4">
              <p className="text-sm text-ink">{String(s.name)}</p>
              <p className="mt-1 text-sm text-ink-soft">{String(s.note)}</p>
              <SettingField row={s} onSave={(v) => saveSetting(settings.items, s.id, v)} />
            </li>
          ))}
        </ul>

        <h2 className="mt-4 text-base text-ink">Policies, terms and email templates</h2>
        <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
          {terms && (
            <TextSetting id="terms" label="Terms and conditions" row={terms} onSave={(v) => saveSetting(settings.items, "terms", v)} />
          )}
          {template && (
            <TextSetting id="template" label="Booking confirmation email" row={template} onSave={(v) => saveSetting(settings.items, "confirmation-template", v)} />
          )}
        </div>

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
