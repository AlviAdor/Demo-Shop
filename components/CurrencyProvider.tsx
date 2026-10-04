"use client";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, type Currency } from "@/lib/currency";

type Ctx = { currency: Currency; rate: number; money: (usd: number) => string; setCurrency: (c: Currency) => void };
const CurrencyCtx = createContext<Ctx | null>(null);

export function CurrencyProvider({ initial, rate, children }: { initial: Currency; rate: number; children: React.ReactNode }) {
  const router = useRouter();
  const [currency, set] = useState<Currency>(initial);
  const setCurrency = useCallback((c: Currency) => {
    set(c);
    document.cookie = `alta_currency=${c}; path=/; max-age=31536000; samesite=lax`;
    router.refresh(); // re-render server components (and assistant answers) in the new currency
  }, [router]);
  const value = useMemo<Ctx>(() => ({ currency, rate, setCurrency, money: (usd) => format(usd, currency, rate) }), [currency, rate, setCurrency]);
  return <CurrencyCtx.Provider value={value}>{children}</CurrencyCtx.Provider>;
}

export const useMoney = () => {
  const c = useContext(CurrencyCtx);
  if (!c) throw new Error("useMoney outside CurrencyProvider");
  return c;
};

/** Renders a USD catalogue price in the visitor's chosen currency. Works inside server components. */
export function Price({ usd }: { usd: number }) {
  return <>{useMoney().money(usd)}</>;
}
