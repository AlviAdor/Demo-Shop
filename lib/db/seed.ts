import { randomBytes } from "node:crypto";
import { hashPassword } from "../password";
import { CATEGORY_SEED, PRODUCT_SEED } from "./catalog-seed";
import type { DB } from "./index";

const DAY = 86_400_000;
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// Small deterministic PRNG so demo data looks the same on every fresh database.
function rng(seed: number) {
  return () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

/** Writes the starting categories, products, images, tags and per-size stock. */
export function seedCatalogue(d: DB) {
  const rand = rng(11);
  const lowStock: Record<string, number> = { p02: 3, p11: 2, p07: 5 }; // a few low items so the dashboard has something to show
  d.transaction(() => {
    const cat = d.prepare("INSERT INTO categories (id, name, blurb, sort) VALUES (?, ?, ?, ?)");
    CATEGORY_SEED.forEach((c, i) => cat.run(slugify(c.name), c.name, c.blurb, i));
    const prod = d.prepare("INSERT INTO products (id, slug, name, category_id, price, colour, description, details, active, sort, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)");
    const img = d.prepare("INSERT INTO product_images (product_id, pos, photo_key, focus) VALUES (?, ?, ?, ?)");
    const tag = d.prepare("INSERT INTO product_tags (product_id, tag) VALUES (?, ?)");
    const variant = d.prepare("INSERT INTO variants (product_id, size, sort, stock) VALUES (?, ?, ?, ?)");
    PRODUCT_SEED.forEach((p, i) => {
      prod.run(p.id, p.slug, p.name, slugify(p.category), p.price, p.colour, p.description, JSON.stringify(p.details), i, Date.now());
      p.images.forEach((im, n) => img.run(p.id, n, im.key, im.pos ?? "50% 50%"));
      p.tags.forEach((t) => tag.run(p.id, t));
      const total = lowStock[p.id] ?? 20 + Math.floor(rand() * 45);
      p.sizes.forEach((s, n) => variant.run(p.id, s, n, Math.floor(total / p.sizes.length) + (n < total % p.sizes.length ? 1 : 0)));
    });
  })();
}

/** Demo accounts plus about two months of sample orders, so the dashboard has something to show. */
export function seedDemo(d: DB) {
  const now = Date.now();
  const rand = rng(11);
  const shared = hashPassword("x" + randomBytes(6).toString("hex"));
  d.transaction(() => {
    const user = d.prepare("INSERT INTO users (id, name, email, hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)");
    user.run("u1", "Olivia Owner", "owner@alta.test", hashPassword("owner123"), "owner", now - 90 * DAY);
    user.run("u2", "Sam Staff", "staff@alta.test", hashPassword("staff123"), "staff", now - 80 * DAY);
    user.run("u3", "Casey Customer", "customer@alta.test", hashPassword("customer123"), "customer", now - 70 * DAY);
    const names = ["Ava Chen", "Liam Patel", "Noah Rivera", "Mia Okafor", "Ethan Rahman", "Zoe Martin", "Lucas Kim", "Ivy Novak", "Omar Haddad", "Nina Rossi", "Leo Tanaka", "Sara Dube"];
    const customers = ["u3"];
    names.forEach((n, i) => { const id = "u" + (i + 4); customers.push(id); user.run(id, n, n.split(" ")[0].toLowerCase() + "@example.test", shared, "customer", now - Math.floor(5 + rand() * 60) * DAY); });

    const products = d.prepare("SELECT id, price FROM products ORDER BY sort").all() as { id: string; price: number }[];
    const variants = d.prepare("SELECT id, product_id AS productId, size FROM variants").all() as { id: number; productId: string; size: string }[];
    const byProduct = new Map<string, { id: number; size: string }[]>();
    for (const v of variants) (byProduct.get(v.productId) ?? byProduct.set(v.productId, []).get(v.productId)!).push({ id: v.id, size: v.size });

    const order = d.prepare("INSERT INTO orders (user_id, total, status, address, created_at, restocked) VALUES (?, ?, ?, ?, ?, ?)");
    const item = d.prepare("INSERT INTO order_items (order_id, product_id, variant_id, size, qty, price) VALUES (?, ?, ?, ?, 1, ?)");
    const pay = d.prepare("INSERT INTO payments (order_id, provider, session_id, currency, rate, amount_minor, status, attempts, expires_at, method_brand, method_last4) VALUES (?, 'demo', ?, 'USD', 122, ?, ?, 1, ?, 'Visa', '4242')");
    for (let day = 59; day >= 0; day--) {
      const count = Math.floor(rand() * 2.6 + (59 - day) / 45);
      for (let k = 0; k < count; k++) {
        const picks = new Set<number>();
        const n = 1 + Math.floor(rand() * 2);
        for (let j = 0; j < n; j++) picks.add(Math.floor(rand() * products.length));
        const lines = [...picks].map((i) => ({ p: products[i], v: byProduct.get(products[i].id)![Math.floor(rand() * byProduct.get(products[i].id)!.length)] }));
        const total = lines.reduce((s, l) => s + l.p.price, 0);
        const status = day > 10 ? (rand() > 0.07 ? "delivered" : "cancelled") : (["paid", "shipped", "delivered"] as const)[Math.floor(rand() * 3)];
        const at = now - day * DAY - Math.floor(rand() * 20) * 3_600_000;
        const info = order.run(customers[Math.floor(rand() * customers.length)], total, status, "12 Example Street, Sampletown", at, status === "cancelled" ? 1 : 0);
        const id = Number(info.lastInsertRowid);
        for (const l of lines) item.run(id, l.p.id, l.v.id, l.v.size, l.p.price);
        pay.run(id, "cs_seed_" + id, total * 100, status === "cancelled" ? "canceled" : "paid", at + 900_000);
      }
    }
  })();
}
