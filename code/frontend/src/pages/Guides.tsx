import { useSearchParams } from "react-router-dom";
import { T } from "../editable";
import { useCollection } from "../data";
import GuideCard from "../components/GuideCard";
import Grid from "../components/Grid";
import { usePageMeta } from "../seo";

export default function Guides() {
  usePageMeta("pages.guides.title", "pages.guides.description");
  const [params, setParams] = useSearchParams();
  const category = params.get("category") ?? "";
  const all = useCollection("guides", { pageSize: 20 });
  const { items, total, hasMore, loadMore } = useCollection("guides", {
    where: { category: category || undefined }, sort: "-date", pageSize: 6,
  });
  const categories = [...new Set(all.items.map((g) => String(g.category)))];
  return (
    <section className="mx-auto max-w-page px-[var(--gutter)] py-10">
      <T k="pages.guides.eyebrow" as="p" className="label text-ink-soft" />
      <T k="pages.guides.heading" as="h1" className="mt-2 max-w-[26ch] text-[length:var(--size-h1)]" />
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setParams({}, { replace: true })}
          className={`rounded-[var(--radius-pill)] border px-4 py-1.5 text-sm ${category ? "border-line text-ink" : "border-accent text-accent"}`}>
          <T k="pages.guides.all" />
        </button>
        {categories.map((c) => (
          <button key={c} type="button" onClick={() => setParams({ category: c }, { replace: true })}
            className={`rounded-[var(--radius-pill)] border px-4 py-1.5 text-sm ${category === c ? "border-accent text-accent" : "border-line text-ink"}`}>
            {c}
          </button>
        ))}
      </div>
      <p className="mt-6 text-sm text-ink-soft"><span className="fig">{total}</span> <T k="pages.guides.count" /></p>
      <Grid count={items.length} max={3} className="mt-4">
        {items.map((g, i) => <GuideCard key={g.id} guide={g} index={i} excerpt />)}
      </Grid>
      {hasMore && (
        <button type="button" onClick={loadMore} className="mt-8 rounded-[var(--radius-sm)] border border-field px-6 py-3 text-sm text-ink hover:border-accent hover:text-accent">
          <T k="pages.search.more" />
        </button>
      )}
    </section>
  );
}
