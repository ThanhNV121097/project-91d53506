import credits from "../credits.json";
import { T, useContent } from "../editable";

/**
 * Who took the stock photos on the site, and under which licence: one quiet
 * line for the footer — "Photos: Jane Doe (CC BY 2.0, Openverse) · …", each
 * name linking the photo's own page. Nothing shows while there is none.
 *
 * src/credits.json is the team's tools' to write, never by hand: save_photo
 * adds a photo's entry as it saves it, from what the library (find_photos)
 * says of it — { path, author, source, license, page } — and the Studio takes
 * the entry out when the owner puts their own picture in its place. Many of
 * these photos are CC BY, whose licence asks for exactly this credit, so
 * <PhotoCredits/> stays in the footer on every page. Style the line to the
 * design; keep what it says. The label is content (credits.label).
 */

interface Credit {
  path: string;
  author: string;
  source: string;
  license: string;
  page: string;
}

// Whatever the file holds, every field a string: a hand-made entry with a
// field missing shows less, never breaks the footer.
const all: Credit[] = (credits as unknown as Partial<Credit>[]).map((c) => ({
  path: String(c.path ?? ""),
  author: String(c.author ?? "").trim(),
  source: String(c.source ?? ""),
  license: String(c.license ?? ""),
  page: String(c.page ?? ""),
}));

/** One line per photo: the same photo saved at two places is credited once. */
const shown = all.filter(
  (c, i) => (c.author || c.source) && all.findIndex((o) => o.author === c.author && o.page === c.page && o.license === c.license) === i,
);

/** The terms in brackets: "CC BY 2.0, Openverse"; "Pexels License" where the licence names its library. */
function terms(c: Credit): string {
  const library = c.author && !c.license.includes(c.source) ? c.source : "";
  return [c.license, library].filter(Boolean).join(", ");
}

const isWebPage = (u: string) => /^https?:\/\//i.test(u);

export default function PhotoCredits({ className = "" }: { className?: string }) {
  const label = useContent<string | undefined>("credits.label");
  if (shown.length === 0) return null;
  return (
    <p className={`text-xs leading-relaxed text-ink-soft ${className}`}>
      {label && (
        <>
          <T k="credits.label" />:{" "}
        </>
      )}
      {shown.map((c, i) => (
        <span key={`${i}-${c.path}`}>
          {i > 0 && " · "}
          {isWebPage(c.page) ? (
            <a href={c.page} target="_blank" rel="noreferrer"
              className="underline decoration-line underline-offset-2 transition-colors hover:text-ink hover:decoration-current">
              {c.author || c.source}
            </a>
          ) : (
            c.author || c.source
          )}
          {terms(c) && ` (${terms(c)})`}
        </span>
      ))}
    </p>
  );
}
