/**
 * The design's mark, when the owner has no logo: a placeholder the design
 * replaces with one drawn for this business — a simple geometric SVG in
 * currentColor (a monogram, the shape of what they make), never a picture,
 * never generated text. public/favicon.svg is the same mark.
 */
export default function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="16" cy="16" r="13" />
    </svg>
  );
}
