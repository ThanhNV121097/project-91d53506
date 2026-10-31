import { Link } from "react-router-dom";
import { Picture } from "../picture";
import { formatPrice, formatDate } from "../lib/format";
import Icon from "./Icon";
import type { Trip } from "../lib/trips";

/**
 * A bookable product: the photograph IS the card, 4:5, with the name and the
 * mono price over a bottom scrim and the seats left in the accent.
 */
export default function TripCard({ trip, eager = false, index = 0 }: { trip: Trip; eager?: boolean; index?: number }) {
  return (
    <Link
      to={`/tours/${trip.id}`}
      data-record={`products:${trip.id}`}
      data-testid={`trip-card-${index}`}
      className="group relative block overflow-hidden rounded-[var(--radius-sm)] bg-ink"
      style={{ aspectRatio: "4 / 5" }}
    >
      <Picture
        src={trip.image}
        alt={trip.name}
        width={800}
        height={1000}
        loading={eager ? "eager" : "lazy"}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-[var(--duration-base)] group-hover:scale-[1.03]"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink to-transparent p-4 pt-16 text-surface">
        <p className="label text-surface/80">{trip.destination} · {trip.duration}</p>
        <h3 className="mt-1 text-base leading-snug">{trip.name}</h3>
        <p className="fig mt-2 text-[length:var(--size-price)] leading-none">{formatPrice(trip.price)}</p>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="fig text-surface/80">{formatDate(trip.next_date)}</span>
          <span className="flex items-center gap-1 text-accent">
            <Icon name="people" size={14} />
            <span className="fig">{trip.seats}</span>
            <span>seats left</span>
          </span>
        </p>
      </div>
    </Link>
  );
}
