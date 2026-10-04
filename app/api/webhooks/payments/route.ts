import { applyEvent, verify } from "@/lib/payments/webhook";
import type { PaymentEvent } from "@/lib/payments/types";

export const dynamic = "force-dynamic";

// Called by the payment gateway, not by browsers: there is no cookie or Origin to check.
// Trust comes only from the HMAC signature over the raw request body.
export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > 10_000) return Response.json({ error: "payload too large" }, { status: 413 });
  const check = verify(raw, req.headers.get("alta-signature"));
  if (!check.ok) {
    console.warn("rejected payment webhook:", check.reason);
    return Response.json({ error: "invalid signature" }, { status: 401 });
  }
  let evt: PaymentEvent;
  try { evt = JSON.parse(raw); } catch { return Response.json({ error: "invalid json" }, { status: 400 }); }
  const d = evt?.data;
  if (typeof evt?.id !== "string" || !["payment.succeeded", "payment.failed", "payment.canceled"].includes(evt.type) || typeof d?.sessionId !== "string" || !Number.isInteger(d.amountMinor) || (d.currency !== "USD" && d.currency !== "BDT")) {
    return Response.json({ error: "invalid event" }, { status: 400 });
  }
  const result = applyEvent(evt);
  return Response.json({ received: result.status === 200, message: result.message }, { status: result.status });
}
