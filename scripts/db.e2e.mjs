// Database, inventory and concurrency tests. Run against a freshly started server with demo data:
//   SEED_DEMO_DATA=1 AUTH_SECRET=x PAYMENT_WEBHOOK_SECRET=y ALLOW_DEMO_PAYMENTS=1 npm run start   then   node scripts/db.e2e.mjs
const B = process.env.BASE_URL ?? "http://localhost:3000";
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => { if (cond) pass++; else fail++; console.log(`${cond ? "PASS" : "FAIL"}  ${name}${extra ? "  → " + extra : ""}`); };
class Client {
  constructor() { this.c = ""; }
  async req(method, path, body, headers = {}) {
    const r = await fetch(B + path, { method, redirect: "manual", headers: { "content-type": "application/json", cookie: this.c, ...headers }, body: body ? JSON.stringify(body) : undefined });
    for (const x of r.headers.getSetCookie?.() ?? []) this.c += (this.c ? "; " : "") + x.split(";")[0];
    const text = await r.text(); let j = null; try { j = JSON.parse(text); } catch {}
    return { s: r.status, j, text };
  }
  login(email, password) { return this.req("POST", "/api/auth/login", { email, password }); }
}
const owner = new Client(), staff = new Client(), customer = new Client();
await Promise.all([owner.login("owner@alta.test", "owner123"), staff.login("staff@alta.test", "staff123"), customer.login("customer@alta.test", "customer123")]);
const patch = (who, id, body) => who.req("PATCH", `/api/admin/products/${id}`, body);
const addr = "1 Test Street, Dhaka";
const checkout = (who, productId, size, qty = 1) => who.req("POST", "/api/checkout", { items: [{ productId, qty, size }], address: addr, currency: "USD" });

// --- permissions
let r = await patch(customer, "p08", { size: "30", stock: 5 }); ok("customer can't edit stock", r.s === 403);
r = await patch(new Client(), "p08", { size: "30", stock: 5 }); ok("anonymous can't edit stock", r.s === 403);
r = await patch(staff, "p08", { size: "30", stock: 3 }); ok("staff can edit stock", r.s === 200);
r = await patch(staff, "p08", { price: 1 }); ok("staff can't change price", r.s === 403);
r = await patch(staff, "p08", { active: false }); ok("staff can't hide a product", r.s === 403);
r = await patch(owner, "p08", { price: 105 }); ok("owner can change price", r.s === 200);
r = await patch(owner, "p08", { price: 99 }); ok("…and change it back", r.s === 200);
r = await owner.req("PATCH", "/api/admin/products/p08", { size: "30", stock: 5 }, { origin: "https://evil.example" }); ok("inventory edits block cross-site requests", r.s === 403);

// --- validation
r = await patch(owner, "p08", { size: "30", stock: -1 }); ok("negative stock rejected", r.s === 400);
r = await patch(owner, "p08", { size: "30", stock: 1.5 }); ok("fractional stock rejected", r.s === 400);
r = await patch(owner, "p08", { size: "30", stock: 1e9 }); ok("absurd stock rejected", r.s === 400);
r = await patch(owner, "p08", { size: "99", stock: 1 }); ok("unknown size rejected", r.s === 400);
r = await patch(owner, "nope", { size: "30", stock: 1 }); ok("unknown product → 404", r.s === 404);
r = await patch(owner, "p08", { price: 0 }); ok("zero price rejected", r.s === 400);
r = await patch(owner, "p08", { categoryId: "no-such-category" }); ok("unknown category rejected", r.s === 400);

// --- per-size stock is real: set sizes, see sold-out in the page
await patch(owner, "p08", { size: "30", stock: 0 });
let page = (await customer.req("GET", "/product/wide-leg-denim")).text;
ok("a size at zero shows as sold out on the product page", /aria-label="30, sold out"/.test(page));
ok("other sizes still orderable", !/aria-label="32, sold out"/.test(page));
r = await checkout(customer, "p08", "30"); ok("checkout refuses a sold-out size", r.s === 400 && /out of stock/i.test(r.j.error), r.j.error);

