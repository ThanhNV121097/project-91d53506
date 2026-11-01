import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { T, useList, useContent } from "../editable";
import Logo from "./Logo";
import Icon from "./Icon";
import MenuToggle from "./MenuToggle";
import MobileMenu from "./MobileMenu";
import { useSession } from "../lib/session";
import { useWishlist } from "../lib/mock/wishlist";

export default function Header() {
  const links = useList<{ label: string; href: string }>("nav.links");
  const name = useContent("site.name");
  const rawCtaHref = useContent("nav.cta.href");
  const ctaHref = rawCtaHref && rawCtaHref.startsWith("/") ? rawCtaHref : "/search";
  const [open, setOpen] = useState(false);
  const session = useSession();
  const { ids } = useWishlist();
  const { pathname } = useLocation();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ground/95 backdrop-blur-none">
      <div className="mx-auto flex max-w-page items-center justify-between gap-4 px-[var(--gutter)] py-3">
        <Link to="/" aria-label={name} className="flex items-center"><Logo /></Link>
        <nav aria-label="Pages" className="hidden items-center gap-7 text-sm lg:flex">
          {links.map((l, i) => (
            <Link key={l.href} to={l.href} className={`hover:text-accent ${pathname === l.href ? "text-accent" : "text-ink"}`}>
              <T k={`nav.links.${i}.label`} />
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <Link to="/search" aria-label={useContent("nav.icons.search")} className="grid h-10 w-10 place-items-center text-ink hover:text-accent">
            <Icon name="search" />
          </Link>
          <Link to="/wishlist" aria-label={useContent("nav.icons.wishlist")} className="relative grid h-10 w-10 place-items-center text-ink hover:text-accent">
            <Icon name="wishlist" />
            {ids.length > 0 && (
              <span className="fig absolute right-0 top-0 rounded-[var(--radius-pill)] bg-accent px-1 text-[10px] text-accent-ink">{ids.length}</span>
            )}
          </Link>
          <Link to={session ? "/account" : "/signin"} aria-label={useContent("nav.icons.account")} className="grid h-10 w-10 place-items-center text-ink hover:text-accent">
            <Icon name="account" />
          </Link>
          <Link to={ctaHref} data-testid="header-book" className="ml-2 hidden rounded-[var(--radius-sm)] bg-ink px-4 py-2 text-sm text-surface hover:bg-accent lg:inline-block">
            <T k="nav.cta.label" />
          </Link>
          <MenuToggle open={open} onToggle={() => setOpen((o) => !o)} className="lg:hidden" />
        </div>
      </div>
      <MobileMenu open={open} onClose={() => setOpen(false)}>
        <div className="flex flex-col gap-5 text-2xl">
          {links.map((l, i) => (
            <Link key={l.href} to={l.href} onClick={() => setOpen(false)} className="text-ink">
              <T k={`nav.links.${i}.label`} />
            </Link>
          ))}
          <Link to="/signin" onClick={() => setOpen(false)} className="text-ink"><T k="nav.signin" /></Link>
        </div>
      </MobileMenu>
    </header>
  );
}
