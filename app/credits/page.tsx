import type { Metadata } from "next";
import Footer from "@/components/Footer";
import { Photo } from "@/components/Photo";
import { PHOTOS, type PhotoKey } from "@/lib/photos";

export const metadata: Metadata = { title: "Photo credits", description: "Every photograph on this site, with its photographer and source." };

export default function Credits() {
  const keys = Object.keys(PHOTOS) as PhotoKey[];
  return (
    <div className="pt-24">
      <section className="px-5 md:px-8">
        <p className="micro text-muted">Credits</p>
        <h1 className="display mt-3 text-[clamp(3rem,9vw,8rem)]">Photography</h1>
        <p className="mt-6 max-w-2xl leading-relaxed text-muted">All photographs are by independent photographers and are used under the <a className="link-u text-fg" href="https://unsplash.com/license" target="_blank" rel="noopener noreferrer">Unsplash License</a>. This is a demonstration storefront; a live brand should replace them with its own photography. Thank you to everyone listed below.</p>
      </section>
      <section className="mt-14 grid grid-cols-2 gap-x-1 gap-y-10 px-5 md:grid-cols-4 md:px-8">
        {keys.map((k) => {
          const p = PHOTOS[k];
          return (
            <figure key={k}>
              <div className="relative aspect-[4/5] overflow-hidden bg-card"><Photo k={k} sizes="(min-width: 768px) 25vw, 50vw" /></div>
              <figcaption className="micro mt-3 leading-relaxed">
                <a href={`https://unsplash.com/@${p.handle}`} target="_blank" rel="noopener noreferrer" className="link-u">{p.by}</a>
                <span className="text-muted"> on </span>
                <a href={p.page} target="_blank" rel="noopener noreferrer" className="link-u">Unsplash</a>
              </figcaption>
            </figure>
          );
        })}
      </section>
      <Footer />
    </div>
  );
}
