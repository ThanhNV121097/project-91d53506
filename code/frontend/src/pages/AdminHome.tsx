import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import RequireRole from "../components/RequireRole";
import Stat from "../components/Stat";
import Bars from "../components/Bars";
import { Badge } from "../components/TableFilters";
import { useCollection } from "../data";
import { usePageMeta } from "../seo";
import { formatPrice, formatDate } from "../lib/format";
import { ADMIN_NAV } from "../lib/nav";
import type { Booking } from "../lib/trips";

const WEEKS = [
  { key: "W40", value: 11 }, { key: "W41", value: 15 }, { key: "W42", value: 13 },
  { key: "W43", value: 21 }, { key: "W44", value: 26 },
];

export default function AdminHome() {
  usePageMeta("pages.admin.title");
  const bookings = useCollection<Booking>("bookings", { sort: "-created", pageSize: 8 });
  const suppliers = useCollection("suppliers", { pageSize: 50 });
  const pending = useCollection("suppliers", { where: { verified: false }, pageSize: 50 });
  const settings = useCollection("settings", { pageSize: 10 });
  const revenue = bookings.items.reduce((n, b) => n + b.total, 0);
  return (
    <RequireRole roles={["admin"]}>
      <DashboardLayout title="Overview" nav={ADMIN_NAV} brand="Nghệ An Departures">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Bookings" value={String(bookings.total)} icon="date" />
          <Stat label="Gross value" value={formatPrice(revenue)} icon="wallet" />
          <Stat label="Suppliers" value={String(suppliers.total)} icon="store" />
          <Stat label="Waiting for review" value={String(pending.total)} icon="alert" note="Supplier profiles with documents outstanding." />
        </div>
        <div className="grid gap-3 lg:grid-cols-[1.3fr_1fr]">
          <Bars data={WEEKS} label="Bookings by week" />
          <div className="rounded-[var(--radius-sm)] border border-line bg-surface p-4">
            <p className="label text-ink-soft">Decisions waiting on you</p>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {settings.items.map((s) => (
                <li key={s.id} data-record={`settings:${s.id}`} className="flex items-center justify-between gap-3 border-b border-line pb-2 last:border-0">
                  <span className="text-ink">{String(s.name)}</span>
                  <Badge tone="warn">{String(s.value) || "Not set"}</Badge>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-ink-soft">
              <span className="fig">1–{settings.items.length}</span> of <span className="fig">{settings.total}</span>
            </p>
            <Link to="/admin/system" className="mt-3 inline-block text-sm text-ink underline hover:text-accent">Set them in System</Link>
          </div>
        </div>
        <div className="rounded-[var(--radius-sm)] border border-line bg-surface p-4">
          <p className="label text-ink-soft">The latest bookings</p>
          <ul className="mt-3 flex flex-col">
            {bookings.items.map((b) => (
              <li key={b.id} data-record={`bookings:${b.id}`} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-line py-2 last:border-0 text-sm">
                <span className="fig w-24 shrink-0 text-ink-soft">{b.code}</span>
                <span className="min-w-0 flex-1 truncate text-ink">{b.product_name}</span>
                <span className="fig w-24 shrink-0 text-right text-ink-soft">{formatDate(b.date)}</span>
                <span className="fig w-28 shrink-0 text-right text-ink">{formatPrice(b.total)}</span>
                <Badge tone={b.status === "Paid" || b.status === "Confirmed" ? "good" : "warn"}>{b.status}</Badge>
              </li>
            ))}
          </ul>
          <Link to="/admin/bookings" className="mt-3 inline-block text-sm text-ink underline hover:text-accent">Every booking</Link>
        </div>
      </DashboardLayout>
    </RequireRole>
  );
}
