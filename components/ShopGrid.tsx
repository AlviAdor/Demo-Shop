"use client";
import { useState } from "react";
import ProductTile from "./ProductTile";
import type { ProductCard } from "@/lib/types";

// Like the big fashion sites: switch between a roomy 2-up view and a dense 4-up view.
export default function ShopGrid({ products }: { products: ProductCard[] }) {
  const [cols, setCols] = useState<2 | 4>(4);
  return (
    <>
      <div className="micro mb-4 hidden justify-end gap-5 px-5 md:flex md:px-8">
        <span className="text-muted">View</span>
        {[2, 4].map((c) => <button key={c} onClick={() => setCols(c as 2 | 4)} className={cols === c ? "link-u" : "text-muted"}>{c}</button>)}
      </div>
      <div className={`grid grid-cols-2 gap-x-1 gap-y-10 px-5 md:px-8 ${cols === 4 ? "md:grid-cols-4" : "md:grid-cols-2"}`}>
        {products.map((p) => <ProductTile key={p.id} p={p} />)}
      </div>
    </>
  );
}
