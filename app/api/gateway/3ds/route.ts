import { clientIp, clip, forbidden, rateLimit, sameOrigin, tooMany } from "@/lib/security";
import { deliverWebhook } from "@/lib/payments/demo-gateway";
import { expireStale, orderBySession, setPending3ds } from "@/lib/store";

export const dynamic = "force-dynamic";

// Demo gateway: the result of the simulated bank authentication (3-D Secure) step.
export async function POST(req: Request) {
  if (!sameOrigin(req)) return forbidden();
  const wait = rateLimit(`3ds-ip:${clientIp(req)}`, 30, 10 * 60_000);
  if (wait) return tooMany(wait);
  const body = await req.json().catch(() => ({}));
  const sessionId = clip(body.sessionId, 80);
  expireStale(true);
  const order = orderBySession(sessionId);
  const pay = order?.payment;
  if (!order || !pay) return Response.json({ error: "Payment session not found." }, { status: 404 });
  if (pay.status !== "requires_payment" || !pay.pending3ds) return Response.json({ status: "closed", redirect: `/order/${order.id}` }, { status: 409 });
  const method = pay.pending3ds;
  if (body.approve === true) {
    await deliverWebhook(new URL(req.url).origin, { type: "payment.succeeded", data: { sessionId, amountMinor: pay.amountMinor, currency: pay.currency, method } });
    return Response.json({ status: "succeeded", redirect: `/order/${order.id}` });
  }
  setPending3ds(order.id, null); // authentication failed: back to the card form
  return Response.json({ status: "declined", redirect: `/pay/${sessionId}?error=authentication` });
}
