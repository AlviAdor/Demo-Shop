import { cookies } from "next/headers";
import { DEFAULT_RATE, isCurrency, type Currency } from "./currency";

export const COOKIE = "alta_currency";
export const getRate = () => Number(process.env.BDT_PER_USD) || DEFAULT_RATE;
export async function getCurrency(): Promise<Currency> {
  const v = (await cookies()).get(COOKIE)?.value;
  return isCurrency(v) ? v : "USD";
}
