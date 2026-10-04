import { randomBytes } from "node:crypto";
import { sign } from "./webhook";
import type { PaymentEvent } from "./types";

// A sandbox gateway. It follows the same flow as a real hosted gateway (session, card page, signed webhook)
// but only ever accepts the published test cards below, so no real card number can be processed or stored.

export type Outcome =
  | { kind: "succeeded" }
  | { kind: "requires_action" }
  | { kind: "declined"; message: string };

type TestCard = { brand: string; outcome: Outcome; label: string };

export const TEST_CARDS: Record<string, TestCard> = {
  "4242424242424242": { brand: "Visa", outcome: { kind: "succeeded" }, label: "Succeeds" },
  "5555555555554444": { brand: "Mastercard", outcome: { kind: "succeeded" }, label: "Succeeds" },
  "4000000000003220": { brand: "Visa", outcome: { kind: "requires_action" }, label: "Asks for 3-D Secure" },
  "4000000000000002": { brand: "Visa", outcome: { kind: "declined", message: "Your card was declined." }, label: "Declined" },
  "4000000000009995": { brand: "Visa", outcome: { kind: "declined", message: "Your card has insufficient funds." }, label: "Insufficient funds" },
  "4000000000000069": { brand: "Visa", outcome: { kind: "declined", message: "Your card has expired." }, label: "Expired card" },
  "4000000000000127": { brand: "Visa", outcome: { kind: "declined", message: "Your card's security code is incorrect." }, label: "Wrong CVC" },
};

export function luhn(pan: string) {
  let sum = 0, alt = false;
  for (let i = pan.length - 1; i >= 0; i--) {
    let n = Number(pan[i]);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n; alt = !alt;
  }
  return sum % 10 === 0;
}

export type CardInput = { number: string; exp: string; cvc: string };
export type ChargeResult =
  | { ok: false; code: "invalid" | "not_test_card"; message: string }
  | { ok: true; brand: string; last4: string; outcome: Outcome };

/** Validates the form like a gateway would, then decides the outcome. The card number is never stored or logged. */
export function evaluateCard(input: CardInput): ChargeResult {
  const pan = input.number.replace(/[\s-]/g, "");
  if (!/^\d{13,19}$/.test(pan) || !luhn(pan)) return { ok: false, code: "invalid", message: "That card number isn't valid." };
  const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(input.exp.trim());
  if (!m) return { ok: false, code: "invalid", message: "Enter the expiry as MM/YY." };
  const month = Number(m[1]), year = 2000 + Number(m[2]);
  const now = new Date();
  if (month < 1 || month > 12 || year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) return { ok: false, code: "invalid", message: "Your card has expired." };
  if (!/^\d{3,4}$/.test(input.cvc.trim())) return { ok: false, code: "invalid", message: "Enter the 3 or 4 digit security code." };
  const card = TEST_CARDS[pan];
  if (!card) return { ok: false, code: "not_test_card", message: "This is a demo gateway: it only accepts the test cards listed on this page." };
  return { ok: true, brand: card.brand, last4: pan.slice(-4), outcome: card.outcome };
}

/** Signs an event and delivers it to the store's webhook endpoint, exactly as a real gateway would. */
export async function deliverWebhook(origin: string, event: Omit<PaymentEvent, "id" | "created">): Promise<boolean> {
  const full: PaymentEvent = { id: "evt_" + randomBytes(12).toString("hex"), created: Math.floor(Date.now() / 1000), ...event };
  const body = JSON.stringify(full);
  try {
    const res = await fetch(`${origin}/api/webhooks/payments`, { method: "POST", headers: { "Content-Type": "application/json", "Alta-Signature": sign(body) }, body, cache: "no-store" });
    return res.ok;
  } catch (e) {
    console.error("webhook delivery failed", e);
    return false;
  }
}
