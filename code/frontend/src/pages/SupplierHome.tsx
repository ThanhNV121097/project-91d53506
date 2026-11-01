import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import RequireRole from "../components/RequireRole";
import Stat from "../components/Stat";
import Bars from "../components/Bars";
import { useCollection } from "../data";
import { usePageMeta } from "../seo";
import { formatPrice } from "../lib/format";
import { SUPPLIER_NAV } from "../lib/nav";
import { useSupplierRevenue } from "../lib/mock/supplier-revenue-and-payout-reporting";

const WEEKS = [
  { key: "W40", value: 4 }, { key: "W41", value: 7 }, { key: "W42", value: 5 },
  { key: "W43", value: 9 }, { key: "W44", value: 12 },
];

export default function SupplierHome() {
  usePageMeta("pages.supplier.title");
  const bookings = useCollection("bookings", { pageSize: 50 });
  const products = useCollection("products", { pageSize: 50 });
  const rev = useSupplierRevenue();
  return (
    <RequireRole roles={["supplier"]}>
      <DashboardLayout title="Overview" nav={SUPPLIER_NAV} brand="Nghệ An Departures"
        actions={<Link to="/supplier/products" className="rounded-[var(--radius-sm)] bg-accent px-4 py-2 text-sm text-accent-ink">New product</Link>}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Bookings" value={String(bookings.total)} icon="date" />
          <Stat label="Revenue" value={formatPrice(rev.revenue)} icon="wallet" />
          <Stat label="Platform commission" value={formatPrice(rev.commission)} icon="tag"
            note={rev.rate > 0 ? undefined : "No commission rate has been set yet."} />
          <Stat label="Expected payout" value={formatPrice(rev.expectedPayout)} icon="card"
            note={rev.rate > 0 ? undefined : "Gross, until a commission rate is set."} />
        </div>
        <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
          <Bars data={WEEKS} label="Bookings by week" />
          <div className="rounded-[var(--radius-sm)] border border-line bg-surface p-4">
            <p className="label text-ink-soft">Products</p>
            <p className="fig mt-2 text-[length:var(--size-price)] leading-none">{products.total}</p>
            <p className="mt-4 text-sm text-ink-soft">Views and conversion are counted once the site is live. The figures here are bookings taken through the platform.</p>
          </div>
        </div>
      </DashboardLayout>
    </RequireRole>
  );
}
