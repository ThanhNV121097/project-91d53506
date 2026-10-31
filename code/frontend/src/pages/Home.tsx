import { T } from "../editable";

/** The home page. Every other page goes beside it in src/pages/, one file each. */
export default function Home() {
  return (
    <>
      <T k="hero.headline" as="h1" className="text-[length:var(--size-h1)] leading-[1.05] max-w-[16ch]" />
      <T k="hero.sub" as="p" className="mt-6 text-xl text-ink-soft max-w-[48ch]" />
      <T k="hero.cta.label" as="a" href="#contact" className="mt-10 inline-block rounded bg-accent px-6 py-3 text-accent-ink" />
    </>
  );
}
