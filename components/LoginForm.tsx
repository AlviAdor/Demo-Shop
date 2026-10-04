"use client";
import { useState } from "react";


const DEMOS = [
  { label: "Owner", email: "owner@alta.test", password: "owner123" },
  { label: "Staff", email: "staff@alta.test", password: "staff123" },
  { label: "Customer", email: "customer@alta.test", password: "customer123" },
];

export default function LoginForm({ next }: { next?: string }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, mode }) });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? "Something went wrong."); return; }
      const role = data.user.role as string;
      const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
      // Full navigation so the new session cookie is guaranteed to be sent with the next request.
      window.location.assign(safe ?? (role === "owner" ? "/admin" : role === "staff" ? "/admin/orders" : "/"));
    } catch {
      setErr("Couldn't reach the server. Is it running?");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="display text-6xl">{mode === "login" ? "Log in" : "Create account"}</h1>
      <form onSubmit={submit} className="mt-10 space-y-6">
        {mode === "register" && <input placeholder="Full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />}
        <input type="email" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
        <input type="password" placeholder="Password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
        {err && <p className="micro border border-ember p-3 text-ember">{err}</p>}
        <button className="btn btn-gold w-full" disabled={busy}>{busy ? "One moment…" : mode === "login" ? "Log in" : "Create account"}</button>
      </form>
      <button className="micro link-u tap mt-4 text-muted" onClick={() => { setMode(mode === "login" ? "register" : "login"); setErr(""); }}>{mode === "login" ? "Create an account" : "I already have an account"}</button>
      <div className="mt-12 border-t border-line pt-5">
        <p className="micro mb-3 text-muted">Demo accounts, tap to fill</p>
        <div className="flex gap-1">{DEMOS.map((d) => <button key={d.label} type="button" className="btn btn-ghost !px-4 !py-3" onClick={() => { setMode("login"); setF({ name: "", email: d.email, password: d.password }); }}>{d.label}</button>)}</div>
      </div>
    </div>
  );
}
