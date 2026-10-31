import { useContent } from "../editable";

/** The vertical small-caps rail running up the left edge of a hero. */
export default function Rail({ k }: { k: string }) {
  const text = useContent(k);
  return (
    <span
      aria-hidden="true"
      className="label pointer-events-none absolute left-2 top-1/2 hidden -translate-y-1/2 text-surface/70 lg:block"
      style={{ writingMode: "vertical-rl", transform: "translateY(-50%) rotate(180deg)" }}
    >
      {text}
    </span>
  );
}
