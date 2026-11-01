import { Link } from "react-router-dom";
import { T } from "../editable";
import { Picture } from "../picture";
import Icon from "../components/Icon";
import { Badge } from "../components/TableFilters";
import { usePageMeta } from "../seo";
import { formatPrice, formatDate } from "../lib/format";
import { useSession, signOut } from "../lib/session";
import { useDemo } from "../lib/demo";
import { MY_BOOKINGS } from "../lib/mock/buyer-booking-history-and-status";

const TONE: Record<string, "neutral" | "good" | "warn" | "bad"> = {
  Paid: "good", Confirmed: "good", Completed: "neutral",
  "Awaiting payment": "warn", Cancelled: "bad", Refunded: "bad",
};

export default function Account() {
  usePageMeta("pages.account.title", "pages.account.description");
  const session = useSession();
  const demo = useDemo();
  // Stands in for GET /v1/account/bookings — already scoped server-side to
  // the signed-in Buyer; see docs/account/test-cases/buyer-booking-history-and-status.md.
  const items = MY_BOOKINGS;
  const total = items.length;
  if (!session && !demo) {
    return (
      <section className="mx-auto max-w-page px-[var(--gutter)] py-20">
        <T k="pages.account.signedOut" as="h1" className="text-[length:var(--size-h1)]" />
        <Link to="/signin" className="mt-6 inline-block rounded-[var(--radius-sm)] bg-accent px-6 py-3 text-sm text-accent-ink"><T k="nav.signin" /></Link>
      </section>
    );
  }
  return (
    <section className="mx-auto max-w-page px-[var(--gutter)] py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <T k="pages.account.heading" as="h1" className="text-[length:var(--size-h1)]" />
          <p className="mt-2 text-sm text-ink-soft">{session?.name ?? ""} {session?.email ? `· ${session.email}` : ""}</p>
        </div>
        <button type="button" onClick={signOut} className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-field px-4 py-2 text-sm text-ink hover:border-accent hover:text-accent">
          <Icon name="logout" size={16} /><T k="pages.account.signOut" />
        </button>
      </div>
      <p className="mt-6 text-sm text-ink-soft"><span className="fig">{total}</span> <T k="pages.account.count" /></p>
      <ul className="mt-4 flex flex-col gap-3" data-testid="account-bookings">
        {items.map((b) => (
          <li key={b.id} data-record={`bookings:${b.id}`} className="flex flex-col gap-4 rounded-[var(--radius-sm)] border border-line bg-surface p-4 sm:flex-row sm:items-center">
            <div className="relative w-full shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-ink sm:w-32" style={{ aspectRatio: "4 / 3" }}>
              <Picture src={b.image} alt={b.product_name} width={400} height={300} className="absolute inset-0 h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="fig text-xs text-ink-soft">{b.code}</p>
              <h2 className="truncate text-base text-ink">{b.product_name}</h2>
              <p className="fig mt-1 text-sm text-ink-soft">{formatDate(b.date)} · {b.travellers} <T k="pages.checkout.people" /></p>
            </div>
            <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
              <span className="flex items-center gap-1 text-sm text-ink"><Icon name="info" size={14} />{b.status}</span>
              <span className="fig text-base">{formatPrice(b.total)}</span>
              <div className="flex gap-2">
                <Link to={`/booking/${b.code}`} className="text-xs text-ink underline hover:text-accent"><T k="pages.account.view" /></Link>
                <Link to="/contact" className="text-xs text-ink underline hover:text-accent"><T k="pages.account.cancel" /></Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-12 border-t border-line pt-8">
        <T k="pages.account.refundHeading" as="h2" className="text-[length:var(--size-h2)]" />
        <T k="pages.account.refundSub" as="p" className="mt-2 max-w-[56ch] text-sm text-ink-soft" />
        <Link to="/contact" data-testid="account-refund" className="mt-4 inline-block rounded-[var(--radius-sm)] border border-field px-6 py-3 text-sm text-ink hover:border-accent hover:text-accent">
          <T k="pages.account.refundCta" />
        </Link>
      </div>
    </section>
  );
}
