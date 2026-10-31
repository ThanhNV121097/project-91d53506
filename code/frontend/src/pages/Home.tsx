import { Link } from "react-router-dom";
import { T, useContent } from "../editable";
import { useCollection } from "../data";
import { Picture } from "../picture";
import SearchRow from "../components/SearchRow";
import TripCard from "../components/TripCard";
import GuideCard from "../components/GuideCard";
import Reveal from "../components/Reveal";
import Rail from "../components/Rail";
import Icon from "../components/Icon";
import Grid from "../components/Grid";
import { formatPrice, formatDate } from "../lib/format";
import type { Trip, Departure } from "../lib/trips";

export default function Home() {
  const featured = useCollection<Trip>("products", { where: { status: "approved" }, sort: "next_date", pageSize: 4 });
  const places = useCollection("destinations", { pageSize: 4 });
  const kinds = useCollection("categories", { pageSize: 5 });
  const board = useCollection<Departure>("departures", { where: { state: "Open" }, sort: "date", pageSize: 6 });
  const guides = useCollection("guides", { pageSize: 3 });
  const supplierCta = useContent("home.suppliers.cta");
  return (
    <>
      <section className="border-b border-line bg-surface">
        <div className="w-full px-[var(--gutter)] py-4">
          <SearchRow />
        </div>
      </section>

      <section className="relative">
        <Rail k="home.rail" />
        <div className="relative w-full overflow-hidden bg-ink" style={{ aspectRatio: "32 / 9" }}>
          <Picture src="/images/hero-cua-lo.jpg" alt="The beach and the beach road at Cửa Lò"
            width={1280} height={720} loading="eager"
            className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink to-transparent" />
          <div className="absolute inset-0 mx-auto flex max-w-page flex-col justify-end px-[var(--gutter)] pb-6 text-surface">
            <T k="home.eyebrow" as="p" className="label text-surface/80" />
            <T k="home.headline" as="h1" className="mt-2 max-w-[20ch] text-[length:var(--size-h1)]" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-page px-[var(--gutter)] pt-6">
        <T k="home.sub" as="p" className="max-w-[58ch] text-sm text-ink-soft" />
        <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {featured.items.map((trip, i) => (
            <TripCard key={trip.id} trip={trip} index={i} eager={i < 2} />
          ))}
        </div>
        <p className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-ink-soft">
          <span><span className="fig" data-testid="home-total">{featured.total}</span> <T k="home.count" /></span>
          <Link to="/search" className="flex items-center gap-1 text-ink hover:text-accent">
            <T k="home.all" /><Icon name="next" size={16} />
          </Link>
        </p>
      </section>

      <Reveal className="mx-auto mt-20 max-w-page px-[var(--gutter)]">
        <div className="flex flex-wrap items-center gap-2">
          {kinds.items.map((k) => (
            <Link key={k.id} to={`/search?kind=${k.id}`} data-record={`categories:${k.id}`}
              className="flex items-center gap-2 rounded-[var(--radius-pill)] border border-line bg-surface px-4 py-2 text-sm text-ink hover:border-accent hover:text-accent">
              <Icon name={String(k.icon) as "people"} size={16} />{String(k.name)}
            </Link>
          ))}
        </div>
      </Reveal>

      <Reveal className="mx-auto mt-16 max-w-page px-[var(--gutter)]">
        <T k="home.places.heading" as="h2" className="text-[length:var(--size-h2)]" />
        <T k="home.places.sub" as="p" className="mt-2 max-w-[48ch] text-sm text-ink-soft" />
        <Grid count={places.items.length} max={4} className="mt-6">
          {places.items.map((p) => (
            <Link key={p.id} to={`/search?where=${encodeURIComponent(String(p.name))}`} data-record={`destinations:${p.id}`}
              className="group relative block h-full overflow-hidden rounded-[var(--radius-sm)] bg-ink" style={{ aspectRatio: "3 / 2" }}>
              <Picture src={String(p.image)} alt={String(p.name)} width={1200} height={800}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-[var(--duration-base)] group-hover:scale-[1.03]" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink to-transparent p-4 pt-12 text-surface">
                <h3 className="text-lg">{String(p.name)}</h3>
                <p className="text-xs text-surface/80">{String(p.line)}</p>
                <p className="fig mt-1 text-sm">{formatPrice(p.from_price as number)}</p>
              </div>
            </Link>
          ))}
        </Grid>
      </Reveal>

      <Reveal className="mx-auto mt-20 max-w-page px-[var(--gutter)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <T k="home.board.heading" as="h2" className="text-[length:var(--size-h2)]" />
            <T k="home.board.sub" as="p" className="mt-2 max-w-[48ch] text-sm text-ink-soft" />
          </div>
          <Link to="/departures" className="flex items-center gap-1 whitespace-nowrap text-sm text-ink hover:text-accent">
            <T k="home.board.all" /><Icon name="next" size={16} />
          </Link>
        </div>
        <ul className="mt-6 border-t border-line">
          {board.items.map((d) => (
            <li key={d.id} data-record={`departures:${d.id}`} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-line py-3">
              <span className="fig w-24 shrink-0 text-sm text-ink-soft">{formatDate(d.date)}</span>
              <span className="order-last w-full min-w-0 sm:order-none sm:w-auto sm:flex-1">
                <Link to={`/tours/${d.product}`} className="block truncate text-sm text-ink hover:text-accent">{d.product_name}</Link>
                <span className="block truncate text-xs text-ink-soft">{d.supplier_name}</span>
              </span>
              <span className="fig ml-auto w-14 shrink-0 text-right text-sm text-accent sm:ml-0">{d.seats}</span>
              <span className="fig w-28 shrink-0 text-right text-sm text-ink">{formatPrice(d.price)}</span>
            </li>
          ))}
        </ul>
      </Reveal>

      <Reveal className="mx-auto mt-20 max-w-page px-[var(--gutter)]">
        <T k="home.guides.heading" as="h2" className="text-[length:var(--size-h2)]" />
        <Grid count={guides.items.length} max={3} className="mt-6">
          {guides.items.map((g, i) => <GuideCard key={g.id} guide={g} index={i} />)}
        </Grid>
      </Reveal>

      <Reveal className="mx-auto mt-20 max-w-page px-[var(--gutter)]">
        <div className="flex flex-col gap-4 border-t border-line pt-10 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <T k="home.suppliers.heading" as="h2" className="text-[length:var(--size-h2)]" />
            <T k="home.suppliers.sub" as="p" className="mt-2 max-w-[52ch] text-sm text-ink-soft" />
          </div>
          <Link to="/register" data-testid="home-supplier-cta" className="inline-block self-start whitespace-nowrap rounded-[var(--radius-sm)] bg-accent px-6 py-3 text-sm text-accent-ink hover:opacity-90">
            {supplierCta}
          </Link>
        </div>
      </Reveal>
    </>
  );
}
