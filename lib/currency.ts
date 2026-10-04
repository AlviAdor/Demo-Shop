// Prices are stored in whole US dollars. BDT is derived at a configurable rate and locked when checkout starts.
export type Currency = "USD" | "BDT";
export const DEFAULT_RATE = 122; // taka per dollar. Real shops should refresh this daily.
export const isCurrency = (v: unknown): v is Currency => v === "USD" || v === "BDT";

/** Price of ONE unit in the smallest currency unit (cents / poisha). BDT is rounded to whole taka. */
export const unitMinor = (usd: number, c: Currency, rate: number) => (c === "USD" ? Math.round(usd * 100) : Math.round(usd * rate) * 100);

/** Plain US-dollar display, used by the back office which always reports in dollars. */
export const usd = (n: number) => "$" + n.toLocaleString("en-US");

/** Display price for a USD amount. */
export function format(usd: number, c: Currency, rate: number) {
  return c === "USD" ? "$" + usd.toLocaleString("en-US") : "৳" + Math.round(usd * rate).toLocaleString("en-US");
}

/** Display an amount that is already in minor units. */
export function formatMinor(minor: number, c: Currency) {
  const major = minor / 100;
  return c === "USD" ? "$" + major.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "৳" + major.toLocaleString("en-US");
}
