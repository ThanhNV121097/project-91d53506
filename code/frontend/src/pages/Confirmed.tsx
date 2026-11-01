import { Link, useParams } from "react-router-dom";
import { T } from "../editable";
import { useCollection } from "../data";
import Icon from "../components/Icon";
import QrCode from "../components/QrCode";
import { usePageMeta } from "../seo";
import { formatPrice, formatDate } from "../lib/format";
import type { Booking } from "../lib/trips";

/** The confirmation layout and QR render for these statuses only (BOOKING-003 Behaviour-1). */
const CONFIRMED: ReadonlySet<string> = new Set(["Confirmed", "Completed"]);

export default function Confirmed() {
  usePageMeta("pages.confirmed.title", "pages.confirmed.description");
  const { code } = useParams();
  const { items } = useCollection<Booking>("bookings", { where: { code: code ?? "" }, pageSize: 1 });
  const booking = items[0];

  if (!booking || !CONFIRMED.has(booking.status)) {
    return <p className="mx-auto max-w-page px-[var(--gutter)] py-20 text-ink-soft"><T k="pages.confirmed.notFound" /></p>;
  }

  return (
    <section className="mx-auto max-w-page px-[var(--gutter)] py-14">
      <p className="label flex items-center gap-2 text-accent"><Icon name="done" size={16} /><T k="pages.confirmed.eyebrow" /></p>
      <T k="pages.confirmed.heading" as="h1" className="mt-2 max-w-[24ch] text-[length:var(--size-h1)]" />
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-[var(--radius-sm)] border border-line bg-surface p-6">
          <p className="label text-ink-soft"><T k="pages.confirmed.code" /></p>
          <p className="fig mt-1 text-[length:var(--size-h1)] leading-none text-ink" data-testid="booking-code">{booking.code}</p>
          <div className="mt-6"><QrCode code={booking.code} /></div>
          <T k="pages.confirmed.qrNote" as="p" className="mt-4 max-w-[36ch] text-xs text-ink-soft" />
        </div>
        <div>
          <dl className="flex flex-col gap-3 border-t border-line pt-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-soft"><T k="pages.confirmed.trip" /></dt>
              <dd className="text-right text-ink">{booking.product_name}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-line pt-3">
              <dt className="text-ink-soft"><T k="pages.book.date" /></dt>
              <dd className="fig">{formatDate(booking.date)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-line pt-3">
              <dt className="text-ink-soft"><T k="pages.checkout.people" /></dt>
              <dd className="fig">{booking.travellers}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-line pt-3">
              <dt className="text-ink-soft"><T k="pages.checkout.paidWith" /></dt>
              <dd className="text-ink">{booking.payment}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-line pt-3">
              <dt><T k="pages.confirmed.paid" /></dt>
              <dd className="fig text-[length:var(--size-price)] leading-none">{formatPrice(booking.total)}</dd>
            </div>
          </dl>
          <T k="pages.confirmed.sent" as="p" className="mt-6 max-w-[48ch] text-sm text-ink-soft" />
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/account" className="rounded-[var(--radius-sm)] bg-ink px-6 py-3 text-sm text-surface hover:bg-accent"><T k="pages.confirmed.bookings" /></Link>
            <Link to="/search" className="rounded-[var(--radius-sm)] border border-field px-6 py-3 text-sm text-ink hover:border-accent hover:text-accent"><T k="pages.confirmed.more" /></Link>
          </div>
        </div>
      </div>
    </section>
  );
}
