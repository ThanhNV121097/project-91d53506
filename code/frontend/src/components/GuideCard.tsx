import { Link } from "react-router-dom";
import { Picture } from "../picture";
import { formatDate } from "../lib/format";
import type { Row } from "../data";

/** A guide: its photograph at the files' own 3:2, then its category, date and title. */
export default function GuideCard({ guide, index = 0, excerpt = false }: { guide: Row; index?: number; excerpt?: boolean }) {
  const summary = String(guide.excerpt ?? "");
  return (
    <Link to={`/guides/${guide.id}`} data-record={`guides:${guide.id}`} data-testid={`guide-card-${index}`}
      className="group flex h-full flex-col">
      <div className="overflow-hidden rounded-[var(--radius-sm)] bg-ink">
        <Picture src={String(guide.image)} alt={String(guide.title)} width={1280} height={853}
          className="block h-auto w-full transition-transform duration-[var(--duration-base)] group-hover:scale-[1.03]" />
      </div>
      <p className="label mt-3 text-ink-soft">{String(guide.category)} · <span className="fig">{formatDate(String(guide.date))}</span></p>
      <h3 className="mt-1 text-base leading-snug text-ink group-hover:text-accent">{String(guide.title)}</h3>
      {excerpt && <p className="mt-2 text-sm text-ink-soft">{summary}</p>}
    </Link>
  );
}
