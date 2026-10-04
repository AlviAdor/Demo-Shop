import { db, q, tx } from "./db";
import { PHOTOS, type PhotoKey } from "./photos";
import type { CategoryInfo, Product, ProductCard } from "./types";

// Product details (names, prices, photos, sizes) rarely change, so they are read once and kept in memory.
// Stock changes with every sale, so it is always read fresh. A save in the admin clears the cache.
type StaticProduct = Omit<Product, "sizeStock" | "stock">;
type Cache = { list: StaticProduct[]; byId: Map<string, StaticProduct>; bySlug: Map<string, StaticProduct>; categories: Omit<CategoryInfo, "count">[] };
const g = globalThis as unknown as { __altaCatalog?: Cache | null };

export const bumpCatalog = () => { g.__altaCatalog = null; };

function load(): Cache {
  if (g.__altaCatalog) return g.__altaCatalog;
  db();
  const rows = q(`SELECT p.id, p.slug, p.name, p.category_id AS categoryId, c.name AS category, p.price, p.colour, p.description, p.details, p.active
                  FROM products p JOIN categories c ON c.id = p.category_id ORDER BY c.sort, p.sort`).all() as (Omit<StaticProduct, "images" | "sizes" | "tags" | "details" | "active"> & { details: string; active: number })[];
  const images = new Map<string, StaticProduct["images"]>();
  for (const r of q("SELECT product_id AS id, photo_key AS key, focus FROM product_images ORDER BY product_id, pos").all() as { id: string; key: string; focus: string }[]) {
    if (!(r.key in PHOTOS)) continue; // ignore a reference to a photo that isn't in the site's library
    (images.get(r.id) ?? images.set(r.id, []).get(r.id)!).push({ key: r.key as PhotoKey, pos: r.focus });
  }
  const tags = new Map<string, string[]>();
  for (const r of q("SELECT product_id AS id, tag FROM product_tags ORDER BY product_id, tag").all() as { id: string; tag: string }[]) (tags.get(r.id) ?? tags.set(r.id, []).get(r.id)!).push(r.tag);
  const sizes = new Map<string, string[]>();
  for (const r of q("SELECT product_id AS id, size FROM variants ORDER BY product_id, sort").all() as { id: string; size: string }[]) (sizes.get(r.id) ?? sizes.set(r.id, []).get(r.id)!).push(r.size);

  const list: StaticProduct[] = rows.map((r) => ({ ...r, details: JSON.parse(r.details || "[]"), active: !!r.active, images: images.get(r.id) ?? [], sizes: sizes.get(r.id) ?? [], tags: tags.get(r.id) ?? [] }));
  const categories = q("SELECT id, name, blurb FROM categories ORDER BY sort").all() as Omit<CategoryInfo, "count" | "lead">[];
  // A category's lead product is its first active one; it drives the menu preview and the footer.
  const lead = (cid: string) => list.find((p) => p.categoryId === cid && p.active)?.id ?? "";
  return (g.__altaCatalog = { list, byId: new Map(list.map((p) => [p.id, p])), bySlug: new Map(list.map((p) => [p.slug, p])), categories: categories.map((c) => ({ ...c, lead: lead(c.id) })) });
}

/** Live stock for every size, in one small indexed query. */
function stockRows() {
  const bySize = new Map<string, Record<string, number>>();
  for (const r of q("SELECT product_id AS id, size, stock FROM variants").all() as { id: string; size: string; stock: number }[]) (bySize.get(r.id) ?? bySize.set(r.id, {}).get(r.id)!)[r.size] = r.stock;
  return bySize;
}

function withStock(list: StaticProduct[]): Product[] {
  const stock = stockRows();
  return list.map((p) => { const sizeStock = stock.get(p.id) ?? {}; return { ...p, sizeStock, stock: Object.values(sizeStock).reduce((a, b) => a + b, 0) }; });
}

export type MenuItem = { id: string; name: string; blurb: string; count: number; image: { key: PhotoKey; pos: string } | null; leadName: string };
/** Category list for the menu and footer: served entirely from the in-memory cache, no stock lookup. */
export function getMenu(): MenuItem[] {
  const c = load();
  return c.categories.map((cat) => {
    const lead = c.byId.get(cat.lead);
    return { id: cat.id, name: cat.name, blurb: cat.blurb, count: c.list.filter((p) => p.categoryId === cat.id && p.active).length, image: lead?.images[0] ?? null, leadName: lead?.name ?? cat.name };
  }).filter((m) => m.count > 0);
}

export function getCategories(): CategoryInfo[] {
  const c = load();
  return c.categories.map((cat) => ({ ...cat, count: c.list.filter((p) => p.categoryId === cat.id && p.active).length })).filter((cat) => cat.count > 0);
}

export function getProducts(opts: { category?: string; includeInactive?: boolean } = {}): Product[] {
  const list = load().list.filter((p) => (opts.includeInactive || p.active) && (!opts.category || p.category === opts.category));
  return withStock(list);
}
export function getProduct(slug: string, includeInactive = false): Product | undefined {
  const p = load().bySlug.get(slug);
  return p && (includeInactive || p.active) ? withStock([p])[0] : undefined;
}
export function getProductById(id: string): Product | undefined {
  const p = load().byId.get(id);
  return p ? withStock([p])[0] : undefined;
}
export function getProductsByIds(ids: string[], includeInactive = false): Product[] {
  const c = load();
  const list = [...new Set(ids)].map((id) => c.byId.get(id)).filter((p): p is StaticProduct => !!p && (includeInactive || p.active));
  return withStock(list);
}

export const toCard = (p: Product): ProductCard => ({ id: p.id, slug: p.slug, name: p.name, colour: p.colour, price: p.price, category: p.category, sizes: p.sizes, sizeStock: p.sizeStock, stock: p.stock, images: p.images });

/** Display name for a product id, for places that only know the id. */
export const productName = (id: string) => load().byId.get(id)?.name ?? id;

// ---- admin edits ----

export function setVariantStock(productId: string, size: string, stock: number): boolean {
  if (!Number.isInteger(stock) || stock < 0 || stock > 99_999) return false;
  const r = q("UPDATE variants SET stock = ? WHERE product_id = ? AND size = ?").run(stock, productId, size);
  return r.changes === 1;
}

export function updateProduct(id: string, patch: { price?: number; active?: boolean; categoryId?: string }): boolean {
  if (!load().byId.has(id)) return false;
  if (patch.price !== undefined && (!Number.isInteger(patch.price) || patch.price < 1 || patch.price > 100_000)) return false;
  if (patch.categoryId !== undefined && !load().categories.some((c) => c.id === patch.categoryId)) return false;
  tx(() => {
    if (patch.price !== undefined) q("UPDATE products SET price = ? WHERE id = ?").run(patch.price, id);
    if (patch.active !== undefined) q("UPDATE products SET active = ? WHERE id = ?").run(patch.active ? 1 : 0, id);
    if (patch.categoryId !== undefined) q("UPDATE products SET category_id = ? WHERE id = ?").run(patch.categoryId, id);
  });
  bumpCatalog();
  return true;
}

export const allCategories = () => load().categories;
