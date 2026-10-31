import { useSearchParams, Link } from "react-router-dom";
import { T, useContent } from "../editable";
import { useCollection } from "../data";
import SearchRow from "../components/SearchRow";
import TripCard from "../components/TripCard";
import Select from "../components/Select";
import Icon from "../components/Icon";
import { usePageMeta } from "../seo";
import { formatPrice } from "../lib/format";
import type { Trip } from "../lib/trips";

export default function Search() {
  usePageMeta("pages.search.title", "pages.search.description");
  const [params, setParams] = useSearchParams();
  const where = params.get("where") ?? "";
  const kind = params.get("kind") ?? "";
  const max = params.get("max") ?? "";
  const duration = params.get("duration") ?? "";
  const sort = params.get("sort") ?? "price";
  const kinds = useCollection("categories", { pageSize: 10 });
  const { items, total, hasMore, loading, loadMore } = useCollection<Trip>("products", {
    where: {
      status: "approved",
      destination: where || undefined,
      kind: kind || undefined,
      price: max ? { to: Number(max) } : undefined,
      rating: rating ? { from: Number(rating) } : undefined,
      duration: duration || undefined,
    },
    sort,
    pageSize: 8,
  });
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };
  return (
    <>
      <section className="border-b border-line bg-surface">
        <div className="w-full px-[var(--gutter)] py-4">
          <SearchRow initial={{ where, max, people: params.get("people") ?? "2", date: params.get("date") ?? "" }} />
        </div>
      </section>
      <section className="mx-auto max-w-page px-[var(--gutter)] py-8">
        <T k="pages.search.heading" as="h1" className="text-[length:var(--size-h1)]" />
        <div className="mt-6 flex flex-wrap items-end gap-3">
          <span className="flex flex-col gap-1">
            <span className="label text-ink-soft"><T k="pages.search.kind" /></span>
            <Select value={kind} onChange={(v) => set("kind", v)} aria-label={useContent("pages.search.kind")}
              placeholder={useContent("pages.search.allKinds")}
              options={kinds.items.map((k) => ({ value: String(k.id), label: String(k.name) }))} />
          </span>
          <span className="flex flex-col gap-1">
            <span className="label text-ink-soft"><T k="pages.search.duration" /></span>
            <Select value={duration} onChange={(v) => set("duration", v)} aria-label={useContent("pages.search.duration")}
              placeholder={useContent("pages.search.anyDuration")}
              options={[{ value: "Half day", label: "Half day" }, { value: "1 day", label: "1 day" }, { value: "2 days", label: "2 days" }, { value: "2 nights", label: "2 nights" }]} />
          </span>
          <span className="flex flex-col gap-1">
            <span className="label text-ink-soft"><T k="pages.search.rating" /></span>
            <Select value={rating} onChange={(v) => set("rating", v)} aria-label={useContent("pages.search.rating")}
              placeholder={useContent("pages.search.anyRating")}
              options={[{ value: "4.5", label: "4.5 and up" }, { value: "4", label: "4.0 and up" }]} />
          </span>
          <span className="flex flex-col gap-1">
            <span className="label text-ink-soft"><T k="pages.search.sort" /></span>
            <Select value={sort} onChange={(v) => set("sort", v)} aria-label={useContent("pages.search.sort")}
              placeholder={useContent("pages.search.sort")}
              options={[{ value: "price", label: "Price, lowest first" }, { value: "-price", label: "Price, highest first" }, { value: "-rating", label: "Best rated" }, { value: "next_date", label: "Next departure" }]} />
          </span>
        </div>

        <p className="mt-6 text-sm text-ink-soft" data-testid="result-count">
          <span className="fig">{total}</span> <T k="pages.search.count" />
        </p>

        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {items.map((trip, i) => <TripCard key={trip.id} trip={trip} index={i} eager={i < 2} />)}
        </div>
        {loading && <p className="mt-6 text-sm text-ink-soft"><T k="pages.search.loading" /></p>}
        {items.length === 0 && !loading && <p className="mt-6 text-sm text-ink-soft"><T k="pages.search.none" /></p>}
        {hasMore && (
          <button type="button" onClick={loadMore} className="mt-8 rounded-[var(--radius-sm)] border border-field px-6 py-3 text-sm text-ink hover:border-accent hover:text-accent">
            <T k="pages.search.more" />
          </button>
        )}

        <div className="mt-16 border-t border-line pt-10">
          <T k="pages.search.map" as="h2" className="text-[length:var(--size-h2)]" />
          <T k="pages.search.mapSub" as="p" className="mt-2 max-w-[48ch] text-sm text-ink-soft" />
          <div className="relative mt-6 overflow-hidden rounded-[var(--radius-sm)] border border-line bg-surface" style={{ aspectRatio: "16 / 7" }}>
            <svg viewBox="0 0 100 44" className="absolute inset-0 h-full w-full text-line" aria-hidden="true">
              <path d="M4 30 L18 12 L40 8 L62 18 L86 10 L96 24 L80 40 L30 42 Z" fill="none" stroke="currentColor" strokeWidth="0.4" />
              <path d="M86 10 L96 24" stroke="currentColor" strokeWidth="0.8" />
            </svg>
            {items.map((trip) => (
              <Link key={trip.id} to={`/tours/${trip.id}`} aria-label={trip.name}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${trip.map_x}%`, top: `${trip.map_y}%` }}>
                <span className="fig flex items-center gap-1 rounded-[var(--radius-pill)] bg-ink px-2 py-1 text-[11px] text-surface hover:bg-accent">
                  <Icon name="address" size={12} />{formatPrice(trip.price)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
