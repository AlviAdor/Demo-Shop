import { createHmac } from "node:crypto";
const B = process.env.BASE_URL ?? "http://localhost:3000";
const WSEC = process.env.PAYMENT_WEBHOOK_SECRET ?? "dev-only-webhook-secret-change-me-0123456789";
let pass = 0, fail = 0;
// Payment security tests. Run against a freshly started server (sign-up and checkout are rate limited):
//   AUTH_SECRET=x PAYMENT_WEBHOOK_SECRET=y ALLOW_DEMO_PAYMENTS=1 npm run start   then   npm run test:payments
const ok = (name, cond, extra = "") => { if (cond) pass++; else fail++; console.log(`${cond ? "PASS" : "FAIL"}  ${name}${extra ? "  → " + extra : ""}`); };
class Client { constructor() { this.c = ""; }
  async req(method, path, body, headers = {}) { const r = await fetch(B + path, { method, redirect: "manual", headers: { "content-type": "application/json", cookie: this.c, ...headers }, body: body ? JSON.stringify(body) : undefined });
    const sc = r.headers.getSetCookie?.() ?? []; for (const x of sc) { const [kv] = x.split(";"); this.c = (this.c ? this.c + "; " : "") + kv; }
    let j = null; try { j = await r.json(); } catch {} return { s: r.status, j, r }; }
  async login(email, password) { return this.req("POST", "/api/auth/login", { email, password }); } }
const sign = (body, t = Math.floor(Date.now() / 1000)) => `t=${t},v1=${createHmac("sha256", WSEC).update(`${t}.${body}`).digest("hex")}`;
const hook = async (evt, hdr) => { const body = JSON.stringify(evt); return fetch(B + "/api/webhooks/payments", { method: "POST", headers: { "content-type": "application/json", ...(hdr === undefined ? { "alta-signature": sign(body) } : hdr ? { "alta-signature": hdr } : {}) }, body }); };
const sid = (u) => u.split("/pay/")[1];
const card = (number, extra = {}) => ({ number, exp: "12 / 30", cvc: "123", name: "Test", ...extra });

const cust = new Client(), other = new Client(), owner = new Client();
await cust.login("customer@alta.test", "customer123"); await owner.login("owner@alta.test", "owner123");
await other.req("POST", "/api/auth/login", { mode: "register", name: "Other Person", email: `other${Date.now()}@t.dev`, password: "longenough1" });
const items = [{ productId: "p04", qty: 1, size: "M" }, { productId: "p03", qty: 1, size: "L" }];
// Stock is tracked per size, so the test sets the stock it needs through the real inventory endpoint.
for (const [id, size, stock] of [["p04", "M", 40], ["p03", "L", 40], ["p06", "S", 40], ["p11", "One size", 2], ["p12", "One size", 40]]) await owner.req("PATCH", `/api/admin/products/${id}`, { size, stock });
const addr = "1 Test Street, Dhaka";

// --- checkout: server-side pricing in both currencies
let r = await cust.req("POST", "/api/checkout", { items, address: addr, currency: "USD" });
ok("checkout creates a payment session (USD)", r.s === 200 && r.j.redirectUrl?.startsWith("/pay/cs_"), r.j.redirectUrl?.slice(0, 18));
const usdSession = sid(r.j.redirectUrl);
r = await cust.req("POST", "/api/checkout", { items, address: addr, currency: "BDT" });
ok("checkout creates a payment session (BDT)", r.s === 200); const bdtSession = sid(r.j.redirectUrl);
r = await cust.req("POST", "/api/checkout", { items, address: addr, currency: "EUR" });
ok("unsupported currency rejected", r.s === 400);
r = await cust.req("POST", "/api/checkout", { items: [{ productId: "p04", qty: 1, size: "ZZ" }], address: addr, currency: "USD" });
ok("invalid size rejected", r.s === 400, r.j.error);
r = await cust.req("POST", "/api/checkout", { items: [{ productId: "p04", qty: 99, size: "M" }], address: addr, currency: "USD" });
ok("absurd quantity rejected", r.s === 400);
r = await new Client().req("POST", "/api/checkout", { items, address: addr, currency: "USD" });
ok("checkout requires login", r.s === 401);
r = await cust.req("POST", "/api/checkout", { items, address: addr, currency: "USD" }, { origin: "https://evil.example" });
ok("checkout blocks cross-site requests", r.s === 403);
r = await cust.req("POST", "/api/checkout", { items, address: addr, currency: "USD", price: 1, amountMinor: 1, total: 1 });
ok("client-sent prices are ignored (still creates a session; 3rd open one)", r.s === 200);
r = await cust.req("POST", "/api/checkout", { items, address: addr, currency: "USD" });
ok("max 3 open checkouts per user (stock-hoarding guard)", r.s === 400, r.j.error);

