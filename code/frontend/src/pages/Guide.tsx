import { Link, useParams } from "react-router-dom";
import { T } from "../editable";
import { useRecord, useCollection } from "../data";
import { Picture } from "../picture";
import { usePageMeta } from "../seo";
import { formatDate } from "../lib/format";

export default function Guide() {
  usePageMeta("pages.guide.title", "pages.guide.description");
  const { slug } = useParams();
  const { item } = useRecord("guides", slug);
  const more = useCollection("guides", { pageSize: 4 });
  if (!item) return <p className="mx-auto max-w-page px-[var(--gutter)] py-20 text-ink-soft"><T k="pages.guide.missing" /></p>;
  return (
    <article data-record={`guides:${item.id}`}>
      <div className="relative w-full overflow-hidden bg-ink" style={{ aspectRatio: "21 / 9" }}>
        <Picture src={String(item.image)} alt={String(item.title)} width={1800} height={771} loading="eager"
          className="absolute inset-0 h-full w-full object-cover" />
      </div>
      <div className="mx-auto max-w-page px-[var(--gutter)] py-10">
        <p className="label text-ink-soft">{String(item.category)} · <span className="fig">{formatDate(String(item.date))}</span></p>
        <h1 className="mt-2 max-w-[28ch] text-[length:var(--size-h1)]">{String(item.title)}</h1>
        <p className="mt-4 max-w-[58ch] text-lg text-ink-soft">{String(item.excerpt)}</p>
        <div className="mt-8 flex max-w-[62ch] flex-col gap-5 text-base leading-relaxed text-ink" data-testid="guide-body">
          {String(item.body).split("\n\n").map((p, i) => <p key={i}>{p}</p>)}
        </div>
        <div className="mt-14 border-t border-line pt-8">
          <h2 className="text-[length:var(--size-h2)]"><T k="pages.guide.more" /></h2>
          <ul className="mt-4">
            {more.items.filter((g) => g.id !== item.id).map((g) => (
              <li key={g.id} className="border-b border-line py-3">
                <Link to={`/guides/${g.id}`} className="flex items-baseline justify-between gap-4 text-ink hover:text-accent">
                  <span>{String(g.title)}</span>
                  <span className="fig shrink-0 text-xs text-ink-soft">{formatDate(String(g.date))}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}
