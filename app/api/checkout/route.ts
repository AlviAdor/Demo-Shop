import { getUser } from "@/lib/auth";
import { getRate } from "@/lib/currency-server";
import { isCurrency } from "@/lib/currency";
import { PROVIDER, paymentsEnabled } from "@/lib/payments";
import { clip, forbidden, rateLimit, sameOrigin, tooMany } from "@/lib/security";
import { createCheckout } from "@/lib/store";

// Starts a checkout. Prices, totals and stock are all computed here on the server; the browser only sends
// product ids, sizes and quantities. The order is "pending" until the payment gateway confirms payment.
export async function POST(req: Request) {
  if (!sameOrigin(req)) return forbidden();
  const enabled = paymentsEnabled();
  if (!enabled.ok) return Response.json({ error: enabled.reason }, { status: 503 });
  const user = await getUser();
  if (!user) return Response.json({ error: "Please sign in to check out." }, { status: 401 });
  const wait = rateLimit(`checkout:${user.id}`, 10, 10 * 60_000);
  if (wait) return tooMany(wait);
  const body = await req.json().catch(() => ({}));
  const address = clip(body.address, 300);
  if (address.length < 5) return Response.json({ error: "Enter a shipping address." }, { status: 400 });
  if (!isCurrency(body.currency)) return Response.json({ error: "Unsupported currency." }, { status: 400 });
  const items = Array.isArray(body.items) ? body.items.slice(0, 30).map((i: Record<string, unknown>) => ({ productId: clip(i?.productId, 20), qty: Number(i?.qty), size: clip(i?.size, 10) })) : [];
  try {
    const order = createCheckout(user.id, items, address, body.currency, getRate(), PROVIDER);
    return Response.json({ redirectUrl: `/pay/${order.payment!.sessionId}` });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Checkout failed." }, { status: 400 });
  }
}
