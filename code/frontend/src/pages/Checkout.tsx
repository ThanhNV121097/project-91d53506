import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { T, useContent } from "../editable";
import { useRecord } from "../data";
import Icon from "../components/Icon";
import { usePageMeta } from "../seo";
import { formatPrice, formatDate } from "../lib/format";
import { readDraft, writeDraft, emptyDraft, total, newCode, PAYMENTS } from "../lib/mock/booking";
import type { Trip } from "../lib/trips";

export default function Checkout() {
  usePageMeta("pages.checkout.title", "pages.checkout.description");
  const { id } = useParams();
  const { item } = useRecord<Trip>("products", id);
  const navigate = useNavigate();
  const [draft, setDraft] = useState(() => readDraft() ?? emptyDraft(id ?? ""));
  const [paying, setPaying] = useState(false);
  const voucherNote = useContent("pages.checkout.voucherNote");
  if (!item) return <p className="mx-auto max-w-page px-[var(--gutter)] py-20 text-ink-soft"><T k="pages.trip.missing" /></p>;
  const sums = total(item.price, draft);
  const date = draft.date || item.next_date;
  return (
    <section className="mx-auto grid max-w-page gap-10 px-[var(--gutter)] py-10 lg:grid-cols-[1.4fr_1fr]">
      <div>
        <T k="pages.checkout.heading" as="h1" className="text-[length:var(--size-h1)]" />
        <T k="pages.checkout.sub" as="p" className="mt-2 max-w-[52ch] text-sm text-ink-soft" />

        <h2 className="mt-10 text-[length:var(--size-h2)]"><T k="pages.checkout.pay" /></h2>
        <div className="mt-4 flex flex-col gap-2">
          {PAYMENTS.map((p) => (
            <button key={p.id} type="button" data-testid={`pay-${p.id}`} onClick={() => setDraft({ ...draft, payment: p.id })}
              className={`flex items-center justify-between rounded-[var(--radius-sm)] border px-4 py-3 text-left text-sm ${draft.payment === p.id ? "border-accent text-accent" : "border-field text-ink"}`}>
              <span className="flex items-center gap-2"><Icon name={p.id === "vietqr" ? "qr" : "wallet"} size={16} />{p.label}</span>
              {draft.payment === p.id && <Icon name="check" size={16} />}
            </button>
          ))}
        </div>

        <h2 className="mt-10 text-[length:var(--size-h2)]"><T k="pages.checkout.voucher" /></h2>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="label text-ink-soft"><T k="pages.checkout.code" /></span>
            <input id="voucher" value={draft.voucher} onChange={(e) => setDraft({ ...draft, voucher: e.target.value })}
              className="fig w-48 rounded-[var(--radius-sm)] border border-field bg-surface px-3 py-2 text-sm uppercase text-ink" />
          </label>
          <p className="text-xs text-ink-soft">{voucherNote}</p>
        </div>

        <button type="button" data-testid="pay-now" disabled={paying}
          onClick={() => {
            setPaying(true);
            const code = newCode();
            writeDraft({ ...draft, date, code });
            navigate(`/booking/${code}`);
          }}
          className="mt-10 rounded-[var(--radius-sm)] bg-accent px-8 py-3 text-sm text-accent-ink hover:opacity-90 disabled:opacity-60">
          <T k={paying ? "pages.checkout.paying" : "pages.checkout.payNow"} />
        </button>
        <T k="pages.checkout.after" as="p" className="mt-3 max-w-[48ch] text-xs text-ink-soft" />
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-[var(--radius-sm)] border border-line bg-surface p-5">
          <h2 className="text-base">{item.name}</h2>
          <p className="fig mt-1 text-sm text-ink-soft">{formatDate(date)} · {draft.adults + draft.children} <T k="pages.checkout.people" /></p>
          <dl className="mt-4 flex flex-col gap-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-ink-soft"><T k="pages.book.subtotal" /></dt><dd className="fig">{formatPrice(sums.subtotal)}</dd></div>
            {sums.extra > 0 && <div className="flex justify-between gap-4"><dt className="text-ink-soft"><T k="pages.book.pack" /></dt><dd className="fig">{formatPrice(sums.extra)}</dd></div>}
            {sums.discount > 0 && <div className="flex justify-between gap-4"><dt className="text-ink-soft"><T k="pages.checkout.discount" /></dt><dd className="fig text-accent">−{formatPrice(sums.discount)}</dd></div>}
            <div className="flex justify-between gap-4 border-t border-line pt-3">
              <dt><T k="pages.book.due" /></dt>
              <dd className="fig text-[length:var(--size-price)] leading-none" data-testid="checkout-total">{formatPrice(sums.due)}</dd>
            </div>
          </dl>
        </div>
      </aside>
    </section>
  );
}
