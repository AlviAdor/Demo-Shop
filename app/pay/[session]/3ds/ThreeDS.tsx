"use client";
import { useState } from "react";

export default function ThreeDS({ sessionId }: { sessionId: string }) {
  const [busy, setBusy] = useState(false);
  async function answer(approve: boolean) {
    setBusy(true);
    const res = await fetch("/api/gateway/3ds", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, approve }) });
    const data = await res.json().catch(() => ({}));
    window.location.assign(data.redirect ?? `/pay/${sessionId}`);
  }
  return (
    <div className="mt-8 flex flex-col gap-2">
      <button className="btn btn-gold" disabled={busy} onClick={() => answer(true)}>Approve payment</button>
      <button className="btn btn-ghost" disabled={busy} onClick={() => answer(false)}>Fail authentication</button>
    </div>
  );
}
