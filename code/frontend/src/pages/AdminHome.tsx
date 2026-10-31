import DashboardLayout from "../components/DashboardLayout";
import RequireRole from "../components/RequireRole";
import Stat from "../components/Stat";
import Bars from "../components/Bars";
import { useCollection } from "../data";
import { usePageMeta } from "../seo";
import { formatPrice } from "../lib/format";
import { ADMIN_NAV } from "../lib/nav";
import type { Booking } from "../lib/trips";

const WEEKS = [
  { key: "W40", value: 11 }, { key: "W41", value: 15 }, { key: "W42", value: 13 },
  { key: "W43", value: 21 }, { key: "W44", value: 26 },
];

export default function AdminHome() {
  usePageMeta("pages.admin.title");
  const bookings = useCollection<Booking>("bookings", { pageSize: 50 });
  const suppliers = useCollection("suppliers", { pageSize: 50 });
  const pending = useCollection("suppliers", { where: { verified: false }, pageSize: 50 });
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
        <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
          <Bars data={WEEKS} label="Bookings by week" />
          <div className="rounded-[var(--radius-sm)] border border-line bg-surface p-4">
            <p className="label text-ink-soft">Platform commission</p>
            <p className="fig mt-2 text-[length:var(--size-price)] leading-none">{formatPrice(0)}</p>
            <p className="mt-4 text-sm text-ink-soft">No commission rate has been set. Set one in Finance and every payout figure on the platform follows it.</p>
          </div>
        </div>
      </DashboardLayout>
    </RequireRole>
  );
}
