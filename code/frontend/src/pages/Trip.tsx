import { useState } from "react";
import { useParams } from "react-router-dom";
import { T, useContent } from "../editable";
import { useRecord, useCollection } from "../data";
import { Picture } from "../picture";
import Icon from "../components/Icon";
import Reveal from "../components/Reveal";
import TripCard from "../components/TripCard";
import TripDates from "../components/TripDates";
import TripReviews from "../components/TripReviews";
import TripBooking from "../components/TripBooking";
import { usePageMeta } from "../seo";
import type { Trip as TripRecord, Departure } from "../lib/trips";

export default function Trip() {
  usePageMeta("pages.trip.title", "pages.trip.description");
  const { id } = useParams();
  const { item } = useRecord<TripRecord>("products", id);
  const dates = useCollection<Departure>("departures", { where: { product: id ?? "" }, sort: "date", pageSize: 12 });
  const reviews = useCollection("reviews", { where: { product: id ?? "", status: "published" }, pageSize: 4 });
  const related = useCollection<TripRecord>("products", { where: { status: "approved" }, sort: "next_date", pageSize: 5 });
  const supplier = useRecord("suppliers", item?.supplier);
  const [picked, setPicked] = useState("");
  const policyEmpty = useContent("pages.trip.policyEmpty");
  if (!item) return <p className="mx-auto max-w-page px-[var(--gutter)] py-20 text-ink-soft"><T k="pages.trip.missing" /></p>;
  const date = picked || String(item.next_date);
  const chosen = dates.items.find((d) => d.date === date);
  return (
    <article data-record={`products:${item.id}`}>
      <div className="grid gap-0 lg:grid-cols-[1fr_1fr]">
        <div className="relative w-full overflow-hidden bg-ink" style={{ aspectRatio: "4 / 3" }}>
          <Picture src={item.image} alt={item.name} width={853} height={640} loading="eager"
            className="absolute inset-0 h-full w-full object-cover" />
        </div>
        <div className="flex flex-col justify-center px-[var(--gutter)] py-8">
          <p className="label text-ink-soft">{item.kind} · {item.destination} · {item.duration}</p>
          <h1 className="mt-2 max-w-[22ch] text-[length:var(--size-h1)]">{item.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
            <span className="flex items-center gap-1"><Icon name="address" size={14} />{item.place}</span>
            <span className="flex items-center gap-1"><Icon name="date" size={14} /><T k="pages.trip.nextDate" />{" "}<span className="fig">{formatDate(item.next_date)}</span></span>
          </div>
          <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-ink">{item.summary}</p>
        </div>
      </div>

      <div className="mx-auto grid max-w-page gap-10 px-[var(--gutter)] py-10 lg:grid-cols-[1.6fr_1fr]">
        <div className="min-w-0">
          <h2 className="text-[length:var(--size-h2)]"><T k="pages.trip.itinerary" /></h2>
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
          <TripDates dates={dates.items} picked={date} onPick={setPicked} />

          <h2 className="mt-12 text-[length:var(--size-h2)]"><T k="pages.trip.policy" /></h2>
          <p className="mt-3 max-w-[62ch] text-sm text-ink">{item.policy || policyEmpty}</p>

          <h2 className="mt-12 text-[length:var(--size-h2)]"><T k="pages.trip.supplier" /></h2>
          <div className="mt-3 rounded-[var(--radius-sm)] border border-line bg-surface p-5">
            <p className="text-base text-ink">{String(supplier.item?.name ?? "")}</p>
            <p className="mt-1 text-sm text-ink-soft">{String(supplier.item?.kind ?? "")} · {String(supplier.item?.place ?? "")}</p>
            <p className="mt-2 flex items-center gap-1 text-sm text-ink"><Icon name="secure" size={16} className="text-accent" />{String(supplier.item?.documents ?? "")}</p>
          </div>

          <h2 className="mt-12 text-[length:var(--size-h2)]"><T k="pages.trip.travellers" /></h2>
          <TripReviews reviews={reviews.items} />
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <TripBooking id={item.id} date={date} price={chosen?.price ?? item.price}
            seats={chosen?.seats ?? item.seats} confirmation={item.confirmation} />
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
