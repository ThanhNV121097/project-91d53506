import { Link, useParams } from "react-router-dom";
import { T } from "../editable";
import { useRecord } from "../data";
import Icon from "../components/Icon";
import { usePageMeta } from "../seo";
import { formatPrice, formatDate } from "../lib/format";
import { readDraft, total } from "../lib/mock/booking";
import type { Trip } from "../lib/trips";

/** A square QR drawn from the booking code — the code is the content. */
function Qr({ code }: { code: string }) {
  const cells = 21;
  const on = (x: number, y: number) => {
    const n = code.charCodeAt((x * 7 + y * 3) % code.length) + x * 31 + y * 17;
    const finder = (x < 7 && y < 7) || (x > cells - 8 && y < 7) || (x < 7 && y > cells - 8);
    if (finder) return (x % 6 === 0 || y % 6 === 0 || (x > 1 && x < 5 && y > 1 && y < 5));
    return n % 3 === 0;
  };
  const squares = [];
  for (let y = 0; y < cells; y += 1) {
    for (let x = 0; x < cells; x += 1) {
      if (on(x, y)) squares.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" />);
    }
  }
  return (
    <svg viewBox={`0 0 ${cells} ${cells}`} role="img" aria-label={`Booking code ${code}`} className="h-40 w-40 text-ink">
      {squares}
    </svg>
  );
}

export default function Confirmed() {
  usePageMeta("pages.confirmed.title", "pages.confirmed.description");
  const { code } = useParams();
  const draft = readDraft();
  const { item } = useRecord<Trip>("products", draft?.productId ?? "cua-lo-beach-2n1d");
  const booking = useRecord("bookings", "b-01");
  const shown = code ?? draft?.code ?? String(booking.item?.code ?? "");
  const sums = item ? total(item.price, draft ?? { adults: 2, children: 0, pack: "standard", voucher: "" }) : null;
  const date = draft?.date || String(item?.next_date ?? "");
  return (
    <section className="mx-auto max-w-page px-[var(--gutter)] py-14">
      <p className="label flex items-center gap-2 text-accent"><Icon name="done" size={16} /><T k="pages.confirmed.eyebrow" /></p>
      <T k="pages.confirmed.heading" as="h1" className="mt-2 max-w-[24ch] text-[length:var(--size-h1)]" />
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-[var(--radius-sm)] border border-line bg-surface p-6">
          <p className="label text-ink-soft"><T k="pages.confirmed.code" /></p>
          <p className="fig mt-1 text-[length:var(--size-h1)] leading-none text-ink" data-testid="booking-code">{shown}</p>
          <div className="mt-6"><Qr code={shown} /></div>
          <T k="pages.confirmed.qrNote" as="p" className="mt-4 max-w-[36ch] text-xs text-ink-soft" />
        </div>
        <div>
          <dl className="flex flex-col gap-3 border-t border-line pt-4 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-ink-soft"><T k="pages.confirmed.trip" /></dt><dd className="text-right text-ink">{item?.name ?? ""}</dd></div>
            <div className="flex justify-between gap-4 border-t border-line pt-3"><dt className="text-ink-soft"><T k="pages.book.date" /></dt><dd className="fig">{formatDate(date)}</dd></div>
            <div className="flex justify-between gap-4 border-t border-line pt-3"><dt className="text-ink-soft"><T k="pages.checkout.people" /></dt><dd className="fig">{(draft?.adults ?? 2) + (draft?.children ?? 0)}</dd></div>
            <div className="flex justify-between gap-4 border-t border-line pt-3"><dt className="text-ink-soft"><T k="pages.checkout.paidWith" /></dt><dd className="text-ink">{draft?.payment ?? "VNPay"}</dd></div>
            <div className="flex justify-between gap-4 border-t border-line pt-3">
              <dt><T k="pages.confirmed.paid" /></dt>
              <dd className="fig text-[length:var(--size-price)] leading-none">{formatPrice(sums?.due ?? 0)}</dd>
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
