"use client";
import Link from "next/link";
import { useState } from "react";
import type { ProductCard } from "@/lib/types";
import { Price } from "./CurrencyProvider";
import ProductArt from "./ProductArt";
import { useCart } from "./CartProvider";

// Borderless tile: image swaps to a detail shot on hover and sizes slide up for quick add.
export default function ProductTile({ p }: { p: ProductCard }) {
  const { add } = useCart();
  const [hover, setHover] = useState(false);
  const stock = p.stock;
  const soldOut = stock <= 0;
  return (
    <article onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} className="group">
      <div className="relative aspect-[4/5] overflow-hidden bg-card">
        <Link href={`/product/${p.slug}`} className="absolute inset-0 block" aria-label={p.name}>
          <ProductArt p={p} sizes="(min-width: 1024px) 24vw, (min-width: 768px) 33vw, 50vw" />
          <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"><ProductArt p={p} view="detail" sizes="(min-width: 1024px) 24vw, (min-width: 768px) 33vw, 50vw" /></div>
        </Link>
        {soldOut && <span className="micro absolute left-3 top-3 bg-bg px-2 py-1 text-ember">Sold out</span>}
        {!soldOut && stock <= 5 && <span className="micro absolute left-3 top-3 bg-bg px-2 py-1 text-ember">Only {stock} left</span>}
        {!soldOut && (
          <div className={`absolute inset-x-0 bottom-0 bg-bg/95 p-3 transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] ${hover ? "translate-y-0" : "translate-y-full"} max-md:translate-y-0 max-md:bg-transparent`}>
            <p className="micro mb-2 text-muted max-md:hidden">Add to bag, select size</p>
            <div className="flex flex-wrap gap-1">{p.sizes.map((s) => <button key={s} disabled={!(p.sizeStock[s] > 0)} onClick={() => add(p, s)} className="micro min-w-9 border border-line px-2 py-1.5 transition hover:border-fg hover:bg-fg hover:text-bg disabled:text-muted disabled:line-through disabled:hover:border-line disabled:hover:bg-transparent disabled:hover:text-muted max-md:hidden">{s}</button>)}</div>
          </div>
        )}
      </div>
      <Link href={`/product/${p.slug}`} className="mt-3 flex items-start justify-between gap-4">
        <span className="micro leading-snug">{p.name}<br /><span className="normal-case tracking-normal text-muted">{p.colour}</span></span>
        <span className="micro"><Price usd={p.price} /></span>
      </Link>
    </article>
  );
}
