import { useState } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { T, useList, useContent } from "./editable";
import Home from "./pages/Home";
import Logo from "./components/Logo";
import MenuToggle from "./components/MenuToggle";
import ContactDock from "./components/ContactDock";
import PhotoCredits from "./components/PhotoCredits";

/**
 * The shell the design replaces.
 *
 * This file is a placeholder so the scaffold builds and runs before the
 * design exists. The team rewrites it and adds components under
 * src/components/; what must stay is the rule every component follows: the
 * words come from content.json through <T/>, the colours from theme.css.
 *
 * The site has pages, not only a home page: each is a file in src/pages/ and
 * a <Route> below, sharing the header and footer. The footer keeps
 * <PhotoCredits/>: the stock photos' credits, which their licences ask for.
 */
export default function App() {
  const links = useList<{ label: string; href: string }>("nav.links");
  const name = useContent("site.name");
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-ground text-ink font-body">
      <header className="mx-auto max-w-page px-[var(--gutter)] py-6 flex items-center justify-between">
        <Link to="/" aria-label={name}><Logo /></Link>
        <nav className="hidden lg:flex items-center gap-6 text-sm">
          {links.map((l, i) => <T key={i} k={`nav.links.${i}.label`} as="a" href={l.href} />)}
          <T k="nav.cta.label" as="a" href="#contact" className="rounded bg-accent px-4 py-2 text-accent-ink" />
        </nav>
        <div className="flex items-center gap-1 lg:hidden">
          <MenuToggle open={open} onToggle={() => setOpen((o) => !o)} />
        </div>
      </header>
      {open && (
        <nav className="fixed inset-0 top-[88px] z-40 flex flex-col gap-6 bg-ground px-[var(--gutter)] py-10 text-2xl lg:hidden">
          {links.map((l, i) => <T key={i} k={`nav.links.${i}.label`} as="a" href={l.href} />)}
        </nav>
      )}
      <main className="mx-auto max-w-page px-[var(--gutter)] py-24">
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </main>
      <footer className="mx-auto max-w-page px-[var(--gutter)] py-12 text-sm text-ink-soft border-t border-line">
        <T k="footer.line" /> · {name}
        <PhotoCredits className="mt-3" />
      </footer>
      <ContactDock />
    </div>
  );
}
