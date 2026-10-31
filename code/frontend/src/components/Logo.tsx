import { useContent } from "../editable";
import LogoMark from "./LogoMark";

/**
 * The business's logo. The owner's own when they gave one — site.logo names
 * it, under /images/owner/ — used as it is and never redrawn. Otherwise the
 * design's: LogoMark beside the name in the display face. Both follow light
 * and dark: the mark draws in currentColor.
 */
export default function Logo({ className = "" }: { className?: string }) {
  const src = useContent<string>("site.logo");
  const name = useContent<string>("site.name");
  if (src) {
    return <img src={src} alt={name} className={`h-8 w-auto ${className}`} />;
  }
  return (
    <span className={`inline-flex items-center gap-2 font-display text-lg tracking-tight text-ink ${className}`}>
      <LogoMark className="h-7 w-7" />
      <span>{name}</span>
    </span>
  );
}
