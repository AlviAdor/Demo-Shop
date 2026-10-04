import { getProducts, getProductsByIds, toCard } from "./catalog";
import { DEFAULT_RATE, format, type Currency } from "./currency";
import { latestOrderFor, stats } from "./store";
import type { Product, ProductCard, Role } from "./types";

export type AssistantRequest = { message: string; lastProducts?: string[] };
export type AssistantReply = {
  steps: string[]; // the "agent trace": which tools it ran
  text: string;
  products?: ProductCard[];
  actions?: { label: string; type: "add_to_cart" | "navigate"; productId?: string; href?: string }[];
  suggestions?: string[];
};
type Viewer = { id: string; name: string; role: Role } | null;

const has = (m: string, ...words: string[]) => words.some((w) => m.includes(w));

const CATEGORY_WORDS: Record<string, string[]> = {
  Outerwear: ["coat", "jacket", "bomber", "outerwear", "trench"],
  Knitwear: ["knit", "sweater", "jumper", "pullover", "merino", "cardigan"],
  Shirts: ["shirt", "poplin", "oxford", "blouse"],
  Trousers: ["trouser", "pant", "jeans", "denim", "bottoms"],
  Footwear: ["shoe", "boot", "loafer", "sneaker", "footwear"],
  Bags: ["bag", "tote", "crossbody", "handbag"],
};

// --- "tools" the agent can call ---
function searchCatalogue(all: Product[], opts: { category?: string; max?: number; tags?: string[]; text?: string }) {
  let list = all.filter((p) => p.stock > 0);
  if (opts.category) list = list.filter((p) => p.category === opts.category);
  if (opts.max) list = list.filter((p) => p.price <= opts.max!);
  if (opts.tags?.length) {
    const scored = list.map((p) => ({ p, s: opts.tags!.filter((t) => p.tags.includes(t)).length })).filter((x) => x.s > 0);
    list = scored.sort((a, b) => b.s - a.s).map((x) => x.p);
  }
  if (opts.text) {
    const t = opts.text;
    const named = all.filter((p) => t.includes(p.name.toLowerCase()) || t.includes(p.name.split(" ")[0].toLowerCase()));
    if (named.length) list = named;
  }
  return list;
}

function money(m: string): number | undefined {
  const r = m.match(/(?:under|below|less than|within|max|budget(?: of)?|up to|\$|৳|tk)\s*[$৳]?\s*(\d[\d,]*)/);
  return r ? parseInt(r[1].replace(/,/g, ""), 10) : undefined;
}

function productList(ps: Product[]) {
  return ps.slice(0, 3);
}

