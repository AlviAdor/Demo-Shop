import { clientIp, clip, forbidden, rateLimit, sameOrigin, tooMany } from "@/lib/security";
import { deliverWebhook } from "@/lib/payments/demo-gateway";
import { expireStale, orderBySession } from "@/lib/store";

export const dynamic = "force-dynamic";

// Demo gateway: the customer abandons the payment page. Cancelling releases the reserved stock.
export async function POST(req: Request) {
  if (!sameOrigin(req)) return forbidden();
  const wait = rateLimit(`cancel-ip:${clientIp(req)}`, 30, 10 * 60_000);
  if (wait) return tooMany(wait);
  const body = await req.json().catch(() => ({}));
  const sessionId = clip(body.sessionId, 80);
  expireStale(true);
  const order = orderBySession(sessionId);
  const pay = order?.payment;
  if (!order || !pay) return Response.json({ error: "Payment session not found." }, { status: 404 });
  if (pay.status === "requires_payment") {
    await deliverWebhook(new URL(req.url).origin, { type: "payment.canceled", data: { sessionId, amountMinor: pay.amountMinor, currency: pay.currency, reason: "Cancelled by the customer" } });
  }
  return Response.json({ redirect: "/shop" });
}
