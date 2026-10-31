import { Link } from "react-router-dom";
import { T } from "../editable";
import { useCollection } from "../data";
import TripCard from "../components/TripCard";
import { usePageMeta } from "../seo";
import { useWishlist } from "../lib/mock/wishlist";
import { useDemo } from "../lib/demo";
import type { Trip } from "../lib/trips";

export default function Wishlist() {
  usePageMeta("pages.wishlist.title", "pages.wishlist.description");
  const { ids } = useWishlist();
  const demo = useDemo();
  const { items } = useCollection<Trip>("products", { where: { status: "approved" }, pageSize: 12 });
  const example = ["cua-lo-beach-2n1d", "thanh-chuong-tea-walk", "pu-mat-boat-jeep"];
  const saved = ids.length > 0 ? ids : demo ? example : [];
  const shown = items.filter((t) => saved.includes(t.id));
  return (
    <section className="mx-auto max-w-page px-[var(--gutter)] py-10">
      <T k="pages.wishlist.heading" as="h1" className="text-[length:var(--size-h1)]" />
      {shown.length === 0 ? (
        <div className="mt-6">
          <T k="pages.wishlist.empty" as="p" className="max-w-[48ch] text-sm text-ink-soft" />
          <Link to="/search" className="mt-4 inline-block rounded-[var(--radius-sm)] bg-accent px-6 py-3 text-sm text-accent-ink"><T k="pages.wishlist.browse" /></Link>
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm text-ink-soft"><span className="fig">{shown.length}</span> <T k="pages.wishlist.count" /></p>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {shown.map((t, i) => <TripCard key={t.id} trip={t} index={i} />)}
          </div>
        </>
      )}
    </section>
  );
}
