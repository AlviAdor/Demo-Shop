"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import type { ProductCard } from "@/lib/types";
import { useMoney } from "./CurrencyProvider";
import ProductArt from "./ProductArt";

type Line = { id: string; size: string; qty: number };
type Ctx = { lines: Line[]; count: number; total: number; add: (p: ProductCard, size: string) => void; clear: () => void; open: () => void; isOpen: boolean };
const CartCtx = createContext<Ctx | null>(null);
export const useCart = () => {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
};
const same = (a: Line, id: string, size: string) => a.id === id && a.size === size;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [info, setInfo] = useState<Record<string, ProductCard>>({}); // details for the products in the bag
  const [isOpen, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // localStorage only exists in the browser, so the saved bag is read after mount.
    queueMicrotask(() => {
      try {
        const raw: unknown = JSON.parse(localStorage.getItem("alta_cart") ?? "[]");
        if (Array.isArray(raw)) setLines(raw.filter((l): l is Line => !!l && typeof l.id === "string" && typeof l.size === "string" && Number.isInteger(l.qty) && l.qty > 0).map((l) => ({ id: l.id, size: l.size, qty: Math.min(l.qty, 10) })));
      } catch {}
      setReady(true);
    });
  }, []);
  useEffect(() => { if (ready) try { localStorage.setItem("alta_cart", JSON.stringify(lines)); } catch {} }, [lines, ready]);

  // The browser only ever asks the server for the products that are actually in the bag. It refreshes when the bag opens,
  // so prices and stock are current, and anything discontinued or with a removed size drops out.
  const idsKey = [...new Set(lines.map((l) => l.id))].sort().join(",");
  useEffect(() => {
    if (!ready || !idsKey || (!isOpen && Object.keys(info).length)) return;
    const ac = new AbortController();
    fetch(`/api/products?ids=${idsKey}`, { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { products: ProductCard[] } | null) => {
        if (!d) return;
        const fresh = Object.fromEntries(d.products.map((p) => [p.id, p]));
        setInfo((prev) => ({ ...prev, ...fresh }));
        setLines((l) => { const kept = l.filter((x) => fresh[x.id]?.sizes.includes(x.size)); return kept.length === l.length ? l : kept; });
      })
      .catch(() => {});
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, idsKey, isOpen]);

  const add = useCallback((p: ProductCard, size: string) => {
    setInfo((prev) => ({ ...prev, [p.id]: p }));
    setLines((l) => (l.find((x) => same(x, p.id, size)) ? l.map((x) => (same(x, p.id, size) ? { ...x, qty: Math.min(x.qty + 1, 10) } : x)) : [...l, { id: p.id, size, qty: 1 }]));
    setOpen(true);
  }, []);
  // Also wipes the saved copy: on a fresh page load this can run before the saved bag has been read back in,
  // and without this the old contents would reappear.
  const clear = useCallback(() => {
    try { localStorage.removeItem("alta_cart"); } catch {}
    setLines((l) => (l.length ? [] : l));
  }, []);
  const value = useMemo<Ctx>(() => ({
    lines, isOpen, add, clear, open: () => setOpen(true),
    count: lines.reduce((s, l) => s + l.qty, 0),
    total: lines.reduce((s, l) => s + (info[l.id]?.price ?? 0) * l.qty, 0),
  }), [lines, isOpen, add, clear, info]);

  return (
    <CartCtx.Provider value={value}>
      {children}
      <Drawer lines={lines} info={info} setLines={setLines} open={isOpen} onClose={() => setOpen(false)} total={value.total} />
    </CartCtx.Provider>
  );
}

