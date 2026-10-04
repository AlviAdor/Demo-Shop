import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import Gallery from "@/components/Gallery";
import ProductTile from "@/components/ProductTile";
import SizePicker from "@/components/SizePicker";
import { Price } from "@/components/CurrencyProvider";
import { getProduct, getProducts, toCard } from "@/lib/catalog";
import { usd } from "@/lib/currency";
import { PHOTOS } from "@/lib/photos";
import { siteUrl } from "@/lib/site";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p?.images.length) return {};
  const photo = PHOTOS[p.images[0].key];
  return {
    title: p.name,
    description: `${p.description} ${p.colour}, from ${usd(p.price)}.`,
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: { type: "website", title: `${p.name} · ALTA`, description: p.description, images: [{ url: photo.src, width: photo.width, height: photo.height, alt: photo.alt }] },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) notFound();
  const stock = p.stock;
  const related = getProducts().filter((x) => x.id !== p.id && (x.category === p.category || x.tags.filter((t) => p.tags.includes(t)).length > 2)).slice(0, 4).map(toCard);
  const jsonLd = {
    "@context": "https://schema.org", "@type": "Product", name: p.name, description: p.description, color: p.colour, category: p.category,
    image: p.images.map((i) => `${siteUrl}${PHOTOS[i.key].src}`), sku: p.id, brand: { "@type": "Brand", name: "ALTA" },
    offers: { "@type": "Offer", url: `${siteUrl}/product/${p.slug}`, priceCurrency: "USD", price: p.price, availability: stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" },
  };
  return (
    <div className="pt-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <section className="grid md:grid-cols-12">
        <Gallery p={p} />
        <div className="px-5 py-8 md:col-span-4 md:px-8">
          <div className="md:sticky md:top-24">
            <p className="micro text-muted">{p.category}</p>
            <h1 className="display mt-3 text-5xl md:text-6xl">{p.name}</h1>
            <p className="micro mt-4"><Price usd={p.price} /></p>
            <p className="mt-6 max-w-sm leading-relaxed text-muted">{p.description}</p>
            <p className="micro mt-6">Colour: <span className="text-muted">{p.colour}</span></p>
            <div className="my-8"><SizePicker p={toCard(p)} /></div>
            <p className={`micro mb-8 ${stock <= 5 ? "text-ember" : "text-muted"}`}>{stock <= 0 ? "Currently sold out" : stock <= 5 ? `Only ${stock} left in stock` : "In stock · ships within 48 hours"}</p>
            <ul className="divide-y divide-line border-y border-line">{p.details.map((d) => <li key={d} className="py-3">{d}</li>)}<li className="py-3 text-muted">Free shipping over $150 · Free returns for 30 days</li></ul>
          </div>
        </div>
      </section>
      <section className="mt-28">
        <h2 className="display mb-8 px-5 text-4xl md:px-8 md:text-6xl">You may also like</h2>
        <div className="grid grid-cols-2 gap-x-1 gap-y-10 px-5 md:grid-cols-4 md:px-8">{related.map((r) => <ProductTile key={r.id} p={r} />)}</div>
      </section>
      <Footer />
    </div>
  );
}
