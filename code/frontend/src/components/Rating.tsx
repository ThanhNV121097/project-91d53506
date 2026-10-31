import { Star } from "lucide-react";

/**
 * A rating, drawn so a customer can read it at a glance.
 *
 * The obvious way to draw four stars out of five is to render four stars, and
 * it is wrong. lucide's <Star> is an OUTLINE: four outlines and five outlines
 * look the same across a card, and an outline is the universal symbol for a
 * mark nobody has given yet. A shop whose every review rendered five hollow
 * stars read as a shop nobody had rated.
 *
 * So: `value` filled marks in the accent colour, the rest outlined in the
 * line colour, always out of `max` — the shape of the row is the information.
 *
 *   <Rating value={t.rating} />
 *
 * `value` is rounded to the nearest whole mark and clamped into 0…max, because
 * a 4.7 from a database and a 7 from a typo must both draw something sane.
 */
export default function Rating({ value, max = 5, size = 16, label, className = "" }: {
  value: number;
  max?: number;
  size?: number;
  /** Read out instead of the stars; defaults to "4 out of 5". */
  label?: string;
  className?: string;
}) {
  const filled = Math.max(0, Math.min(max, Math.round(value || 0)));
  return (
    <span
      className={`inline-flex items-center gap-0.5 ${className}`}
      role="img"
      aria-label={label ?? `${filled} out of ${max}`}
    >
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          width={size}
          height={size}
          aria-hidden="true"
          className={i < filled ? "text-[var(--accent)]" : "text-[var(--line)]"}
          fill={i < filled ? "currentColor" : "none"}
          strokeWidth={1.5}
        />
      ))}
    </span>
  );
}
