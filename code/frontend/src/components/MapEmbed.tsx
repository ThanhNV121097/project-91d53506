import { useContent } from "../editable";

/**
 * Where the business is, as a Google map of the address in content.json
 * (contact.address) — no key needed. Nothing shows without an address.
 * Give it a height through className; it fills its width.
 */
export default function MapEmbed({ className = "h-80" }: { className?: string }) {
  const address = useContent("contact.address");
  const name = useContent("site.name");
  if (!address) return null;
  const q = encodeURIComponent(`${name} ${address}`.trim());
  return (
    <iframe
      title={address}
      src={`https://www.google.com/maps?q=${q}&output=embed`}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      className={`w-full rounded border-0 ${className}`}
    />
  );
}