export function runAssistant(req: AssistantRequest, viewer: Viewer, currency: Currency = "USD", rate: number = DEFAULT_RATE): AssistantReply {
  const usd = (n: number) => format(n, currency, rate); // every price in a reply is shown in the visitor's currency
  const m = req.message.toLowerCase().trim();
  const ALL = getProducts(); // one cached catalogue read plus one small stock query per message
  const steps: string[] = [];
  const first = viewer?.name.split(" ")[0];
  const staffLike = viewer?.role === "owner" || viewer?.role === "staff";

  // 1. Business intelligence (owner / staff only)
  const bi = has(m, "revenue", "sales", "how are we doing", "how did we do", "best seller", "bestseller", "top product", "top seller", "profit", "customers", "kpi", "performance", "to fulfil", "to fulfill", "pending order", "low stock", "restock", "running low");
  if (bi && !has(m, "my order")) {
    if (!staffLike) {
      return { steps: ["Checked your role: customer"], text: "Store performance data is only available to the owner and staff accounts. I can help you find products, track your order or answer shipping questions though.", suggestions: ["Track my order", `Gift ideas under ${usd(150)}`] };
    }
    const s = stats(30);
    if (has(m, "low stock", "restock", "running low")) {
      steps.push("Queried inventory for items with 6 or fewer units");
      return { steps, text: s.low.length ? `${s.low.length} items are running low: ` + s.low.map((l) => `${l.product.name} (${l.stock} left)`).join(", ") + ". I'd restock the lowest ones first." : "Everything is comfortably stocked.", actions: [{ label: "Open inventory", type: "navigate", href: "/admin/inventory" }], suggestions: ["How are sales this month?", "Any orders to fulfil?"] };
    }
    if (has(m, "to fulfil", "to fulfill", "pending order")) {
      steps.push("Counted orders in pending or paid state");
      return { steps, text: `There are ${s.toFulfil} orders waiting to be fulfilled. Staff can mark them shipped from the orders page.`, actions: [{ label: "Open orders", type: "navigate", href: "/admin/orders" }] };
    }
    if (has(m, "best seller", "bestseller", "top product", "top seller")) {
      steps.push("Aggregated 30-day order items by product");
      const t = s.top.slice(0, 3);
      return { steps, text: "Your best sellers over the last 30 days: " + t.map((x, i) => `${i + 1}. ${x.product.name} (${x.qty} sold, ${usd(x.revenue)})`).join(", ") + ".", products: t.map((x) => toCard(x.product)), suggestions: ["Any items running low?"] };
    }
    if (viewer?.role === "staff" && has(m, "revenue", "profit", "sales")) {
      return { steps: ["Checked your role: staff"], text: "Revenue figures are owner-only. I can show you orders to fulfil and low-stock items instead.", suggestions: ["Any orders to fulfil?", "What's running low?"] };
    }
    steps.push("Summed non-cancelled orders for the last 30 days", "Compared with the previous 30 days");
    const delta = s.prevRevenue ? Math.round(((s.revenue - s.prevRevenue) / s.prevRevenue) * 100) : 0;
    return { steps, text: `Over the last 30 days you made ${usd(s.revenue)} from ${s.orders} orders (avg ${usd(s.aov)}), ${delta >= 0 ? "up" : "down"} ${Math.abs(delta)}% on the previous period. ${s.toFulfil} orders still need fulfilling and ${s.low.length} products are low on stock.`, actions: [{ label: "Open dashboard", type: "navigate", href: "/admin" }], suggestions: ["What are my best sellers?", "What's running low?", "Any orders to fulfil?"] };
  }

  // 2. Order tracking
  if (has(m, "my order", "track", "where is", "order status", "delivery status")) {
    if (!viewer) return { steps: ["Checked session: not signed in"], text: "Sign in and I can look up your latest order straight away.", actions: [{ label: "Sign in", type: "navigate", href: "/login?next=/account" }] };
    steps.push(`Looked up orders for ${viewer.name}`);
    const o = latestOrderFor(viewer.id);
    if (!o) return { steps, text: "You haven't placed an order yet. Want some recommendations?", suggestions: [`Gift ideas under ${usd(150)}`] };
    const eta = { pending: "It is waiting for payment to be completed.", paid: "It's being prepared and ships within 24 hours.", shipped: "It's on its way and should arrive in 2 to 4 days.", delivered: "It has been delivered.", cancelled: "It was cancelled." }[o.status];
    return { steps, text: `Your latest order #${o.id} (${usd(o.total)}) is ${o.status === "pending" ? "awaiting payment" : o.status}. ${eta}`, actions: [{ label: "View my orders", type: "navigate", href: "/account" }] };
  }

  // 3. Policy FAQs
  if (has(m, "ship", "delivery", "how long")) return { steps: ["Searched help centre: shipping"], text: "Shipping is free over $150. Standard delivery takes 3 to 5 working days and express takes 1 to 2. Every parcel is tracked and insured.", suggestions: ["What is your returns policy?"] };
  if (has(m, "return", "refund", "exchange")) return { steps: ["Searched help centre: returns"], text: "You have 30 days to return anything unworn, with free return labels. Refunds land within 5 working days of us receiving the parcel.", suggestions: ["How long is shipping?"] };
  if (has(m, "discount", "promo", "coupon", "code", "offer", "sale")) return { steps: ["Checked active promotions"], text: "Use code WELCOME10 for 10% off your first order. (Demo only: codes aren't applied at checkout.)", suggestions: ["Show me bestsellers", `Gift ideas under ${usd(150)}`] };

  // 4. Add to cart from context
  if (has(m, "add") && has(m, "cart", "bag", "basket")) {
    const pool = getProductsByIds(req.lastProducts ?? []);
    const named = searchCatalogue(ALL, { text: m }).filter((p) => m.includes(p.name.split(" ")[0].toLowerCase()));
    const target = named[0] ?? (has(m, "second", "2nd") ? pool?.[1] : has(m, "third", "3rd") ? pool?.[2] : pool?.[0]);
    if (target) {
      steps.push(`Resolved "${target.name}" from the conversation`, `Checked stock: ${target.stock} available`);
      if (target.sizes.length > 1) return { steps, text: `The ${target.name} (${usd(target.price)}) comes in ${target.sizes[0]} to ${target.sizes[target.sizes.length - 1]}. Pick your size on its page and I'll keep it in your bag.`, products: [toCard(target)], actions: [{ label: "Choose a size", type: "navigate", href: `/product/${target.slug}` }] };
      return { steps, text: `Done. I've lined up the ${target.name} (${usd(target.price)}) for your bag.`, products: [toCard(target)], actions: [{ label: `Add ${target.name} to bag`, type: "add_to_cart", productId: target.id }] };
    }
    return { steps, text: "Tell me which product you'd like and I'll add it, or ask for recommendations first.", suggestions: ["Show me bestsellers"] };
  }

  // 5. Stock check
  if (has(m, "in stock", "available", "availability", "left")) {
    const named = searchCatalogue(ALL, { text: m });
    const target = named.length && named.length < ALL.length ? named[0] : undefined;
    if (target) {
      const n = target.stock;
      steps.push(`Checked live stock for ${target.name}`);
      return { steps, text: n > 5 ? `Yes, the ${target.name} is in stock (${n} available).` : n > 0 ? `Only ${n} of the ${target.name} left, so I wouldn't wait.` : `The ${target.name} is sold out right now.`, products: [toCard(target)] };
    }
  }

  // 5b. Sizing
  if (has(m, "size", "sizing", "fit", "fits")) {
    const named = searchCatalogue(ALL, { text: m });
    const pool = getProductsByIds(req.lastProducts ?? []);
    const target = (named.length && named.length < ALL.length ? named[0] : undefined) ?? pool?.[0];
    steps.push(target ? `Looked up sizing for ${target.name}` : "Searched help centre: size guide");
    if (target) return { steps, text: target.sizes.length === 1 ? `The ${target.name} is one size.` : `The ${target.name} comes in ${target.sizes.join(", ")}. ${target.category === "Footwear" ? "Sizes are EU and run true." : target.category === "Trousers" ? "Waist sizes in inches; the cut sits at the natural waist." : "Cut is regular, so size up if you like it relaxed."}`, products: [toCard(target)], actions: [{ label: "Choose a size", type: "navigate", href: `/product/${target.slug}` }] };
    return { steps, text: "Clothing runs XS to XL on a regular fit, trousers by waist size (28 to 36) and shoes in EU sizes (39 to 45). Ask about a specific piece and I'll check.", suggestions: ["What sizes is the wool coat?"] };
  }

  // 6. Recommendations (category / budget / occasion)
  const category = Object.entries(CATEGORY_WORDS).find(([, ws]) => ws.some((w) => m.includes(w)))?.[0];
  const typedBudget = money(m);
  const max = typedBudget !== undefined && currency === "BDT" ? typedBudget / rate : typedBudget; // budgets are compared in USD
  const tags: string[] = [];
  if (has(m, "gift", "present", "birthday", "anniversary")) tags.push("gift");
  if (has(m, " him", "boyfriend", "husband", "dad", "father", "brother", "men")) tags.push("him");
  if (has(m, " her", "girlfriend", "wife", "mom", "mother", "sister", "women")) tags.push("her");
  if (has(m, "travel", "trip", "holiday", "vacation")) tags.push("travel");
  if (has(m, "work", "office", "business", "interview", "meeting")) tags.push("work");
  if (has(m, "summer", "beach", "warm", "spring")) tags.push("summer");
  if (has(m, "winter", "cold", "snow", "autumn", "fall")) tags.push("winter");
  if (has(m, "evening", "dinner", "date", "party", "wedding")) tags.push("evening");
  if (has(m, "everyday", "casual", "weekend")) tags.push("everyday");
  if (has(m, "classic", "timeless", "smart")) tags.push("classic");
  if (has(m, "bestseller", "best seller", "popular", "trending", "best")) {
    const t = stats(30).top.slice(0, 3);
    steps.push("Ranked products by 30-day sales");
    return { steps, text: "These are flying out right now:", products: t.map((x) => toCard(x.product)), suggestions: ["Add the first one to my bag", `Anything under ${usd(100)}?`] };
  }
  if (category || max || tags.length || has(m, "recommend", "suggest", "show", "find", "looking for", "need", "want", "ideas")) {
    steps.push(`Parsed intent${category ? `: ${category}` : ""}${max ? `, budget ${usd(max)}` : ""}${tags.length ? `, tags [${tags.join(", ")}]` : ""}`);
    let list = searchCatalogue(ALL, { category, max, tags });
    steps.push(`Searched catalogue: ${list.length} in-stock matches`);
    if (!list.length && tags.length) { list = searchCatalogue(ALL, { category, max }); steps.push("Relaxed the occasion filter"); }
    if (!list.length) return { steps, text: max ? `Nothing in that range right now. Our entry pieces start at ${usd(Math.min(...ALL.map((p) => p.price)))}.` : "I couldn't find a match. Try a category like coats, knitwear or boots.", suggestions: ["Show me bestsellers"] };
    const pick = productList(list);
    return { steps, text: `${first ? first + ", h" : "H"}ere ${pick.length === 1 ? "is my pick" : `are my top ${pick.length} picks`}${max ? ` under ${usd(max)}` : ""}${category ? ` in ${category.toLowerCase()}` : ""}.`, products: pick.map(toCard), suggestions: ["Add the first one to my bag", "Anything cheaper?", "What sizes are there?"] };
  }

  // 7. Greeting / fallback
  if (has(m, "hi", "hello", "hey", "help", "what can you")) {
    return { steps: [], text: `${first ? `Hi ${first}!` : "Hi!"} I'm the Alta stylist. I can recommend products by budget or occasion, check stock, track your order and answer shipping questions${staffLike ? ", plus summarise store performance for you" : ""}.`, suggestions: staffLike ? ["How are sales this month?", "What's running low?", "Any orders to fulfil?"] : [`Gift ideas under ${usd(150)}`, "Something for work", "Track my order"] };
  }
  return { steps: ["No matching tool found"], text: "I'm not sure I got that. Try asking for a gift idea, a product category, a budget, or where your order is.", suggestions: [`Gift ideas under ${usd(150)}`, "Show me bestsellers", "Shipping times"] };
}

