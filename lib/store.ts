import { randomBytes, randomUUID } from "node:crypto";
import { getProductById, getProductsByIds } from "./catalog";
import type { Currency } from "./currency";
import { unitMinor } from "./currency";
import { db, q, tx } from "./db";
import { hashPassword } from "./password";
import { STATUSES, type Order, type OrderItem, type Payment, type PaymentStatus, type Product, type Role, type Status, type User } from "./types";

export { STATUSES };
export type { Order, OrderItem, Payment, PaymentStatus, Role, Status, User };

const DAY = 86_400_000;
export const CHECKOUT_MINUTES = 15;
export const MAX_PAYMENT_ATTEMPTS = 5;
const REVENUE = "('paid','shipped','delivered')"; // only orders the customer actually paid for count as revenue

// ---------------------------------------------------------------- users

export const publicUser = (u: User) => ({ id: u.id, name: u.name, email: u.email, role: u.role });

type UserRow = User & { hash: string };
const USER_COLS = "id, name, email, hash, role, created_at AS createdAt";

export const findUser = (id: string) => q(`SELECT ${USER_COLS} FROM users WHERE id = ?`).get(id) as UserRow | undefined;
export const findByEmail = (email: string) => q(`SELECT ${USER_COLS} FROM users WHERE email = ?`).get(email.trim().toLowerCase()) as UserRow | undefined;

/** Returns null when the email is taken. The UNIQUE constraint decides, so two sign-ups at once can't both win. */
export function createUser(name: string, email: string, password: string): UserRow | null {
  const id = "u_" + randomUUID().slice(0, 8);
  try {
    q("INSERT INTO users (id, name, email, hash, role, created_at) VALUES (?, ?, ?, ?, 'customer', ?)").run(id, name, email.trim().toLowerCase(), hashPassword(password), Date.now());
  } catch (e) {
    if ((e as { code?: string }).code === "SQLITE_CONSTRAINT_UNIQUE") return null;
    throw e;
  }
  return findUser(id)!;
}

export function setUserRole(id: string, role: "staff" | "customer"): boolean {
  return q("UPDATE users SET role = ? WHERE id = ? AND role <> 'owner'").run(role, id).changes === 1;
}

export type UserSummary = User & { orders: number; spent: number };
export function listUsersWithSpend(): UserSummary[] {
  return q(`SELECT u.id, u.name, u.email, u.role, u.created_at AS createdAt, COUNT(o.id) AS orders, COALESCE(SUM(o.total), 0) AS spent
            FROM users u LEFT JOIN orders o ON o.user_id = u.id AND o.status IN ${REVENUE}
            GROUP BY u.id ORDER BY CASE u.role WHEN 'owner' THEN 0 WHEN 'staff' THEN 1 ELSE 2 END, spent DESC, u.created_at`).all() as UserSummary[];
}

// ---------------------------------------------------------------- orders

type OrderRow = { id: number; userId: string; total: number; status: Status; address: string; createdAt: number; restocked: number } & Partial<{
  provider: string; sessionId: string; currency: Currency; rate: number; amountMinor: number; payStatus: PaymentStatus; attempts: number; expiresAt: number;
  mBrand: string | null; mLast4: string | null; pBrand: string | null; pLast4: string | null; failure: string | null;
}>;

const ORDER_SELECT = `SELECT o.id, o.user_id AS userId, o.total, o.status, o.address, o.created_at AS createdAt, o.restocked,
  p.provider, p.session_id AS sessionId, p.currency, p.rate, p.amount_minor AS amountMinor, p.status AS payStatus, p.attempts, p.expires_at AS expiresAt,
  p.method_brand AS mBrand, p.method_last4 AS mLast4, p.pending_brand AS pBrand, p.pending_last4 AS pLast4, p.failure
  FROM orders o LEFT JOIN payments p ON p.order_id = o.id`;

