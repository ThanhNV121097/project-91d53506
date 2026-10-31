import Rating from "./Rating";
import { useContent } from "../editable";
import { formatDate } from "../lib/format";
import type { Row } from "../data";

/** What travellers wrote, and the supplier's reply where there is one. */
export default function TripReviews({ reviews }: { reviews: readonly Row[] }) {
  const waiting = useContent("pages.trip.reviewEmpty");
  return (
    <ul className="mt-4 border-t border-line">
      {reviews.map((r) => {
        const author = String(r.author ?? "");
        const text = String(r.text ?? "");
        const reply = String(r.reply ?? "");
        return (
          <li key={r.id} data-record={`reviews:${r.id}`} className="border-b border-line py-4">
            <div className="flex items-center gap-3">
              <Rating value={Number(r.rating) || 0} />
              <span className="text-sm text-ink">{author || waiting}</span>
              <span className="fig text-xs text-ink-soft">{formatDate(String(r.date ?? ""))}</span>
            </div>
            {text && <p className="mt-2 text-sm text-ink">{text}</p>}
            {reply && <p className="mt-2 border-l-2 border-line pl-3 text-sm text-ink-soft">{reply}</p>}
          </li>
        );
      })}
    </ul>
  );
}
