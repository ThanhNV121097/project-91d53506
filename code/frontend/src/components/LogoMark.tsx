/**
 * The mark: a departure-board flap — a square split across the middle with an
 * arrow leaving to the right, drawn in currentColor. Also public/favicon.svg.
 */
export default function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} width="24" height="24"
      fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1.5" y="3.5" width="17" height="17" />
      <path d="M1.5 12h17" />
      <path d="M13 7.5h8.5M18 4l3.5 3.5L18 11" />
    </svg>
  );
}