// --- hosted page access control
r = await fetch(`${B}/pay/${usdSession}`, { headers: { cookie: other.c }, redirect: "manual" });
ok("another customer can't open my payment page", r.status === 404);
r = await fetch(`${B}/pay/${usdSession}`, { redirect: "manual" });
ok("anonymous visitor is sent to login", r.status === 307 && (r.headers.get("location") ?? "").includes("/login"));
r = await fetch(`${B}/pay/${usdSession}`, { headers: { cookie: cust.c }, redirect: "manual" });
ok("owner can open their payment page", r.status === 200);
const html = await r.text(); ok("payment page shows the server-computed amount", html.includes("$218.00"), (html.match(/\$\d[\d,]*\.\d\d/) || [""])[0]);

// --- charge: real card numbers are refused
r = await cust.req("POST", "/api/gateway/charge", { sessionId: usdSession, ...card("4111 1111 1111 1111") });
ok("real-looking card (valid Luhn, not a test card) is refused", r.s === 422 && r.j.status === "rejected", r.j.message?.slice(0, 50));
r = await cust.req("POST", "/api/gateway/charge", { sessionId: usdSession, ...card("1234 5678 9012 3456") });
ok("invalid card number rejected", r.s === 422);
r = await cust.req("POST", "/api/gateway/charge", { sessionId: usdSession, ...card("4242 4242 4242 4242", { exp: "01 / 20" }) });
ok("expired card rejected", r.s === 422);
r = await cust.req("POST", "/api/gateway/charge", { sessionId: usdSession, ...card("4000 0000 0000 0002") });
ok("declined card → 402 with retry", r.s === 402 && r.j.status === "declined", r.j.message);
r = await cust.req("POST", "/api/gateway/charge", { sessionId: usdSession, ...card("4000 0000 0000 9995") });
ok("insufficient funds → declined", r.s === 402);
r = await cust.req("POST", "/api/gateway/charge", { sessionId: "cs_doesnotexist", ...card("4242 4242 4242 4242") });
ok("unknown session → 404", r.s === 404);
r = await cust.req("POST", "/api/gateway/charge", { sessionId: usdSession, ...card("4242 4242 4242 4242") }, { origin: "https://evil.example" });
ok("charge blocks cross-site requests", r.s === 403);

// --- success path (USD)
r = await cust.req("POST", "/api/gateway/charge", { sessionId: usdSession, ...card("4242 4242 4242 4242") });
ok("test card succeeds and redirects to the order", r.s === 200 && r.j.status === "succeeded" && /^\/order\/\d+$/.test(r.j.redirect), r.j.redirect);
const orderId = Number(r.j.redirect.split("/").pop());
r = await cust.req("GET", `/api/orders/${orderId}/status`); ok("order is now paid", r.j.status === "paid" && r.j.payment === "paid");
r = await cust.req("POST", "/api/gateway/charge", { sessionId: usdSession, ...card("4242 4242 4242 4242") });
ok("paying the same session twice is refused (no double charge)", r.s === 409);
r = await other.req("GET", `/api/orders/${orderId}/status`); ok("another customer can't read my order status", r.s === 404);
const page = await (await fetch(`${B}/order/${orderId}`, { headers: { cookie: cust.c } })).text();
const pageText = page.replace(/<!--.*?-->/g, "").replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
ok("confirmation page shows card brand + last 4 only", /Paid with Visa ending 4242/i.test(pageText) && !/4242 ?4242 ?4242 ?4242/.test(pageText));

// --- BDT amount math: p04 $99 → ৳12,078 and p03 $119 → ৳14,518, so ৳26,596
const expectBdt = (Math.round(99 * 122) + Math.round(119 * 122)) * 100;
const bdtPage = await (await fetch(`${B}/pay/${bdtSession}`, { headers: { cookie: cust.c } })).text();
ok("BDT session charges the locked, rounded taka total", bdtPage.includes("৳26,596"), "৳26,596 expected");

