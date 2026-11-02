import { Link } from "react-router-dom";
import { T, useContent } from "../editable";
import Icon from "./Icon";
import { formatPrice, formatDate } from "../lib/format";
import { useWishlist } from "../lib/mock/wishlist";

/** The booking panel beside a trip: the price for the chosen date, and the action. */
export default function TripBooking({ id, date, price, seats, confirmation }: {
  id: string;
  date: string;
  price: number;
  seats: number;
  confirmation: string;
}) {
  const { has, toggle } = useWishlist();
  const waiting = useContent("pages.trip.confirmEmpty");
  return (
    <div className="rounded-[var(--radius-sm)] border border-line bg-surface p-5">
      <p className="label text-ink-soft"><T k="pages.trip.from" /></p>
      <p className="fig mt-1 text-[length:var(--size-price)] leading-none text-ink" data-testid="trip-price">{formatPrice(price)}</p>
      <p className="mt-3 flex items-center gap-2 text-sm text-ink">
        <Icon name="date" size={16} /><span className="fig">{formatDate(date)}</span>
      </p>
      <p className="mt-1 flex items-center gap-2 text-sm text-accent">
        <Icon name="people" size={16} /><span className="fig">{seats}</span><T k="pages.trip.seats" />
      </p>
      <Link to={`/book/${id}?date=${date}`} data-testid="book-now"
        className="mt-5 block rounded-[var(--radius-sm)] bg-accent px-6 py-3 text-center text-sm text-accent-ink hover:opacity-90">
        <T k="pages.trip.book" />
      </Link>
      <button type="button" onClick={() => toggle(id)} data-testid="wishlist-toggle"
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-field px-6 py-3 text-sm text-ink hover:border-accent hover:text-accent">
        <Icon name="wishlist" size={16} />
        <T k={has(id) ? "pages.trip.saved" : "pages.trip.save"} />
      </button>
      <p className="mt-4 text-xs text-ink-soft">{confirmation || waiting}</p>
    </div>
  );
}