/** Loads the line items for many orders with one query, instead of one query per order. */
function attach(rows: OrderRow[]): Order[] {
  if (!rows.length) return [];
  const marks = rows.map(() => "?").join(",");
  const items = new Map<number, OrderItem[]>();
  for (const r of q(`SELECT i.order_id AS orderId, i.product_id AS productId, p.name, i.size, i.qty, i.price
                     FROM order_items i JOIN products p ON p.id = i.product_id WHERE i.order_id IN (${marks}) ORDER BY i.id`).all(...rows.map((r) => r.id)) as (OrderItem & { orderId: number })[]) {
    (items.get(r.orderId) ?? items.set(r.orderId, []).get(r.orderId)!).push({ productId: r.productId, name: r.name, size: r.size, qty: r.qty, price: r.price });
  }
  return rows.map((r) => ({
    id: r.id, userId: r.userId, total: r.total, status: r.status, address: r.address, createdAt: r.createdAt, restocked: !!r.restocked, items: items.get(r.id) ?? [],
    payment: r.sessionId ? {
      provider: r.provider!, sessionId: r.sessionId, currency: r.currency!, rate: r.rate!, amountMinor: r.amountMinor!, status: r.payStatus!, attempts: r.attempts!, expiresAt: r.expiresAt!,
      method: r.mBrand ? { brand: r.mBrand, last4: r.mLast4! } : undefined, pending3ds: r.pBrand ? { brand: r.pBrand, last4: r.pLast4! } : undefined, failure: r.failure ?? undefined,
    } : undefined,
  }));
}

export const orderById = (id: number): Order | undefined => attach(q(`${ORDER_SELECT} WHERE o.id = ?`).all(id) as OrderRow[])[0];
export const orderBySession = (sessionId: string): Order | undefined => attach(q(`${ORDER_SELECT} WHERE p.session_id = ?`).all(sessionId) as OrderRow[])[0];

export const listOrdersForUser = (userId: string, limit = 50): Order[] =>
  attach(q(`${ORDER_SELECT} WHERE o.user_id = ? ORDER BY o.created_at DESC, o.id DESC LIMIT ?`).all(userId, limit) as OrderRow[]);

export type AdminOrder = Order & { userName: string; userEmail: string };
export function listOrders(opts: { status?: Status; limit?: number; offset?: number } = {}): { rows: AdminOrder[]; total: number } {
  const { status, limit = 50, offset = 0 } = opts;
  const where = status ? "WHERE o.status = ?" : "";
  const args = status ? [status] : [];
  const rows = attach(q(`${ORDER_SELECT} ${where} ORDER BY o.id DESC LIMIT ? OFFSET ?`).all(...args, limit, offset) as OrderRow[]);
  const users = new Map<string, { name: string; email: string }>();
  for (const id of new Set(rows.map((r) => r.userId))) { const u = findUser(id); if (u) users.set(id, { name: u.name, email: u.email }); }
  const total = (q(`SELECT COUNT(*) AS n FROM orders o ${where}`).get(...args) as { n: number }).n;
  return { rows: rows.map((o) => ({ ...o, userName: users.get(o.userId)?.name ?? "Deleted user", userEmail: users.get(o.userId)?.email ?? "" })), total };
}

/**
 * Starts a checkout: validates the bag against live prices and stock, reserves the stock,
 * and opens a payment session. The order stays "pending" until the gateway confirms payment.
 * Everything happens in one transaction, so a failure part-way leaves no half-reserved stock.
 */
export function createCheckout(userId: string, lines: { productId: string; qty: number; size?: string }[], address: string, currency: Currency, rate: number, provider: string): Order {
  expireStale(true);
  const id = tx(() => {
    const open = (q("SELECT COUNT(*) AS n FROM orders o JOIN payments p ON p.order_id = o.id WHERE o.user_id = ? AND p.status = 'requires_payment'").get(userId) as { n: number }).n;
    if (open >= 3) throw new Error("You have unfinished checkouts. Complete or cancel one first.");

    type Line = { product: Product; variantId: number; size: string; qty: number };
    const merged = new Map<number, Line>();
    for (const l of lines) {
      const product = getProductById(l.productId);
      const qty = Math.floor(l.qty);
      if (!product || !product.active || !(qty >= 1 && qty <= 10)) throw new Error("Invalid item in cart.");
      const size = String(l.size ?? "");
      const v = q("SELECT id FROM variants WHERE product_id = ? AND size = ?").get(product.id, size) as { id: number } | undefined;
      if (!v) throw new Error(`Choose a size for ${product.name}.`);
      const have = merged.get(v.id);
      if (have) have.qty += qty; else merged.set(v.id, { product, variantId: v.id, size, qty });
    }
    if (!merged.size) throw new Error("Your bag is empty.");

    // The WHERE clause makes the stock check and the decrement a single indivisible step: it cannot oversell.
    for (const l of merged.values()) {
      if (q("UPDATE variants SET stock = stock - ? WHERE id = ? AND stock >= ?").run(l.qty, l.variantId, l.qty).changes !== 1) {
        throw new Error(`${l.product.name} (${l.size}) is out of stock.`);
      }
    }
    const items = [...merged.values()];
    const total = items.reduce((s, l) => s + l.product.price * l.qty, 0);
    const amountMinor = items.reduce((s, l) => s + unitMinor(l.product.price, currency, rate) * l.qty, 0);
    const orderId = Number(q("INSERT INTO orders (user_id, total, status, address, created_at, restocked) VALUES (?, ?, 'pending', ?, ?, 0)").run(userId, total, address, Date.now()).lastInsertRowid);
    for (const l of items) q("INSERT INTO order_items (order_id, product_id, variant_id, size, qty, price) VALUES (?, ?, ?, ?, ?, ?)").run(orderId, l.product.id, l.variantId, l.size, l.qty, l.product.price);
    q("INSERT INTO payments (order_id, provider, session_id, currency, rate, amount_minor, status, attempts, expires_at) VALUES (?, ?, ?, ?, ?, ?, 'requires_payment', 0, ?)")
      .run(orderId, provider, "cs_" + randomBytes(24).toString("hex"), currency, rate, amountMinor, Date.now() + CHECKOUT_MINUTES * 60_000);
    return orderId;
  });
  return orderById(id)!;
}

