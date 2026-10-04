"use client";
import { useState } from "react";
import type { ProductCard } from "@/lib/types";
import { useCart } from "./CartProvider";

export default function SizePicker({ p }: { p: ProductCard }) {
  const { add } = useCart();
  const [size, setSize] = useState(p.sizes.length === 1 && p.sizeStock[p.sizes[0]] > 0 ? p.sizes[0] : "");
  const [warn, setWarn] = useState(false);
  const soldOut = p.stock <= 0;
  return (
    <div>
      <p className="micro mb-3 flex justify-between"><span>Size</span>{warn && <span className="text-ember">Please select a size</span>}</p>
      <div className="mb-6 grid grid-cols-5 gap-1">
        {p.sizes.map((s) => {
          const left = p.sizeStock[s] ?? 0;
          return (
            <button key={s} disabled={left <= 0} aria-label={left <= 0 ? `${s}, sold out` : left <= 2 ? `${s}, only ${left} left` : s} onClick={() => { setSize(s); setWarn(false); }}
              className={`micro border py-3 transition disabled:cursor-not-allowed disabled:text-muted disabled:line-through ${size === s ? "border-fg bg-fg text-bg" : "border-line enabled:hover:border-fg"}`}>{s}</button>
          );
        })}
      </div>
      <button disabled={soldOut} onClick={() => (size ? add(p, size) : setWarn(true))} className="btn btn-gold w-full">{soldOut ? "Sold out" : "Add to bag"}</button>
    </div>
  );
}
