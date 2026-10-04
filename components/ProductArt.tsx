import Image from "next/image";
import { PHOTOS } from "@/lib/photos";
import type { Product } from "@/lib/types";

// Product imagery: `index` (or `view`) picks a shot from the product's gallery.
export default function ProductArt({ p, view = "main", index, className = "", sizes = "(min-width: 768px) 25vw, 50vw", priority = false }: { p: Pick<Product, "images" | "name" | "colour"> & Partial<Product>; view?: "main" | "detail" | "flat"; index?: number; className?: string } & { sizes?: string; priority?: boolean }) {
  const idx = index ?? (view === "main" ? 0 : view === "detail" ? 1 : 2);
  const img = p.images[idx] ?? p.images[idx - 1] ?? p.images[0];
  const photo = PHOTOS[img.key];
  return (
    <Image src={photo.src} alt={`${p.name}, ${p.colour}${idx ? ` (view ${idx + 1})` : ""}`} fill sizes={sizes} priority={priority} quality={85} placeholder="blur" blurDataURL={photo.blur} className={`object-cover ${className}`} style={{ objectPosition: img.pos ?? "50% 50%" }} />
  );
}