/** Puts reserved stock back on the shelf, exactly once per order. */
export function restock(orderId: number) {
  tx(() => {
    if (q("UPDATE orders SET restocked = 1 WHERE id = ? AND restocked = 0").run(orderId).changes !== 1) return;
    q(`UPDATE variants SET stock = stock + (SELECT COALESCE(SUM(qty), 0) FROM order_items i WHERE i.order_id = ? AND i.variant_id = variants.id)
       WHERE id IN (SELECT variant_id FROM order_items WHERE order_id = ? AND variant_id IS NOT NULL)`).run(orderId, orderId);
  });
}

const sweep = globalThis as unknown as { __altaSweep?: number };
/**
 * Cancels unpaid checkouts whose time ran out and releases their stock.
 * Routine page loads run it at most every 10 seconds; payment steps pass `force` for an exact answer.
 */
export function expireStale(force = false) {
  const now = Date.now();
  if (!force && now - (sweep.__altaSweep ?? 0) < 10_000) return;
  sweep.__altaSweep = now;
  const due = q("SELECT order_id AS id FROM payments WHERE status = 'requires_payment' AND expires_at < ?").all(now) as { id: number }[];
  for (const { id } of due) {
    tx(() => {
      q("UPDATE payments SET status = 'expired', failure = 'Checkout expired' WHERE order_id = ? AND status = 'requires_payment'").run(id);
      q("UPDATE orders SET status = 'cancelled' WHERE id = ?").run(id);
      restock(id);
    });
  }
}

export function markPaid(orderId: number, method: { brand: string; last4: string }) {
  tx(() => {
    q("UPDATE payments SET status = 'paid', method_brand = ?, method_last4 = ?, pending_brand = NULL, pending_last4 = NULL WHERE order_id = ?").run(method.brand, method.last4, orderId);
    q("UPDATE orders SET status = 'paid' WHERE id = ?").run(orderId);
  });
}

export function markUnpaid(orderId: number, kind: "failed" | "canceled", reason: string) {
  tx(() => {
    q("UPDATE payments SET status = ?, failure = ?, pending_brand = NULL, pending_last4 = NULL WHERE order_id = ?").run(kind, reason, orderId);
    q("UPDATE orders SET status = 'cancelled' WHERE id = ?").run(orderId);
    restock(orderId);
  });
}

export const eventSeen = (eventId: string) => !!q("SELECT 1 FROM payment_events WHERE event_id = ?").get(eventId);
export const recordEvent = (eventId: string, orderId: number) => { q("INSERT INTO payment_events (event_id, order_id, received_at) VALUES (?, ?, ?)").run(eventId, orderId, Date.now()); };

export const bumpAttempts = (orderId: number) => (q("UPDATE payments SET attempts = attempts + 1 WHERE order_id = ? RETURNING attempts").get(orderId) as { attempts: number }).attempts;
export const setPending3ds = (orderId: number, m: { brand: string; last4: string } | null) => { q("UPDATE payments SET pending_brand = ?, pending_last4 = ? WHERE order_id = ?").run(m?.brand ?? null, m?.last4 ?? null, orderId); };

