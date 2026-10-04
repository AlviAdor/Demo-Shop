import Link from "next/link";
import Footer from "@/components/Footer";
import ShopGrid from "@/components/ShopGrid";
import { getMenu, getProducts, toCard } from "@/lib/catalog";

export const metadata = { title: "Shop", description: "Outerwear, knitwear, shirts, trousers, footwear and bags." };

export default async function Shop({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const menu = getMenu();
  const active = menu.find((c) => c.name === category); // ignore unknown categories rather than showing an empty page
  const products = getProducts({ category: active?.name });
  const total = menu.reduce((n, c) => n + c.count, 0);
  return (
    <div className="pt-24">
      <div className="px-5 pb-10 md:px-8"><h1 className="display text-[clamp(3.5rem,11vw,10rem)]">{active?.name ?? "All"}</h1></div>
      <nav aria-label="Categories" className="micro sticky top-0 z-40 mb-8 flex gap-6 overflow-x-auto border-y border-line bg-bg/90 px-5 py-1 backdrop-blur no-scrollbar md:px-8 md:py-1">
        <Link href="/shop" className={`shrink-0 whitespace-nowrap py-3.5 ${!active ? "link-u" : "text-muted"}`}>All ({total})</Link>
        {menu.map((c) => <Link key={c.id} href={`/shop?category=${c.name}`} className={`shrink-0 whitespace-nowrap py-3.5 ${active?.id === c.id ? "link-u" : "text-muted hover:text-fg"}`}>{c.name}</Link>)}
      </nav>
      <ShopGrid products={products.map(toCard)} />
      <Footer />
    </div>
  );
}
