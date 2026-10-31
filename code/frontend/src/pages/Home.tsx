import { Link } from "react-router-dom";
import { T, useContent } from "../editable";
import { useCollection } from "../data";
import { Picture } from "../picture";
import SearchRow from "../components/SearchRow";
import TripCard from "../components/TripCard";
import Reveal from "../components/Reveal";
import Rail from "../components/Rail";
import Icon from "../components/Icon";
import Grid from "../components/Grid";
import { formatPrice, formatDate } from "../lib/format";
import type { Trip, Departure } from "../lib/trips";

export default function Home() {
  const featured = useCollection<Trip>("products", { where: { status: "approved" }, sort: "-rating", pageSize: 4 });
  const places = useCollection("destinations", { pageSize: 4 });
  const kinds = useCollection("categories", { pageSize: 5 });
  const board = useCollection<Departure>("departures", { where: { state: "Open" }, sort: "date", pageSize: 6 });
  const guides = useCollection("guides", { pageSize: 3 });
  return (
    <>
      <section className="relative border-b border-line bg-surface">
        <Rail k="home.rail" />
        <div className="w-full px-[var(--gutter)] py-4">
          <SearchRow />
        </div>
      </section>

      <section className="relative mx-auto max-w-page px-[var(--gutter)] pt-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <T k="home.eyebrow" as="p" className="label text-ink-soft" />
            <T k="home.headline" as="h1" className="mt-2 max-w-[22ch] text-[length:var(--size-h1)]" />
          </div>
          <T k="home.sub" as="p" className="max-w-[42ch] text-sm text-ink-soft" />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {featured.items.map((trip, i) => (
            <TripCard key={trip.id} trip={trip} index={i} eager={i < 2} />
          ))}
        </div>
        <p className="mt-4 flex items-center justify-between text-sm text-ink-soft">
          <span><span className="fig" data-testid="home-total">{featured.total}</span> <T k="home.count" /></span>
          <Link to="/search" className="flex items-center gap-1 text-ink hover:text-accent">
            <T k="home.all" /><Icon name="next" size={16} />
          </Link>
        </p>
      </section>

      <Reveal className="mx-auto mt-20 max-w-page px-[var(--gutter)]">
        <T k="home.places.heading" as="h2" className="text-[length:var(--size-h2)]" />
        <T k="home.places.sub" as="p" className="mt-2 max-w-[48ch] text-sm text-ink-soft" />
        <Grid count={places.items.length} max={4} className="mt-6">
          {places.items.map((p) => (
            <Link key={p.id} to={`/search?where=${encodeURIComponent(String(p.name))}`} data-record={`destinations:${p.id}`}
              className="group relative block overflow-hidden rounded-[var(--radius-sm)] bg-ink" style={{ aspectRatio: "4 / 5" }}>
              <Picture src={String(p.image)} alt={String(p.name)} width={800} height={1000}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-[var(--duration-base)] group-hover:scale-[1.03]" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink to-transparent p-4 pt-14 text-surface">
                <h3 className="text-lg">{String(p.name)}</h3>
                <p className="text-xs text-surface/80">{String(p.line)}</p>
                <p className="fig mt-1 text-sm">{formatPrice(p.from_price as number)}</p>
              </div>
            </Link>
          ))}
        </Grid>
      </Reveal>

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

      <Reveal className="mx-auto mt-20 max-w-page px-[var(--gutter)]">
        <div className="flex items-end justify-between gap-4">
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
            <li key={d.id} data-record={`departures:${d.id}`} className="flex items-center justify-between gap-4 border-b border-line py-3">
              <span className="fig w-28 shrink-0 text-sm text-ink-soft">{formatDate(d.date)}</span>
              <Link to={`/tours/${d.product}`} className="flex-1 truncate text-sm text-ink hover:text-accent">{d.product_name}</Link>
              <span className="fig w-20 shrink-0 text-right text-sm text-accent">{d.seats}</span>
              <span className="fig w-32 shrink-0 text-right text-sm text-ink">{formatPrice(d.price)}</span>
            </li>
          ))}
        </ul>
      </Reveal>

      <Reveal className="mx-auto mt-20 max-w-page px-[var(--gutter)]">
        <T k="home.guides.heading" as="h2" className="text-[length:var(--size-h2)]" />
        <Grid count={guides.items.length} max={3} className="mt-6">
          {guides.items.map((g) => (
            <Link key={g.id} to={`/guides/${g.id}`} data-record={`guides:${g.id}`} className="group block">
              <div className="relative overflow-hidden rounded-[var(--radius-sm)] bg-ink" style={{ aspectRatio: "4 / 3" }}>
                <Picture src={String(g.image)} alt={String(g.title)} width={800} height={600}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-[var(--duration-base)] group-hover:scale-[1.03]" />
              </div>
              <p className="label mt-3 text-ink-soft">{String(g.category)} · <span className="fig">{formatDate(String(g.date))}</span></p>
              <h3 className="mt-1 text-base leading-snug text-ink group-hover:text-accent">{String(g.title)}</h3>
            </Link>
          ))}
        </Grid>
      </Reveal>

      <Reveal className="mx-auto mt-20 max-w-page px-[var(--gutter)]">
        <div className="flex flex-col gap-4 border-t border-line pt-10 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <T k="home.suppliers.heading" as="h2" className="text-[length:var(--size-h2)]" />
            <T k="home.suppliers.sub" as="p" className="mt-2 max-w-[52ch] text-sm text-ink-soft" />
          </div>
          <Link to="/register" data-testid="home-supplier-cta" className="inline-block whitespace-nowrap rounded-[var(--radius-sm)] bg-accent px-6 py-3 text-sm text-accent-ink hover:opacity-90">
            {useContent("home.suppliers.cta")}
          </Link>
        </div>
      </Reveal>
    </>
  );
}
