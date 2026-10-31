import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * The menu below 1024px: a solid panel over the whole screen under the
 * header, opened by MenuToggle. It is drawn into <body> through a portal on
 * purpose — a `fixed` panel inside the header is held to the header's box
 * whenever the header has backdrop-blur, a filter or a transform, and opens
 * as a strip with one link showing. While it is open the page does not
 * scroll, and Esc closes it.
 */
export default function MobileMenu({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = before;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-x-0 bottom-0 top-[var(--header-h)] z-[60] flex flex-col gap-6 overflow-y-auto bg-ground px-[var(--gutter)] py-10 lg:hidden"
    >
      {children}
    </div>,
    document.body,
  );
}
