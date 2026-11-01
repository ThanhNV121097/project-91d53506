import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { T, useContent } from "../editable";
import { useCollection, useRecord, setCollection, type Row } from "../data";
import { Picture } from "../picture";
import Icon from "../components/Icon";
import { usePageMeta } from "../seo";
import { formatPrice, formatDate } from "../lib/format";
import { readDraft, writeDraft, emptyDraft, total, newCode, PAYMENTS } from "../lib/mock/booking";
import { checkVoucher, type VoucherRejection } from "../lib/mock/voucher-and-discount-code-checkout";
import type { Trip } from "../lib/trips";

export default function Checkout() {
  usePageMeta("pages.checkout.title", "pages.checkout.description");
  const { id } = useParams();
  const { item } = useRecord<Trip>("products", id);
  const navigate = useNavigate();
  const [draft, setDraft] = useState(() => readDraft() ?? emptyDraft(id ?? ""));
  const [paying, setPaying] = useState(false);
  const [applied, setApplied] = useState<{ id: string; code: string; amount: number } | null>(null);
  const [voucherError, setVoucherError] = useState<VoucherRejection | null>(null);
  const voucherNote = useContent("pages.checkout.voucherNote");
  const appliedLabel = useContent("pages.checkout.voucherApplied");
  const vouchers = useCollection<Row>("vouchers", { pageSize: 500 }).items;
  if (!item) return <p className="mx-auto max-w-page px-[var(--gutter)] py-20 text-ink-soft"><T k="pages.trip.missing" /></p>;
  const base = total(item.price, { ...draft, voucher: "" });
  const discount = applied?.amount ?? 0;
  const due = base.subtotal + base.extra - discount;
  const date = draft.date || item.next_date;

  function applyVoucher() {
    const code = draft.voucher.trim();
    if (!code) {
      setVoucherError(null);
      setApplied(null);
      return;
    }
    const result = checkVoucher(code, vouchers, base.subtotal + base.extra);
    if (!result.ok || !result.voucher) {
      setApplied(null);
      setVoucherError(result.rejection ?? "NOT_FOUND");
      return;
    }
    setVoucherError(null);
    // A voucher already applied to this booking is never applied twice (BOOKING-002.4).
    if (applied?.id === result.voucher.id) return;
    setApplied({ id: result.voucher.id, code: String(result.voucher.code), amount: result.amount });
    setCollection("vouchers", vouchers.map((v) => (v.id === result.voucher!.id ? { ...v, used: Number(v.used ?? 0) + 1 } : v)));
  }

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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            applyVoucher();
          }}
          className="mt-3 flex flex-wrap items-end gap-3"
        >
          <label className="flex flex-col gap-1">
            <span className="label text-ink-soft"><T k="pages.checkout.code" /></span>
            <input id="voucher" value={draft.voucher} onChange={(e) => setDraft({ ...draft, voucher: e.target.value })}
              className="fig w-48 rounded-[var(--radius-sm)] border border-field bg-surface px-3 py-2 text-sm uppercase text-ink" />
          </label>
          <button type="submit" data-testid="voucher-apply"
            className="rounded-[var(--radius-sm)] border border-field px-6 py-2.5 text-sm text-ink hover:border-accent hover:text-accent">
            <T k="pages.checkout.apply" />
          </button>
        </form>
        {voucherError ? (
          <p role="alert" data-testid="voucher-error" className="mt-2 text-sm text-ink">
            <T k={`pages.checkout.voucherError.${voucherError}`} />
          </p>
        ) : applied ? (
          <p data-testid="voucher-applied" className="mt-2 text-sm text-ink">
            {appliedLabel} <span className="fig text-accent">{applied.code}</span>
          </p>
        ) : (
          <p className="mt-2 text-xs text-ink-soft">{voucherNote}</p>
        )}

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
        <div className="overflow-hidden rounded-[var(--radius-sm)] border border-line bg-surface">
        <div className="relative w-full bg-ink" style={{ aspectRatio: "3 / 2" }}>
          <Picture src={item.image} alt={item.name} width={1200} height={800}
            className="absolute inset-0 h-full w-full object-cover" />
        </div>
        <div className="p-5">
          <h2 className="text-base">{item.name}</h2>
          <p className="fig mt-1 text-sm text-ink-soft">{formatDate(date)} · {draft.adults + draft.children} <T k="pages.checkout.people" /></p>
          <dl className="mt-4 flex flex-col gap-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-ink-soft"><T k="pages.book.subtotal" /></dt><dd className="fig">{formatPrice(base.subtotal)}</dd></div>
            {base.extra > 0 && <div className="flex justify-between gap-4"><dt className="text-ink-soft"><T k="pages.book.pack" /></dt><dd className="fig">{formatPrice(base.extra)}</dd></div>}
            {discount > 0 && <div className="flex justify-between gap-4"><dt className="text-ink-soft"><T k="pages.checkout.discount" /></dt><dd className="fig text-accent">−{formatPrice(discount)}</dd></div>}
            <div className="flex justify-between gap-4 border-t border-line pt-3">
              <dt><T k="pages.book.due" /></dt>
              <dd className="fig text-[length:var(--size-price)] leading-none" data-testid="checkout-total">{formatPrice(due)}</dd>
            </div>
          </dl>
        </div>
        </div>
        <div className="mt-4 rounded-[var(--radius-sm)] border border-line bg-surface p-5">
          <p className="flex items-center gap-2 text-sm text-ink">
            <Icon name="hours" size={16} className="text-accent" /><T k="pages.checkout.holdHeading" />
          </p>
          <T k="pages.checkout.holdNote" as="p" className="mt-2 text-xs text-ink-soft" />
          <p className="mt-4 flex items-center gap-2 border-t border-line pt-4 text-sm text-ink">
            <Icon name="secure" size={16} className="text-accent" /><T k="pages.checkout.secure" />
          </p>
          <T k="pages.checkout.policy" as="p" className="mt-2 text-xs text-ink-soft" />
        </div>
      </aside>
    </section>
  );
}