// --- webhook attacks (use the BDT session, still unpaid)
const evt = (over = {}, data = {}) => ({ id: "evt_" + Math.random().toString(16).slice(2), type: "payment.succeeded", created: Math.floor(Date.now() / 1000), data: { sessionId: bdtSession, amountMinor: expectBdt, currency: "BDT", method: { brand: "Visa", last4: "4242" }, ...data }, ...over });
r = await hook(evt(), null); ok("webhook with no signature → 401", r.status === 401);
r = await hook(evt(), "t=1,v1=" + "0".repeat(64)); ok("webhook with forged signature → 401", r.status === 401);
const e1 = evt(); const old = Math.floor(Date.now() / 1000) - 3600; r = await hook(e1, sign(JSON.stringify(e1), old)); ok("webhook replayed with an old timestamp → 401", r.status === 401);
const e2 = evt({}, { amountMinor: 100 }); r = await hook(e2); ok("validly signed event with the wrong amount → 400 and order stays unpaid", r.status === 400);
const e3 = evt({}, { currency: "USD" }); r = await hook(e3); ok("validly signed event with the wrong currency → 400", r.status === 400);
r = await cust.req("GET", "/api/orders/" + (orderId + 1) + "/status"); ok("BDT order still awaiting payment after attacks", r.j?.payment === "requires_payment", JSON.stringify(r.j));
const e4 = evt(); r = await hook(e4); ok("correct signed event marks it paid", r.status === 200);
r = await hook(e4); const j4 = await r.json(); ok("same event delivered twice is idempotent", r.status === 200 && /already processed/.test(j4.message), j4.message);
r = await hook(evt({ type: "payment.failed" })); const j5 = await r.json(); ok("a later 'failed' event can't undo a paid order", r.status === 200 && /ignored/.test(j5.message), j5.message);
r = await cust.req("GET", "/api/orders/" + (orderId + 1) + "/status"); ok("order stays paid", r.j.status === "paid");
r = await fetch(B + "/api/webhooks/payments", { method: "POST", body: "x".repeat(20000), headers: { "alta-signature": "t=1,v1=00" } }); ok("oversized webhook body → 413", r.status === 413);

// --- 3-D Secure
r = await cust.req("POST", "/api/checkout", { items: [{ productId: "p06", qty: 1, size: "S" }], address: addr, currency: "USD" }); const s3 = sid(r.j.redirectUrl);
r = await cust.req("POST", "/api/gateway/charge", { sessionId: s3, ...card("4000 0000 0000 3220") }); ok("3-D Secure card → requires_action", r.j.status === "requires_action", r.j.redirect?.slice(-4));
r = await cust.req("POST", "/api/gateway/3ds", { sessionId: s3, approve: false }); ok("failed authentication returns to the card form", r.j.status === "declined" && r.j.redirect.includes("error=authentication"));
r = await cust.req("POST", "/api/gateway/3ds", { sessionId: s3, approve: true }); ok("3DS approval without a pending challenge is refused", r.s === 409);
r = await cust.req("POST", "/api/gateway/charge", { sessionId: s3, ...card("4000 0000 0000 3220") });
r = await cust.req("POST", "/api/gateway/3ds", { sessionId: s3, approve: true }); ok("approved authentication completes the payment", r.j.status === "succeeded");

// --- cancel releases stock; decline limit fails the payment
r = await cust.req("POST", "/api/checkout", { items: [{ productId: "p11", qty: 2, size: "One size" }], address: addr, currency: "USD" }); const s4 = sid(r.j.redirectUrl);
r = await cust.req("POST", "/api/gateway/cancel", { sessionId: s4 }); ok("customer can cancel the payment page", r.s === 200);
const ordersPage = await (await fetch(`${B}/account`, { headers: { cookie: cust.c } })).text();
ok("cancelled order shows as cancelled", /cancelled/i.test(ordersPage));
r = await cust.req("POST", "/api/checkout", { items: [{ productId: "p12", qty: 1, size: "One size" }], address: addr, currency: "USD" }); const s5 = sid(r.j.redirectUrl);
let last; for (let i = 0; i < 5; i++) last = await cust.req("POST", "/api/gateway/charge", { sessionId: s5, ...card("4000 0000 0000 0002") });
ok("5th decline ends the payment for good", last.j.status === "failed", last.j.status);
const failedOrder = Number(last.j.redirect.split("/").pop());

// --- admin guards
r = await owner.req("PATCH", `/api/admin/orders/${failedOrder}`, { status: "shipped" }); ok("admin can't ship an order whose payment failed/cancelled", r.s === 400, r.j?.error);
r = await owner.req("PATCH", `/api/admin/orders/${orderId}`, { status: "shipped" }); ok("admin can ship a paid order", r.s === 200);
r = await owner.req("PATCH", `/api/admin/orders/${orderId}`, { status: "cancelled" }); ok("cancelling a paid order refunds it", r.s === 200);
r = await cust.req("GET", `/api/orders/${orderId}/status`); ok("payment is marked refunded", r.j.payment === "refunded", r.j.payment);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
