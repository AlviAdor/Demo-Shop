import type { MetadataRoute } from "next";
import { getMenu, getProducts } from "@/lib/catalog";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: siteUrl, lastModified: now, priority: 1 },
    { url: `${siteUrl}/shop`, lastModified: now, priority: 0.9 },
    ...getMenu().map((c) => ({ url: `${siteUrl}/shop?category=${c.name}`, lastModified: now, priority: 0.7 })),
    ...getProducts().map((p) => ({ url: `${siteUrl}/product/${p.slug}`, lastModified: now, priority: 0.8 })),
    { url: `${siteUrl}/credits`, lastModified: now, priority: 0.2 },
  ];
}
