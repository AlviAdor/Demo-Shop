import { clientIp, clip, forbidden, rateLimit, sameOrigin, tooMany } from "@/lib/security";
import { evaluateCard, deliverWebhook } from "@/lib/payments/demo-gateway";
import { MAX_PAYMENT_ATTEMPTS, bumpAttempts, expireStale, orderBySession, setPending3ds } from "@/lib/store";

export const dynamic = "force-dynamic";

// Demo gateway: processes a card form submission for one payment session.
// The browser sends only the card details and the session id. The amount always comes from the stored session.
export async function POST(req: Request) {
  if (!sameOrigin(req)) return forbidden();
  const wait = Math.max(rateLimit(`charge-ip:${clientIp(req)}`, 30, 10 * 60_000));
  if (wait) return tooMany(wait);
  const body = await req.json().catch(() => ({}));
  const sessionId = clip(body.sessionId, 80);
  expireStale(true);
  const order = orderBySession(sessionId);
  const pay = order?.payment;
  if (!order || !pay) return Response.json({ error: "Payment session not found." }, { status: 404 });
  if (pay.status !== "requires_payment") return Response.json({ status: "closed", redirect: `/order/${order.id}` }, { status: 409 });
  const sessionWait = rateLimit(`charge-session:${sessionId}`, 8, 10 * 60_000); // card-testing protection
  if (sessionWait) return tooMany(sessionWait);

  const result = evaluateCard({ number: clip(body.number, 30), exp: clip(body.exp, 8), cvc: clip(body.cvc, 5) });
  const origin = new URL(req.url).origin;

  // Typos and unsupported cards are form errors, not charge attempts, so they don't use up the customer's tries.
  // (The per-session rate limit above still stops anyone from guessing card numbers.)
  if (!result.ok) return Response.json({ status: "rejected", message: result.message }, { status: 422 });
  const attempts = bumpAttempts(order.id);
  const method = { brand: result.brand, last4: result.last4 };
  if (result.outcome.kind === "succeeded") {
    await deliverWebhook(origin, { type: "payment.succeeded", data: { sessionId, amountMinor: pay.amountMinor, currency: pay.currency, method } });
    return Response.json({ status: "succeeded", redirect: `/order/${order.id}` });
  }
  if (result.outcome.kind === "requires_action") {
    setPending3ds(order.id, method);
    return Response.json({ status: "requires_action", redirect: `/pay/${sessionId}/3ds` });
  }
  // Declined: the customer may try another card until the attempt limit, then the payment fails for good.
  if (attempts >= MAX_PAYMENT_ATTEMPTS) {
    await deliverWebhook(origin, { type: "payment.failed", data: { sessionId, amountMinor: pay.amountMinor, currency: pay.currency, reason: "Too many declined attempts" } });
    return Response.json({ status: "failed", redirect: `/order/${order.id}` });
  }
  return Response.json({ status: "declined", message: result.outcome.message, attemptsLeft: MAX_PAYMENT_ATTEMPTS - attempts }, { status: 402 });
}
