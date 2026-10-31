import { Link, useParams } from "react-router-dom";
import { T } from "../editable";
import { useRecord } from "../data";
import Icon from "../components/Icon";
import QrCode from "../components/QrCode";
import { usePageMeta } from "../seo";
import { formatPrice, formatDate } from "../lib/format";
import { readDraft, emptyDraft, total } from "../lib/mock/booking";
import type { Trip } from "../lib/trips";

/** A booking being looked at with nothing booked yet reads as this one. */
const EXAMPLE = "cua-lo-beach-2n1d";

export default function Confirmed() {
  usePageMeta("pages.confirmed.title", "pages.confirmed.description");
  const { code } = useParams();
  const draft = readDraft() ?? emptyDraft(EXAMPLE, "2026-11-14");
  const { item } = useRecord<Trip>("products", draft.productId || EXAMPLE);
  const price = item ? item.price : 0;
  const sums = total(price, draft);
  const date = draft.date || (item ? item.next_date : "");
  const shown = code || draft.code || "NA-7X42K9";
  return (
    <section className="mx-auto max-w-page px-[var(--gutter)] py-14">
      <p className="label flex items-center gap-2 text-accent"><Icon name="done" size={16} /><T k="pages.confirmed.eyebrow" /></p>
      <T k="pages.confirmed.heading" as="h1" className="mt-2 max-w-[24ch] text-[length:var(--size-h1)]" />
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-[var(--radius-sm)] border border-line bg-surface p-6">
          <p className="label text-ink-soft"><T k="pages.confirmed.code" /></p>
          <p className="fig mt-1 text-[length:var(--size-h1)] leading-none text-ink" data-testid="booking-code">{shown}</p>
          <div className="mt-6"><QrCode code={shown} /></div>
          <T k="pages.confirmed.qrNote" as="p" className="mt-4 max-w-[36ch] text-xs text-ink-soft" />
        </div>
        <div>
          <dl className="flex flex-col gap-3 border-t border-line pt-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-soft"><T k="pages.confirmed.trip" /></dt>
              <dd className="text-right text-ink">{item ? item.name : ""}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-line pt-3">
              <dt className="text-ink-soft"><T k="pages.book.date" /></dt>
              <dd className="fig">{formatDate(date)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-line pt-3">
              <dt className="text-ink-soft"><T k="pages.checkout.people" /></dt>
              <dd className="fig">{draft.adults + draft.children}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-line pt-3">
              <dt className="text-ink-soft"><T k="pages.checkout.paidWith" /></dt>
              <dd className="text-ink">{draft.payment}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-line pt-3">
              <dt><T k="pages.confirmed.paid" /></dt>
              <dd className="fig text-[length:var(--size-price)] leading-none">{formatPrice(sums.due)}</dd>
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
