import { Menu, X } from "lucide-react";
import { useContent } from "../editable";

/**
 * The menu button below 1024px: three lines, and an X while the menu is
 * open. An icon everyone reads, never the word "Menu". The words are its
 * label, for screen readers.
 */
export default function MenuToggle({ open, onToggle, className = "" }: { open: boolean; onToggle: () => void; className?: string }) {
  const openLabel = useContent("nav.menu.open");
  const closeLabel = useContent("nav.menu.close");
  const label = open ? closeLabel : openLabel;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={label}
      title={label}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-pill)] text-ink transition-colors hover:bg-surface ${className}`}
    >
      {open ? <X aria-hidden="true" size={22} strokeWidth={1.75} /> : <Menu aria-hidden="true" size={22} strokeWidth={1.75} />}
    </button>
  );
}
