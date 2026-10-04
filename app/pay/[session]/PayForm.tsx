"use client";
import { useEffect, useState } from "react";

const group = (v: string) => v.replace(/\D/g, "").slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ");
const expiry = (v: string) => { const d = v.replace(/\D/g, "").slice(0, 4); return d.length > 2 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d; };

export default function PayForm({ sessionId, amountLabel, initialError, expiresAt }: { sessionId: string; amountLabel: string; initialError: string; expiresAt: number }) {
  const [f, setF] = useState({ number: "", exp: "", cvc: "", name: "" });
  const [err, setErr] = useState(initialError);
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(() => Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)));

  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))), 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  async function post(url: string, body: object) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return { res, data: await res.json().catch(() => ({})) };
  }

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const { data } = await post("/api/gateway/charge", { sessionId, ...f });
      if (data.redirect) { window.location.assign(data.redirect); return; }
      setErr((data.message ?? data.error ?? "Payment failed.") + (typeof data.attemptsLeft === "number" ? ` ${data.attemptsLeft} attempts left.` : ""));
    } catch { setErr("Couldn't reach the payment service. Try again."); }
    setBusy(false);
  }

  async function cancel() {
    setBusy(true);
    const { data } = await post("/api/gateway/cancel", { sessionId });
    window.location.assign(data.redirect ?? "/shop");
  }

  const mm = String(Math.floor(left / 60)).padStart(2, "0"), ss = String(left % 60).padStart(2, "0");
  return (
    <form onSubmit={pay} className="space-y-6" autoComplete="on">
      <label className="micro block text-muted">Card number
        <input inputMode="numeric" autoComplete="cc-number" className="mt-1 font-mono normal-case tracking-wider text-fg" placeholder="4242 4242 4242 4242" value={f.number} onChange={(e) => setF({ ...f, number: group(e.target.value) })} required />
      </label>
      <div className="grid grid-cols-2 gap-6">
        <label className="micro block text-muted">Expiry
          <input inputMode="numeric" autoComplete="cc-exp" className="mt-1 font-mono normal-case tracking-wider text-fg" placeholder="MM / YY" value={f.exp} onChange={(e) => setF({ ...f, exp: expiry(e.target.value) })} required />
        </label>
        <label className="micro block text-muted">Security code
          <input inputMode="numeric" autoComplete="cc-csc" className="mt-1 font-mono normal-case tracking-wider text-fg" placeholder="123" maxLength={4} value={f.cvc} onChange={(e) => setF({ ...f, cvc: e.target.value.replace(/\D/g, "").slice(0, 4) })} required />
        </label>
      </div>
      <label className="micro block text-muted">Name on card
        <input autoComplete="cc-name" className="mt-1 normal-case tracking-normal text-fg" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      </label>
      {err && <p role="alert" className="micro border border-ember p-3 normal-case tracking-normal text-ember">{err}</p>}
      <button className="btn btn-gold w-full" disabled={busy || left === 0}>{busy ? "Processing…" : left === 0 ? "Session expired" : `Pay ${amountLabel}`}</button>
      <div className="micro flex items-center justify-between text-muted">
        <button type="button" onClick={cancel} disabled={busy} className="link-u">Cancel and return to store</button>
        <span aria-live="off">Session expires in {mm}:{ss}</span>
      </div>
    </form>
  );
}
