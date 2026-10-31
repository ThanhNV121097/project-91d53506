import { useContent } from "../editable";
import Icon from "./Icon";

/**
 * Call and Zalo, always within reach on a phone: two round buttons fixed to
 * the lower corner below 1024px. Each shows only when its number is in
 * content.json (contact.phone, contact.zalo); with neither, nothing shows.
 * A Zalo number opens a chat at zalo.me/<number>.
 *
 * It floats, so it must never sit on content: the buttons are one row
 * (56px high), and while the dock is on the page index.css pads the bottom of
 * <body> by --dock-space (theme.css) below 1024px, so the last line of the
 * footer, a form's submit button or a cart's checkout always scrolls clear of
 * it. The gap between the buttons lets taps through (pointer-events). A
 * page with its own fixed bottom bar (a cart's checkout) must not show both:
 * leave the dock out of that page's layout.
 */
export default function ContactDock() {
  const phone = useContent("contact.phone");
  const zalo = useContent("contact.zalo");
  const callLabel = useContent("contact.dock.call");
  const zaloLabel = useContent("contact.dock.zalo");
  const tel = digits(phone);
  const chat = digits(zalo);
  if (!tel && !chat) return null;
  return (
    <div data-contact-dock=""
      className="pointer-events-none fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-50 flex flex-row gap-3 lg:hidden">
      {chat && (
        <a href={`https://zalo.me/${chat}`} target="_blank" rel="noreferrer" aria-label={zaloLabel}
          className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface text-ink shadow-lg ring-1 ring-line text-sm font-semibold">
          Zalo
        </a>
      )}
      {tel && (
        <a href={`tel:${tel}`} aria-label={callLabel}
          className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-ink shadow-lg">
          <Icon name="phone" />
        </a>
      )}
    </div>
  );
}

/** A number as a link wants it: digits, and a leading + kept. */
export function digits(s: string): string {
  const t = (s ?? "").trim();
  const d = t.replace(/[^\d]/g, "");
  return d ? (t.startsWith("+") ? "+" + d : d) : "";
}
