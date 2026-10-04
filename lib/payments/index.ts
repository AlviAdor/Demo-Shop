// Payment provider selection. "demo" is the built-in sandbox gateway.
// To go live, add an adapter (for example Stripe Checkout or SSLCommerz) that creates a hosted session for an order
// and posts verified events to applyEvent() in ./webhook. Nothing else in the store has to change.
export const PROVIDER = process.env.PAYMENT_PROVIDER ?? "demo";

/**
 * A production deployment refuses to take "payments" through the sandbox unless that was chosen explicitly,
 * so a live store can't accidentally accept fake cards.
 */
export function paymentsEnabled(): { ok: true } | { ok: false; reason: string } {
  if (PROVIDER === "demo" && process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_PAYMENTS !== "1") {
    return { ok: false, reason: "Online payments are not enabled on this store yet." };
  }
  if (PROVIDER !== "demo") return { ok: false, reason: `Payment provider "${PROVIDER}" has no adapter installed.` };
  return { ok: true };
}
