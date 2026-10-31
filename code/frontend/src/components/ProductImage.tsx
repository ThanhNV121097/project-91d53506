import type * as React from "react";
import { Picture } from "../picture";

/** The frame's shape. One per grid: every card in a row has the same one. */
export type Aspect = "1/1" | "4/5" | "4/3";

// The size a picture is declared at, so the browser holds its place before it
// loads. The tools save product pictures as transparent squares; the frame,
// not the file, decides the shape.
const INTRINSIC: Record<Aspect, [number, number]> = {
  "1/1": [800, 800],
  "4/5": [800, 1000],
  "4/3": [800, 600],
};

/**
 * Every product picture on the site: <ProductImage src={p.image} alt={p.name} />.
 *
 * A fixed frame (aspect "1/1" by default, or "4/5", "4/3") on a light tile
 * (var(--product-ground) in theme.css, light in dark mode too — a white or
 * silver product cut out onto a dark ground loses its shading), the product
 * shown whole with `object-contain` and an 8% margin all round. A phone and a
 * laptop in one grid keep the same margin, so no subject looks bigger than
 * the next.
 * Never `object-cover` on a product: it crops the thing being sold (the
 * scaffold's lint refuses it in card, product and shop files).
 *
 * With no `src` the frame shows the flat <Picture> block with the caption;
 * give `slot` (`/images/products/<id>.png`) and the owner can drop the photo
 * on it in the Studio. `eager` only for a picture in view on load.
 */
export default function ProductImage({ src, alt, aspect = "1/1", slot, caption, eager = false, className = "" }: {
  src?: string | null;
  alt: string;
  aspect?: Aspect;
  slot?: string;
  caption?: string;
  eager?: boolean;
  className?: string;
}) {
  const [width, height] = INTRINSIC[aspect];
  return (
    <div data-product-image="" style={{
      aspectRatio: aspect.replace("/", " / "),
      background: "var(--product-ground)",
      // The tile is light in both modes, so a <Picture> block inside it is
      // drawn on the tile rather than on the site's surface. Without this a
      // product with no photograph yet was a dark hole in a lit grid.
      ["--picture-ground" as string]: "var(--product-ground)",
      ["--picture-ink" as string]: "var(--product-ground-ink)",
    } as React.CSSProperties}
      className={`relative w-full overflow-hidden rounded ${className}`}>
      {src ? (
        <Picture src={src} alt={alt} caption={caption} width={width} height={height} fit="contain"
          loading={eager ? "eager" : "lazy"}
          className="absolute inset-[8%] h-[84%] w-[84%] object-contain" />
      ) : (
        <Picture src={slot ?? ""} alt={alt} caption={caption} fit="contain"
          className="absolute inset-0 h-full w-full" />
      )}
    </div>
  );
}
