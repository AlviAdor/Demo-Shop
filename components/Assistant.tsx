"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import type { AssistantReply } from "@/lib/assistant";
import ProductArt from "./ProductArt";
import { useCart } from "./CartProvider";
import { useMoney } from "./CurrencyProvider";

type Msg = { from: "user" | "bot"; text: string; reply?: AssistantReply; done?: boolean };
type U = { name: string; role: "owner" | "staff" | "customer" } | null;

export default function Assistant({ user }: { user: U }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { money } = useMoney();
  const path = usePathname();
  const { add } = useCart();
  const staff = user?.role === "owner" || user?.role === "staff";

  useEffect(() => { const h = () => setOpen(true); window.addEventListener("alta:assistant", h); return () => window.removeEventListener("alta:assistant", h); }, []);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);
  const greeting: Msg = { from: "bot", done: true, text: `${user ? `Hello ${user.name.split(" ")[0]}` : "Hello"}. I'm the Alta stylist. ${staff ? "Ask me how the store is doing, or what needs restocking." : "Tell me who you're shopping for, the occasion and a budget."}`, reply: { steps: [], text: "", suggestions: staff ? ["How are sales this month?", "What's running low?", "Any orders to fulfil?"] : [`Gift ideas under ${money(150)}`, "Something for work", "Track my order"] } };
  const shown = msgs.length ? msgs : [greeting];

  async function send(message: string) {
    if (!message.trim() || busy) return;
    const lastProducts = [...shown].reverse().find((m) => m.reply?.products)?.reply?.products?.map((p) => p.id);
    setMsgs((m) => [...(m.length ? m : [greeting]), { from: "user", text: message, done: true }]);
    setText(""); setBusy(true);
    try {
      const res = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, lastProducts }) });
      const reply: AssistantReply = await res.json();
      setMsgs((m) => [...m, { from: "bot", text: reply.text, reply }]);
    } catch {
      setMsgs((m) => [...m, { from: "bot", text: "Sorry, I lost connection. Try again?", done: true }]);
    }
    setBusy(false);
  }

  function runAction(a: NonNullable<AssistantReply["actions"]>[number]) {
    if (a.type === "add_to_cart" && a.productId) { const p = shown.flatMap((m) => m.reply?.products ?? []).find((x) => x.id === a.productId); if (p) add(p, p.sizes[0]); }
    if (a.type === "navigate" && a.href) { setOpen(false); router.push(a.href); }
  }

  if (path.startsWith("/pay")) return null; // no chat widget on the hosted payment page
  return (
    <>
      <button aria-label="Open stylist" onClick={() => setOpen((o) => !o)} className="micro fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-[60] min-h-11 bg-fg px-4 py-3 text-bg transition hover:opacity-85 md:bottom-8 md:right-8 md:px-5 md:py-4">{open ? "Close" : <><span className="md:hidden">Stylist</span><span className="hidden md:inline">Ask the stylist</span></>}</button>
      <AnimatePresence>
        {open && (
          <motion.section initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-3 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-[60] flex h-[min(600px,calc(100dvh-8rem))] flex-col border border-fg bg-bg sm:inset-x-auto sm:right-4 sm:w-[24rem] md:bottom-24 md:right-8">
            <header className="micro flex items-center justify-between border-b border-line px-4 py-3"><span>Stylist</span><span className="text-muted">{staff ? "Store insights" : "Personal shopper"} · demo</span></header>
            <div data-lenis-prevent className="flex-1 space-y-4 overflow-y-auto p-4">
              {shown.map((m, i) => <Bubble key={i} m={m} last={i === shown.length - 1} onSuggest={send} onAction={runAction} />)}
              {busy && <div className="flex gap-1">{[0, 1, 2].map((d) => <span key={d} className="dot h-1.5 w-1.5 bg-fg" />)}</div>}
              <div ref={end} />
            </div>
            <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="flex items-center gap-3 border-t border-line px-4">
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask anything…" className="!border-0" />
              <button className="micro" disabled={busy}>Send</button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}

function Typewriter({ text, onDone }: { text: string; onDone: () => void }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (n >= text.length) { onDone(); return; }
    const t = setTimeout(() => setN((x) => Math.min(text.length, x + 2)), 14);
    return () => clearTimeout(t);
  }, [n, text, onDone]);
  return <>{text.slice(0, n)}</>;
}

function Bubble({ m, last, onSuggest, onAction }: { m: Msg; last: boolean; onSuggest: (s: string) => void; onAction: (a: NonNullable<AssistantReply["actions"]>[number]) => void }) {
  const [typed, setTyped] = useState(m.done ?? false);
  const { money } = useMoney();
  if (m.from === "user") return <div className="ml-auto max-w-[85%] bg-fg px-3 py-2 text-bg">{m.text}</div>;
  const r = m.reply;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-[94%] space-y-3">
      {!!r?.steps.length && (
        <ul className="micro space-y-1 border-l border-line pl-3 normal-case tracking-normal text-muted">
          {r.steps.map((s, i) => <motion.li key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.18 }}>{s}</motion.li>)}
        </ul>
      )}
      {m.text && <p className="text-[13px] leading-relaxed">{typed ? m.text : <Typewriter text={m.text} onDone={() => setTyped(true)} />}</p>}
      {typed && r?.products && (
        <div className="space-y-1">
          {r.products.map((p) => (
            <motion.a key={p.id} href={`/product/${p.slug}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 border border-line p-2 transition hover:border-fg">
              <div className="w-12 shrink-0"><div className="relative aspect-[4/5] overflow-hidden"><ProductArt p={p} sizes="48px" /></div></div><div className="flex-1"><p className="micro">{p.name}</p><p className="text-muted">{p.colour}</p></div><span className="micro">{money(p.price)}</span>
            </motion.a>))}
        </div>
      )}
      {typed && r?.actions && <div className="flex flex-wrap gap-1">{r.actions.map((a, i) => <button key={i} onClick={() => onAction(a)} className="btn btn-gold !px-4 !py-2">{a.label}</button>)}</div>}
      {typed && last && r?.suggestions && <div className="flex flex-wrap gap-1">{r.suggestions.map((s) => <button key={s} onClick={() => onSuggest(s)} className="micro border border-line px-3 py-2 normal-case tracking-normal text-muted transition hover:border-fg hover:text-fg">{s}</button>)}</div>}
    </motion.div>
  );
}
