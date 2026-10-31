import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { T, useContent } from "../editable";
import { useRecord, useCollection } from "../data";
import { Picture } from "../picture";
import Icon from "../components/Icon";
import Rating from "../components/Rating";
import Reveal from "../components/Reveal";
import TripCard from "../components/TripCard";
import { usePageMeta } from "../seo";
import { formatPrice, formatDate } from "../lib/format";
import { useWishlist } from "../lib/mock/wishlist";
import type { Trip as TripRecord, Departure } from "../lib/trips";

export default function Trip() {
  usePageMeta("pages.trip.title", "pages.trip.description");
  const { id } = useParams();
  const { item } = useRecord<TripRecord>("products", id);
  const dates = useCollection<Departure>("departures", { where: { product: id ?? "" }, sort: "date", pageSize: 12 });
  const reviews = useCollection("reviews", { where: { product: id ?? "", status: "published" }, pageSize: 4 });
  const related = useCollection<TripRecord>("products", { where: { status: "approved" }, sort: "-rating", pageSize: 4 });
  const supplier = useRecord("suppliers", item?.supplier);
  const { has, toggle } = useWishlist();
  const [picked, setPicked] = useState("");
  if (!item) return <p className="mx-auto max-w-page px-[var(--gutter)] py-20 text-ink-soft"><T k="pages.trip.missing" /></p>;
  const date = picked || String(item.next_date);
  const chosen = dates.items.find((d) => d.date === date);
  return (
    <article data-record={`products:${item.id}`}>
      <section className="relative">
        <div className="relative w-full overflow-hidden bg-ink" style={{ aspectRatio: "21 / 9" }}>
          <Picture src={item.image} alt={item.name} width={1800} height={771} loading="eager"
            className="absolute inset-0 h-full w-full object-cover" />
        </div>
      </section>
      <div className="mx-auto grid max-w-page gap-10 px-[var(--gutter)] py-8 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <p className="label text-ink-soft">{item.kind} · {item.destination} · {item.duration}</p>
          <h1 className="mt-2 max-w-[26ch] text-[length:var(--size-h1)]">{item.name}</h1>
          <div className="mt-3 flex items-center gap-3 text-sm text-ink-soft">
            <Rating value={item.rating} />
            <span className="fig">{item.rating}</span>
            <span>(<span className="fig">{item.review_count}</span> <T k="pages.trip.reviews" />)</span>
            <span className="flex items-center gap-1"><Icon name="address" size={14} />{item.place}</span>
          </div>
          <p className="mt-5 max-w-[62ch] text-base leading-relaxed text-ink">{item.summary}</p>

          <h2 className="mt-12 text-[length:var(--size-h2)]"><T k="pages.trip.itinerary" /></h2>
          <ol className="mt-4 border-t border-line">
            {item.itinerary.map((line, i) => (
              <li key={i} className="flex gap-4 border-b border-line py-4">
                <span className="fig shrink-0 text-sm text-accent">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-sm leading-relaxed text-ink">{line}</span>
              </li>
            ))}
          </ol>

          <div className="mt-12 grid gap-8 sm:grid-cols-2">
            <div>
              <h2 className="text-base"><T k="pages.trip.includes" /></h2>
              <ul className="mt-3 flex flex-col gap-2 text-sm text-ink">
                {item.includes.map((x) => <li key={x} className="flex gap-2"><Icon name="check" size={16} className="text-accent" />{x}</li>)}
              </ul>
            </div>
            <div>
              <h2 className="text-base"><T k="pages.trip.excludes" /></h2>
              <ul className="mt-3 flex flex-col gap-2 text-sm text-ink-soft">
                {item.excludes.map((x) => <li key={x} className="flex gap-2"><Icon name="close" size={16} />{x}</li>)}
              </ul>
            </div>
          </div>

          <h2 className="mt-12 text-[length:var(--size-h2)]"><T k="pages.trip.calendar" /></h2>
          <T k="pages.trip.calendarSub" as="p" className="mt-2 text-sm text-ink-soft" />
          <ul className="mt-4 border-t border-line">
            {dates.items.map((d) => (
              <li key={d.id} data-record={`departures:${d.id}`}>
                <button type="button" disabled={d.state !== "Open"} onClick={() => setPicked(d.date)}
                  className={`flex w-full items-center justify-between gap-4 border-b border-line py-3 text-left disabled:opacity-50 ${date === d.date ? "text-accent" : "text-ink"}`}>
                  <span className="fig w-28 text-sm">{formatDate(d.date)}</span>
                  <span className="flex-1 truncate text-xs text-ink-soft">{d.season}{d.state !== "Open" ? ` · ${d.state}` : ""}</span>
                  <span className="fig w-20 text-right text-sm">{d.seats}</span>
                  <span className="fig w-32 text-right text-sm">{formatPrice(d.price)}</span>
                </button>
              </li>
            ))}
          </ul>

          <h2 className="mt-12 text-[length:var(--size-h2)]"><T k="pages.trip.policy" /></h2>
          <p className="mt-3 max-w-[62ch] text-sm text-ink">{item.policy || useContent("pages.trip.policyEmpty")}</p>

          <h2 className="mt-12 text-[length:var(--size-h2)]"><T k="pages.trip.supplier" /></h2>
          <div className="mt-3 rounded-[var(--radius-sm)] border border-line bg-surface p-5">
            <p className="text-base text-ink">{String(supplier.item?.name ?? "")}</p>
            <p className="mt-1 text-sm text-ink-soft">{String(supplier.item?.kind ?? "")} · {String(supplier.item?.place ?? "")}</p>
            <p className="mt-2 flex items-center gap-1 text-sm text-ink"><Icon name="secure" size={16} className="text-accent" />{String(supplier.item?.documents ?? "")}</p>
          </div>

          <h2 className="mt-12 text-[length:var(--size-h2)]"><T k="pages.trip.travellers" /></h2>
          <ul className="mt-4 border-t border-line">
            {reviews.items.map((r) => (
              <li key={r.id} data-record={`reviews:${r.id}`} className="border-b border-line py-4">
                <div className="flex items-center gap-3">
                  <Rating value={Number(r.rating) || 0} />
                  <span className="text-sm text-ink">{String(r.author) || useContent("pages.trip.reviewEmpty")}</span>
                  <span className="fig text-xs text-ink-soft">{formatDate(String(r.date))}</span>
                </div>
                {String(r.text) && <p className="mt-2 text-sm text-ink">{String(r.text)}</p>}
                {String(r.reply) && <p className="mt-2 border-l-2 border-line pl-3 text-sm text-ink-soft">{String(r.reply)}</p>}
              </li>
            ))}
          </ul>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[var(--radius-sm)] border border-line bg-surface p-5">
            <p className="label text-ink-soft"><T k="pages.trip.from" /></p>
            <p className="fig mt-1 text-[length:var(--size-price)] leading-none text-ink" data-testid="trip-price">{formatPrice(chosen?.price ?? item.price)}</p>
            <p className="mt-3 flex items-center gap-2 text-sm text-ink">
              <Icon name="date" size={16} /><span className="fig">{formatDate(date)}</span>
            </p>
            <p className="mt-1 flex items-center gap-2 text-sm text-accent">
              <Icon name="people" size={16} /><span className="fig">{chosen?.seats ?? item.seats}</span><T k="pages.trip.seats" />
            </p>
            <Link to={`/book/${item.id}?date=${date}`} data-testid="book-now"
              className="mt-5 block rounded-[var(--radius-sm)] bg-accent px-6 py-3 text-center text-sm text-accent-ink hover:opacity-90">
              <T k="pages.trip.book" />
            </Link>
            <button type="button" onClick={() => toggle(item.id)} data-testid="wishlist-toggle"
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-field px-6 py-3 text-sm text-ink hover:border-accent hover:text-accent">
              <Icon name="wishlist" size={16} />
              <T k={has(item.id) ? "pages.trip.saved" : "pages.trip.save"} />
            </button>
            <p className="mt-4 text-xs text-ink-soft">{item.confirmation || useContent("pages.trip.confirmEmpty")}</p>
          </div>
        </aside>
      </div>

      <Reveal className="mx-auto max-w-page px-[var(--gutter)]">
        <h2 className="text-[length:var(--size-h2)]"><T k="pages.trip.related" /></h2>
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {related.items.filter((t) => t.id !== item.id).slice(0, 4).map((t, i) => <TripCard key={t.id} trip={t} index={i} />)}
        </div>
      </Reveal>
    </article>
  );
}
