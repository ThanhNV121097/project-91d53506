import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { T, useContent } from "../editable";
import { useRecord } from "../data";
import { Picture } from "../picture";
import Icon from "../components/Icon";
import Select from "../components/Select";
import { usePageMeta } from "../seo";
import { formatPrice, formatDate } from "../lib/format";
import { useSession } from "../lib/session";
import { emptyDraft, writeDraft, PACKS, total, HOLD_MINUTES } from "../lib/mock/booking";
import type { Trip } from "../lib/trips";

export default function Book() {
  usePageMeta("pages.book.title", "pages.book.description");
  const { id } = useParams();
  const [params] = useSearchParams();
  const { item } = useRecord<Trip>("products", id);
  const session = useSession();
  const navigate = useNavigate();
  const [draft, setDraft] = useState(() => emptyDraft(id ?? "", params.get("date") ?? ""));
  const [left, setLeft] = useState(HOLD_MINUTES * 60);
  useEffect(() => {
    const t = window.setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => {
      window.clearInterval(t);
    };
  }, []);
  const packLabel = useContent("pages.book.pack");
  const field = "w-full rounded-[var(--radius-sm)] border border-field bg-surface px-3 py-2 text-sm text-ink appearance-none";
  if (!item) return <p className="mx-auto max-w-page px-[var(--gutter)] py-20 text-ink-soft"><T k="pages.trip.missing" /></p>;
  const date = draft.date || item.next_date;
  const sums = total(item.price, draft);
  return (
    <section className="mx-auto grid max-w-page gap-10 px-[var(--gutter)] py-10 lg:grid-cols-[1.4fr_1fr]">
      <div>
        <T k="pages.book.heading" as="h1" className="text-[length:var(--size-h1)]" />
        <p className="mt-2 flex items-center gap-2 text-sm text-accent">
          <Icon name="hours" size={16} />
          <T k="pages.book.hold" />
          <span className="fig" data-testid="hold-timer">{String(Math.floor(left / 60)).padStart(2, "0")}:{String(left % 60).padStart(2, "0")}</span>
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const bad = missingFields(draft);
            setErrors(bad);
            if (Object.values(bad).some(Boolean)) return;
            if (draft.adults + draft.children > remaining) {
              setSeatsError(seatsErrorText);
              return;
            }
            setSeatsError("");
            const next = { ...draft, date };
            writeDraft(next);
            navigate(`/checkout/${item.id}`);
          }}
          className="mt-8 flex flex-col gap-5"
        >
          {seatsError && <p role="alert" className="text-sm text-ink">{seatsError}</p>}
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="label text-ink-soft"><T k="pages.book.date" /></span>
              <input id="date" type="date" value={date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className={`${field} fig`} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="label text-ink-soft"><T k="pages.book.adults" /></span>
              <input id="adults" type="number" min={1} max={60} value={draft.adults}
                onChange={(e) => setDraft({ ...draft, adults: Number(e.target.value) || 1 })} className={`${field} fig text-right`} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="label text-ink-soft"><T k="pages.book.children" /></span>
              <input id="children" type="number" min={0} max={30} value={draft.children}
                onChange={(e) => setDraft({ ...draft, children: Number(e.target.value) || 0 })} className={`${field} fig text-right`} />
            </label>
          </div>

          <span className="flex flex-col gap-1">
            <span className="label text-ink-soft"><T k="pages.book.pack" /></span>
            <Select id="pack" value={draft.pack} onChange={(v) => setDraft({ ...draft, pack: v || "standard" })}
              aria-label={packLabel} placeholder="Standard"
              options={PACKS.map((p) => ({ value: p.id, label: p.extra ? `${p.label} (+${formatPrice(p.extra)})` : p.label }))} />
          </span>

          <h2 className="mt-4 text-[length:var(--size-h2)]"><T k="pages.book.travellerHeading" /></h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="label text-ink-soft"><T k="pages.book.name" /></span>
              <input id="name" required aria-invalid={errors.name} value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={field} />
              {errors.name && <span role="alert" className="text-xs text-ink"><T k="pages.book.nameError" /></span>}
            </label>
            <label className="flex flex-col gap-1">
              <span className="label text-ink-soft"><T k="pages.book.phone" /></span>
              <input id="phone" required aria-invalid={errors.phone} inputMode="tel" value={draft.phone}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })} className={`${field} fig`} />
              {errors.phone && <span role="alert" className="text-xs text-ink"><T k="pages.book.phoneError" /></span>}
            </label>
            <label className="flex flex-col gap-1">
              <span className="label text-ink-soft"><T k="pages.book.email" /></span>
              <input id="email" type="email" required aria-invalid={errors.email} value={draft.email || session?.email || ""}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })} className={field} />
              {errors.email && <span role="alert" className="text-xs text-ink"><T k="pages.book.emailError" /></span>}
            </label>
            <label className="flex flex-col gap-1">
              <span className="label text-ink-soft"><T k="pages.book.note" /></span>
              <input id="note" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} className={field} />
            </label>
          </div>

          <button type="submit" data-testid="book-continue" className="mt-4 self-start rounded-[var(--radius-sm)] bg-accent px-6 py-3 text-sm text-accent-ink hover:opacity-90">
            <T k="pages.book.continue" />
          </button>
          {!session && <p className="text-xs text-ink-soft"><T k="pages.book.signinHint" /> <Link to="/signin" className="underline"><T k="nav.signin" /></Link></p>}
        </form>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="overflow-hidden rounded-[var(--radius-sm)] border border-line bg-surface">
          <div className="relative w-full bg-ink" style={{ aspectRatio: "4 / 3" }}>
            <Picture src={item.image} alt={item.name} width={800} height={600} className="absolute inset-0 h-full w-full object-cover" />
          </div>
          <div className="p-5">
            <h2 className="text-base">{item.name}</h2>
            <p className="fig mt-1 text-sm text-ink-soft">{formatDate(date)}</p>
            <dl className="mt-4 flex flex-col gap-2 border-t border-line pt-4 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-ink-soft"><T k="pages.book.perPerson" /></dt><dd className="fig">{formatPrice(item.price)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-ink-soft"><T k="pages.book.subtotal" /></dt><dd className="fig">{formatPrice(sums.subtotal)}</dd></div>
              {sums.extra > 0 && <div className="flex justify-between gap-4"><dt className="text-ink-soft"><T k="pages.book.pack" /></dt><dd className="fig">{formatPrice(sums.extra)}</dd></div>}
              <div className="flex justify-between gap-4 border-t border-line pt-3">
                <dt><T k="pages.book.due" /></dt>
                <dd className="fig text-[length:var(--size-price)] leading-none" data-testid="booking-total">{formatPrice(sums.due)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </aside>
    </section>
  );
}
