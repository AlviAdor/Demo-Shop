"use client";
import { useRef } from "react";
import ProductTile from "./ProductTile";
import type { ProductCard } from "@/lib/types";

export default function Rail({ products, title }: { products: ProductCard[]; title: string }) {
  const track = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => track.current?.scrollBy({ left: dir * track.current.clientWidth * 0.7, behavior: "smooth" });
  return (
    <section className="py-24">
      <div className="mb-6 flex items-end justify-between px-5 md:px-8"><h2 className="display text-5xl md:text-7xl">{title}</h2><div className="micro flex gap-5"><button onClick={() => scroll(-1)} aria-label="Previous" className="tap">← Prev</button><button onClick={() => scroll(1)} aria-label="Next" className="tap">Next →</button></div></div>
      <div ref={track} className="no-scrollbar flex snap-x snap-mandatory gap-1 overflow-x-auto px-5 md:px-8">
        {products.map((p) => <div key={p.id} className="w-[72vw] shrink-0 snap-start sm:w-[38vw] lg:w-[24vw]"><ProductTile p={p} /></div>)}
      </div>
    </section>
  );
}
