import { createHmac, timingSafeEqual } from "node:crypto";
import { tx } from "../db";
import { eventSeen, expireStale, markPaid, markUnpaid, orderBySession, recordEvent } from "../store";
import type { PaymentEvent } from "./types";

const TOLERANCE_SECONDS = 300;

function secret() {
  const s = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!s && process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
    throw new Error("PAYMENT_WEBHOOK_SECRET must be set in production.");
  }
  return s ?? "dev-only-webhook-secret-change-me-0123456789";
}

const mac = (t: string, body: string) => createHmac("sha256", secret()).update(`${t}.${body}`).digest("hex");

/** Header format: `t=<unix seconds>,v1=<hex hmac of "t.body">`, the same scheme the big gateways use. */
export function sign(body: string, t = Math.floor(Date.now() / 1000)) {
  return `t=${t},v1=${mac(String(t), body)}`;
}

export function verify(body: string, header: string | null): { ok: true } | { ok: false; reason: string } {
  if (!header) return { ok: false, reason: "missing signature" };
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.trim().split("=") as [string, string]));
  const t = parts.t, v1 = parts.v1;
  if (!t || !v1 || !/^\d+$/.test(t) || !/^[0-9a-f]{64}$/.test(v1)) return { ok: false, reason: "malformed signature" };
  if (Math.abs(Date.now() / 1000 - Number(t)) > TOLERANCE_SECONDS) return { ok: false, reason: "timestamp outside tolerance" }; // blocks replays of old events
  const a = Buffer.from(v1, "hex"), b = Buffer.from(mac(t, body), "hex");
  return a.length === b.length && timingSafeEqual(a, b) ? { ok: true } : { ok: false, reason: "bad signature" };
}

/**
 * Applies a verified event to the order, all inside one database transaction.
 * Idempotent: replaying the same event id changes nothing, and the charged amount must match what the store asked for.
 */
export function applyEvent(evt: PaymentEvent): { status: number; message: string } {
  expireStale(true);
  return tx(() => {
    const order = orderBySession(evt.data.sessionId);
    if (!order?.payment) return { status: 404, message: "unknown session" };
    const pay = order.payment;
    if (eventSeen(evt.id)) return { status: 200, message: "already processed" };
    if (evt.data.amountMinor !== pay.amountMinor || evt.data.currency !== pay.currency) {
      console.error(`payment amount mismatch on order ${order.id}: expected ${pay.amountMinor} ${pay.currency}, got ${evt.data.amountMinor} ${evt.data.currency}`);
      return { status: 400, message: "amount mismatch" };
    }
    if (pay.status !== "requires_payment") return { status: 200, message: `ignored, payment already ${pay.status}` };
    recordEvent(evt.id, order.id);
    if (evt.type === "payment.succeeded") {
      if (!evt.data.method) return { status: 400, message: "missing method" };
      markPaid(order.id, evt.data.method);
    } else {
      markUnpaid(order.id, evt.type === "payment.canceled" ? "canceled" : "failed", evt.data.reason ?? "Payment was not completed");
    }
    return { status: 200, message: "ok" };
  });
}
