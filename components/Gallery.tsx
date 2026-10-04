"use client";
import { useRef, useState } from "react";
import type { Product } from "@/lib/types";
import ProductArt from "./ProductArt";

// Phones: a swipeable carousel, so the size picker sits right under the first photo.
// Larger screens: the photos stack down the page beside the sticky details.
export default function Gallery({ p }: { p: Pick<Product, "images" | "name" | "colour"> }) {
  const ref = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const n = p.images.length;
  return (
    <div className="relative md:col-span-8">
      <div ref={ref} onScroll={() => ref.current && setI(Math.round(ref.current.scrollLeft / ref.current.clientWidth))}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto md:block md:space-y-1 md:overflow-visible" role="group" aria-roledescription="carousel" aria-label={`${p.name} photos`}>
        {p.images.map((_, k) => (
          <div key={k} className="relative aspect-[4/5] w-full shrink-0 snap-center overflow-hidden" aria-label={`Photo ${k + 1} of ${n}`}>
            <ProductArt p={p} index={k} sizes="(min-width: 768px) 66vw, 100vw" priority={k === 0} />
          </div>
        ))}
      </div>
      {n > 1 && <span className="micro pointer-events-none absolute bottom-3 right-3 bg-bg/85 px-2 py-1 md:hidden" aria-hidden>{i + 1} / {n}</span>}
    </div>
  );
}
