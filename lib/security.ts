// Small, dependency-free helpers: rate limiting, same-origin checks and input limits.

type Bucket = { count: number; reset: number };
const buckets = new Map<string, Bucket>();

/** Fixed-window limiter. Returns the seconds to wait when blocked, otherwise 0. */
export function rateLimit(key: string, limit: number, windowMs: number): number {
  const now = Date.now();
  if (buckets.size > 5000) for (const [k, b] of buckets) if (b.reset < now) buckets.delete(k);
  const b = buckets.get(key);
  if (!b || b.reset < now) { buckets.set(key, { count: 1, reset: now + windowMs }); return 0; }
  b.count++;
  return b.count > limit ? Math.ceil((b.reset - now) / 1000) : 0;
}
export function resetLimit(key: string) { buckets.delete(key); }

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0].trim() : req.headers.get("x-real-ip")) || "local";
}

/** CSRF defence for cookie-authenticated mutations: browsers always send Origin on these requests. */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return req.headers.get("sec-fetch-site") !== "cross-site"; // curl and server-to-server calls
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try { return new URL(origin).host === host; } catch { return false; }
}

export const tooMany = (retry: number) =>
  Response.json({ error: `Too many attempts. Try again in ${Math.max(1, Math.ceil(retry / 60))} min.` }, { status: 429, headers: { "Retry-After": String(retry) } });
export const forbidden = () => Response.json({ error: "Cross-site request blocked." }, { status: 403 });

export const clip = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
export const isEmail = (v: string) => v.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
