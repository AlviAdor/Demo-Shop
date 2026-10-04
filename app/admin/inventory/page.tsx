import { ProductControls, SizeStock } from "@/components/AdminTables";
import ProductArt from "@/components/ProductArt";
import { getUser } from "@/lib/auth";
import { allCategories, getProducts } from "@/lib/catalog";

// Stock is tracked per size and grouped by category. Anything at or below 2 in a size is flagged.
export default async function Inventory() {
  const me = await getUser();
  const products = getProducts({ includeInactive: true });
  const categories = allCategories();
  const groups = categories.map((c) => ({ c, items: products.filter((p) => p.categoryId === c.id) })).filter((g) => g.items.length);
  return (
    <div className="space-y-8">
      <h1 className="display text-6xl md:text-8xl">Inventory</h1>
      <p className="max-w-2xl text-muted">Edit a number and click away to save. The shop updates immediately, and a size at zero shows as sold out. {me?.role === "owner" ? "" : "Price, category and visibility are owner-only."}</p>
      {groups.map(({ c, items }) => (
        <section key={c.id} className="border border-line bg-card">
          <header className="micro flex justify-between border-b border-line px-5 py-3"><span>{c.name}</span><span className="text-muted">{items.length} product{items.length === 1 ? "" : "s"} · {items.reduce((n, p) => n + p.stock, 0)} units</span></header>
          <ul className="divide-y divide-line">
            {items.map((p) => (
              <li key={p.id} className={`grid gap-4 p-5 md:grid-cols-[auto_1fr] ${p.active ? "" : "opacity-60"}`}>
                <span className="relative block h-24 w-20 shrink-0 overflow-hidden"><ProductArt p={p} sizes="80px" /></span>
                <div className="space-y-4">
                  <div><p className="font-medium">{p.name} <span className="text-muted">· {p.colour}</span></p><p className="micro text-muted">{p.stock} in stock{p.active ? "" : " · hidden from shop"}</p></div>
                  <div className="flex flex-wrap gap-3">{p.sizes.map((s) => <SizeStock key={s} productId={p.id} size={s} stock={p.sizeStock[s] ?? 0} />)}</div>
                  <ProductControls id={p.id} price={p.price} active={p.active} categoryId={p.categoryId} categories={categories} canEdit={me?.role === "owner"} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