// --- overselling under concurrent load: stock 3, nine simultaneous buyers
await patch(owner, "p08", { size: "30", stock: 3 });
const buyers = [owner, staff, customer];
const results = await Promise.all(Array.from({ length: 9 }, (_, i) => checkout(buyers[i % 3], "p08", "30")));
const won = results.filter((x) => x.s === 200).length, lost = results.filter((x) => x.s === 400);
ok("9 simultaneous buyers, stock 3 → exactly 3 succeed (no oversell)", won === 3, `${won} succeeded`);
ok("the rest are told it's out of stock or capped", lost.every((x) => /out of stock|unfinished/i.test(x.j.error)), [...new Set(lost.map((x) => x.j.error))].join(" | ").slice(0, 80));
page = (await customer.req("GET", "/product/wide-leg-denim")).text;
ok("stock reads 0 for that size afterwards", /aria-label="30, sold out"/.test(page));
// release: cancel the reservations the buyers are holding so later tests start clean
for (const who of buyers) {
  const acct = (await who.req("GET", "/account")).text;
  for (const m of acct.matchAll(/href="\/pay\/(cs_[a-f0-9]+)"/g)) await who.req("POST", "/api/gateway/cancel", { sessionId: m[1] });
}
await patch(owner, "p08", { size: "30", stock: 20 });

// --- visibility and categories come from the database
r = await patch(owner, "p10", { active: false }); ok("owner can hide a product", r.s === 200);
const inGrid = async (path, slug) => (await customer.req("GET", path)).text.includes(`href="/product/${slug}"`); // the product link only exists in the grid
ok("hidden product disappears from the shop", !(await inGrid("/shop", "suede-loafer")));
r = await customer.req("GET", "/product/suede-loafer"); ok("hidden product page is a real 404", r.s === 404);
r = await checkout(customer, "p10", "41"); ok("hidden product can't be bought", r.s === 400);
ok("hidden product is dropped from the sitemap", !(await customer.req("GET", "/sitemap.xml")).text.includes("suede-loafer"));
ok("admin inventory still lists it as hidden", /hidden from shop/.test((await owner.req("GET", "/admin/inventory")).text));
await patch(owner, "p10", { active: true });
ok("showing it again restores it", await inGrid("/shop", "suede-loafer"));
r = await patch(owner, "p10", { categoryId: "bags" });
ok("owner can move a product to another category", r.s === 200);
ok("it now appears under Bags", await inGrid("/shop?category=Bags", "suede-loafer"));
ok("and no longer under Footwear", !(await inGrid("/shop?category=Footwear", "suede-loafer")));
await patch(owner, "p10", { categoryId: "footwear" });
ok("moved back", await inGrid("/shop?category=Footwear", "suede-loafer"));
ok("unknown category falls back to all products", await inGrid("/shop?category=Nonsense", "oxford-shirt"));

// --- bag lookup endpoint
r = await customer.req("GET", "/api/products?ids=p01,p04,doesnotexist");
ok("bag lookup returns only real, active products", r.s === 200 && r.j.products.length === 2 && r.j.products.every((p) => p.sizeStock && !p.description));

// --- accounts
const email = `race${Date.now()}@t.dev`;
const twin = await Promise.all([new Client().req("POST", "/api/auth/login", { mode: "register", name: "Racer", email, password: "longenough1" }), new Client().req("POST", "/api/auth/login", { mode: "register", name: "Racer", email: email.toUpperCase(), password: "longenough1" })]);
ok("the same email registered twice at once → one wins, one gets 409", twin.map((x) => x.s).sort().join() === "200,409", twin.map((x) => x.s).join(","));
r = await new Client().login(email.toUpperCase(), "longenough1"); ok("email login is case-insensitive", r.s === 200);

// --- admin lists scale with pagination and filters
page = (await owner.req("GET", "/admin/orders")).text; ok("admin orders page renders with pagination", /page 1 of \d+/.test(page.replace(/<!--.*?-->/g, "")));
page = (await owner.req("GET", "/admin/orders?page=2")).text; ok("page 2 renders", /page 2 of/.test(page.replace(/<!--.*?-->/g, "")));
r = await owner.req("GET", "/admin/orders?status=cancelled&page=999"); ok("an out-of-range page doesn't crash", r.s === 200);
r = await owner.req("GET", "/admin/orders?status=bogus"); ok("an unknown status filter is ignored", r.s === 200);
r = await staff.req("GET", "/admin/team"); ok("staff can't open the team page", r.s === 307);
r = await staff.req("GET", "/admin"); ok("staff dashboard redirects to orders", r.s === 307);
page = (await owner.req("GET", "/admin")).text; ok("owner dashboard renders from SQL", /Overview/.test(page) && /\$[\d,]+/.test(page));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
