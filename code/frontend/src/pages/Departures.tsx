import { Link } from "react-router-dom";
import { T, useContent } from "../editable";
import { useCollection } from "../data";
import Select from "../components/Select";
import { useSearchParams } from "react-router-dom";
import { usePageMeta } from "../seo";
import { formatPrice, formatDate } from "../lib/format";
import type { Departure } from "../lib/trips";

/** The board: every open departure, dates and figures right-aligned in mono. */
export default function Departures() {
  usePageMeta("pages.departures.title", "pages.departures.description");
  const [params, setParams] = useSearchParams();
  const season = params.get("season") ?? "";
  const { items, total, hasMore, loadMore, loading } = useCollection<Departure>("departures", {
    where: { season: season || undefined },
    sort: "date",
    pageSize: 10,
  });
  return (
    <section className="mx-auto max-w-page px-[var(--gutter)] py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <T k="pages.departures.eyebrow" as="p" className="label text-ink-soft" />
          <T k="pages.departures.heading" as="h1" className="mt-2 text-[length:var(--size-h1)]" />
        </div>
        <span className="flex flex-col gap-1">
          <span className="label text-ink-soft"><T k="pages.departures.season" /></span>
          <Select value={season} aria-label={useContent("pages.departures.season")}
            placeholder={useContent("pages.departures.allSeasons")}
            onChange={(v) => {
              const next = new URLSearchParams(params);
              if (v) next.set("season", v); else next.delete("season");
              setParams(next, { replace: true });
            }}
            options={[{ value: "Standard", label: "Standard" }, { value: "Weekend", label: "Weekend" }, { value: "Peak summer", label: "Peak summer" }]} />
        </span>
      </div>

      <p className="mt-6 text-sm text-ink-soft"><span className="fig">{total}</span> <T k="pages.departures.count" /></p>

      <table className="mt-4 w-full border-collapse text-left text-sm">
        <caption className="sr-only">{useContent("pages.departures.heading")}</caption>
        <thead>
          <tr className="border-y border-line">
            <th scope="col" className="label py-3 pr-4 font-normal text-ink-soft"><T k="pages.departures.date" /></th>
            <th scope="col" className="label py-3 pr-4 font-normal text-ink-soft"><T k="pages.departures.trip" /></th>
            <th scope="col" className="label hidden py-3 pr-4 font-normal text-ink-soft lg:table-cell"><T k="pages.departures.rule" /></th>
            <th scope="col" className="label py-3 pr-4 text-right font-normal text-ink-soft"><T k="pages.departures.seats" /></th>
            <th scope="col" className="label py-3 text-right font-normal text-ink-soft"><T k="pages.departures.price" /></th>
          </tr>
        </thead>
        <tbody>
          {items.map((d) => (
            <tr key={d.id} data-record={`departures:${d.id}`} className="border-b border-line">
              <td className="fig py-3 pr-4 text-ink-soft">{formatDate(d.date)}</td>
              <td className="py-3 pr-4">
                <Link to={`/tours/${d.product}`} className="text-ink hover:text-accent">{d.product_name}</Link>
              </td>
              <td className="hidden py-3 pr-4 text-ink-soft lg:table-cell">{d.season}{d.state !== "Open" ? ` · ${d.state}` : ""}</td>
              <td className={`fig py-3 pr-4 text-right ${d.seats <= 4 ? "text-accent" : "text-ink"}`}>{d.seats}</td>
              <td className="fig py-3 text-right text-ink">{formatPrice(d.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {loading && <p className="mt-4 text-sm text-ink-soft"><T k="pages.search.loading" /></p>}
      {hasMore && (
        <button type="button" onClick={loadMore} className="mt-8 rounded-[var(--radius-sm)] border border-field px-6 py-3 text-sm text-ink hover:border-accent hover:text-accent">
          <T k="pages.search.more" />
        </button>
      )}
    </section>
  );
}