/** Admin status change. Unpaid orders can't be fulfilled, and cancelling a paid order refunds it and restocks once. */
export function adminSetStatus(orderId: number, next: Status): { ok: true } | { ok: false; error: string } {
  return tx(() => {
    const o = orderById(orderId);
    if (!o) return { ok: false as const, error: "Order not found." };
    const pay = o.payment;
    if (pay && pay.status !== "paid" && pay.status !== "refunded" && next !== "cancelled" && next !== "pending") return { ok: false as const, error: "This order has not been paid." };
    if (next === "cancelled" && pay?.status === "paid") { q("UPDATE payments SET status = 'refunded' WHERE order_id = ?").run(orderId); restock(orderId); }
    q("UPDATE orders SET status = ? WHERE id = ?").run(next, orderId);
    return { ok: true as const };
  });
}

// ---------------------------------------------------------------- analytics (all computed in SQL)

export function stats(days = 30) {
  const now = Date.now();
  const from = now - days * DAY, prevFrom = now - 2 * days * DAY;
  const period = (a: number, b: number) => q(`SELECT COALESCE(SUM(total), 0) AS r, COUNT(*) AS n FROM orders WHERE status IN ${REVENUE} AND created_at >= ? AND created_at < ?`).get(a, b) as { r: number; n: number };
  const cur = period(from, now + DAY), prev = period(prevFrom, from);

  const perDay = new Map((q(`SELECT date(created_at / 1000, 'unixepoch', 'localtime') AS d, SUM(total) AS v FROM orders WHERE status IN ${REVENUE} AND created_at >= ? GROUP BY d`).all(from) as { d: string; v: number }[]).map((r) => [r.d, r.v]));
  const daily: { label: string; value: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const t = new Date(now - i * DAY);
    const key = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
    daily.push({ label: t.toLocaleDateString("en-US", { month: "short", day: "numeric" }), value: perDay.get(key) ?? 0 });
  }

  const categories = q(`SELECT c.name, SUM(i.qty * i.price) AS value FROM order_items i JOIN orders o ON o.id = i.order_id
                        JOIN products p ON p.id = i.product_id JOIN categories c ON c.id = p.category_id
                        WHERE o.status IN ${REVENUE} AND o.created_at >= ? GROUP BY c.id ORDER BY value DESC`).all(from) as { name: string; value: number }[];

  const topRows = q(`SELECT i.product_id AS id, SUM(i.qty) AS qty, SUM(i.qty * i.price) AS revenue FROM order_items i JOIN orders o ON o.id = i.order_id
                     WHERE o.status IN ${REVENUE} AND o.created_at >= ? GROUP BY i.product_id ORDER BY revenue DESC LIMIT 5`).all(from) as { id: string; qty: number; revenue: number }[];
  const topProducts = new Map(getProductsByIds(topRows.map((r) => r.id), true).map((p) => [p.id, p]));
  const top = topRows.filter((r) => topProducts.has(r.id)).map((r) => ({ product: topProducts.get(r.id)!, qty: r.qty, revenue: r.revenue }));

  const lowRows = q(`SELECT v.product_id AS id, SUM(v.stock) AS stock FROM variants v JOIN products p ON p.id = v.product_id WHERE p.active = 1
                     GROUP BY v.product_id HAVING SUM(v.stock) <= 6 ORDER BY stock, v.product_id`).all() as { id: string; stock: number }[];
  const lowProducts = new Map(getProductsByIds(lowRows.map((r) => r.id)).map((p) => [p.id, p]));
  const low = lowRows.filter((r) => lowProducts.has(r.id)).map((r) => ({ product: lowProducts.get(r.id)!, stock: r.stock }));

  const one = (sql: string, ...a: unknown[]) => (q(sql).get(...a) as { n: number }).n;
  return {
    revenue: cur.r, prevRevenue: prev.r, orders: cur.n, prevOrders: prev.n, aov: cur.n ? Math.round(cur.r / cur.n) : 0,
    customers: one("SELECT COUNT(*) AS n FROM users WHERE role = 'customer'"),
    newCustomers: one("SELECT COUNT(*) AS n FROM users WHERE role = 'customer' AND created_at >= ?", from),
    toFulfil: one("SELECT COUNT(*) AS n FROM orders WHERE status = 'paid'"),
    daily, top, categories, low,
  };
}

/** The customer's most recent order, for the assistant. */
export const latestOrderFor = (userId: string) => listOrdersForUser(userId, 1)[0];
export const dbReady = () => { db(); return true; };
