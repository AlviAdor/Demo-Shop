import type { Currency } from "../currency";

export type PaymentMethodInfo = { brand: string; last4: string };

/** What a gateway tells the store. The store only ever acts on verified, signed events of this shape. */
export type PaymentEvent = {
  id: string;
  type: "payment.succeeded" | "payment.failed" | "payment.canceled";
  created: number; // unix seconds
  data: { sessionId: string; amountMinor: number; currency: Currency; method?: PaymentMethodInfo; reason?: string };
};