function Drawer({ lines, info, setLines, open, onClose, total }: { lines: Line[]; info: Record<string, ProductCard>; setLines: React.Dispatch<React.SetStateAction<Line[]>>; open: boolean; onClose: () => void; total: number }) {
  const router = useRouter();
  const { currency, money } = useMoney();
  const [step, setStep] = useState<"bag" | "ship">("bag");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const setQty = (l: Line, qty: number) => setLines((all) => (qty <= 0 ? all.filter((x) => !same(x, l.id, l.size)) : all.map((x) => (same(x, l.id, l.size) ? { ...x, qty: Math.min(qty, 10) } : x))));
  const loaded = lines.every((l) => info[l.id]);

  // Creates the order and a payment session on the server, then hands over to the hosted payment page.
  async function checkout(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: lines.map((l) => ({ productId: l.id, qty: l.qty, size: l.size })), address, currency }) });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) { onClose(); router.push("/login?next=/"); return; }
      if (!res.ok) { setErr(data.error ?? "Checkout failed."); setBusy(false); return; }
      window.location.assign(data.redirectUrl); // the bag is only emptied after the payment is confirmed
    } catch {
      setErr("Couldn't reach the server. Try again."); setBusy(false);
    }
  }
  const close = () => { onClose(); setTimeout(() => { setStep("bag"); setErr(""); }, 400); };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="bg" className="fixed inset-0 z-[70] bg-black/35" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} />
          <motion.aside key="panel" data-lenis-prevent className="fixed right-0 top-0 z-[71] flex h-dvh w-full max-w-[440px] flex-col bg-bg p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] md:p-7"
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ duration: 0.55, ease: [0.76, 0, 0.24, 1] }}>
            <div className="micro mb-8 flex items-center justify-between"><span>{step === "ship" ? "Shipping" : `Bag (${lines.reduce((s, l) => s + l.qty, 0)})`}</span><button onClick={close} className="tap">Close ×</button></div>

            {step === "bag" && (lines.length === 0 ? (
              <div className="flex flex-1 flex-col justify-center"><p className="display text-5xl">Your bag is empty</p><p className="mt-3 max-w-xs text-muted">Pick a piece, or ask the stylist what suits you.</p></div>
            ) : (
              <>
                <ul className="-mr-2 flex-1 divide-y divide-line overflow-y-auto pr-2">
                  {lines.map((l) => { const p = info[l.id]; if (!p) return <li key={l.id + l.size} className="micro py-6 text-muted">Loading…</li>; const short = (p.sizeStock[l.size] ?? 0) < l.qty; return (
                    <motion.li layout key={l.id + l.size} className="flex gap-4 py-4">
                      <div className="w-24 shrink-0"><div className="relative aspect-[4/5] overflow-hidden"><ProductArt p={p} sizes="96px" /></div></div>
                      <div className="flex flex-1 flex-col justify-between"><div><p className="micro">{p.name}</p><p className="mt-1 text-muted">{p.colour} · Size {l.size}</p>{short && <p className="micro mt-1 text-ember">{(p.sizeStock[l.size] ?? 0) === 0 ? "Sold out in this size" : `Only ${p.sizeStock[l.size]} left`}</p>}</div>
                        <div className="micro flex items-center"><button className="grid h-10 w-10 place-items-center border border-line" onClick={() => setQty(l, l.qty - 1)} aria-label="One less">−</button><span className="w-9 text-center">{l.qty}</span><button className="grid h-10 w-10 place-items-center border border-line" onClick={() => setQty(l, l.qty + 1)} aria-label="One more">+</button><button className="tap ml-auto link-u text-muted" onClick={() => setQty(l, 0)}>Remove</button></div></div>
                      <p className="micro">{money(p.price * l.qty)}</p>
                    </motion.li>); })}
                </ul>
                <div className="border-t border-line pt-4"><div className="micro mb-4 flex justify-between"><span>Total</span><span>{loaded ? money(total) : "…"}</span></div><button className="btn btn-gold w-full" disabled={!loaded} onClick={() => setStep("ship")}>Continue</button><p className="micro mt-3 text-muted">Shipping and taxes are shown at payment. Prices in {currency}.</p></div>
              </>
            ))}

            {step === "ship" && (
              <form onSubmit={checkout} className="flex flex-1 flex-col gap-6">
                <label className="micro text-muted">Shipping address<textarea className="mt-1 normal-case tracking-normal text-fg" rows={3} value={address} onChange={(e) => setAddress(e.target.value)} required placeholder="12 Example Street, Sampletown" /></label>
                {err && <p className="micro border border-ember p-3 text-ember">{err}</p>}
                <p className="micro text-muted">You&apos;ll enter your card on the next, secure payment page.</p>
                <div className="mt-auto space-y-3"><div className="micro flex justify-between"><span>Total</span><span>{money(total)}</span></div>
                  <button className="btn btn-gold w-full" disabled={busy}>{busy ? "Preparing payment…" : "Continue to payment"}</button>
                  <button type="button" className="micro tap w-full justify-center text-muted" onClick={() => setStep("bag")}>← Back to bag</button></div>
              </form>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
