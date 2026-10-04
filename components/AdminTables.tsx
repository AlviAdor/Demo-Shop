"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

async function patch(url: string, body: unknown) {
  const res = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return res.ok ? null : (((await res.json().catch(() => ({}))).error as string) ?? "Request failed");
}

export function StatusSelect({ id, status, options }: { id: number; status: string; options: string[] }) {
  const router = useRouter();
  const [v, setV] = useState(status);
  return (
    <select value={v} aria-label={`Status of order ${id}`} className="!w-auto !px-3 !py-2.5 text-sm capitalize" onChange={async (e) => { setV(e.target.value); const err = await patch(`/api/admin/orders/${id}`, { status: e.target.value }); if (err) { alert(err); setV(status); } router.refresh(); }}>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

export function RoleSelect({ id, role }: { id: string; role: string }) {
  const router = useRouter();
  const [v, setV] = useState(role);
  return (
    <select value={v} aria-label="Role" className="!w-auto !px-3 !py-2.5 text-sm capitalize" onChange={async (e) => { setV(e.target.value); const err = await patch(`/api/admin/users/${id}`, { role: e.target.value }); if (err) { alert(err); setV(role); } else router.refresh(); }}>
      <option value="customer">customer</option><option value="staff">staff</option>
    </select>
  );
}

/** Stock for one size. Saves when you click away or press Enter. */
export function SizeStock({ productId, size, stock }: { productId: string; size: string; stock: number }) {
  const router = useRouter();
  const [v, setV] = useState(String(stock));
  const [state, setState] = useState<"idle" | "saved" | "error">("idle");
  async function save() {
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0 || n === stock) { setV(String(stock)); return; }
    const err = await patch(`/api/admin/products/${productId}`, { size, stock: n });
    setState(err ? "error" : "saved");
    if (err) { alert(err); setV(String(stock)); } else router.refresh();
    setTimeout(() => setState("idle"), 1500);
  }
  const low = Number(v) <= 2;
  return (
    <label className="block text-center">
      <span className="micro block text-muted">{size}</span>
      <input type="number" min={0} inputMode="numeric" value={v} aria-label={`Stock for size ${size}`} onChange={(e) => setV(e.target.value)} onBlur={save}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className={`!w-16 !px-1 !py-2.5 text-center ${state === "saved" ? "!border-emerald-700" : low ? "!border-ember" : ""}`} />
    </label>
  );
}

/** Owner-only product settings: price, category and whether the product is shown in the shop. */
export function ProductControls({ id, price, active, categoryId, categories, canEdit }: { id: string; price: number; active: boolean; categoryId: string; categories: { id: string; name: string }[]; canEdit: boolean }) {
  const router = useRouter();
  const [p, setP] = useState(String(price));
  async function apply(body: object) {
    const err = await patch(`/api/admin/products/${id}`, body);
    if (err) alert(err);
    router.refresh();
  }
  if (!canEdit) return <span className="micro text-muted">Owner only</span>;
  return (
    <div className="flex flex-wrap items-end gap-4">
      <label className="micro text-muted">Price (USD)
        <input type="number" min={1} value={p} onChange={(e) => setP(e.target.value)} onBlur={() => Number(p) !== price && apply({ price: Number(p) })} className="mt-1 !w-24 !py-2.5" />
      </label>
      <label className="micro text-muted">Category
        <select value={categoryId} onChange={(e) => apply({ categoryId: e.target.value })} className="mt-1 !w-36 !py-2.5">{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      </label>
      <label className="micro flex items-center gap-2"><input type="checkbox" checked={active} onChange={(e) => apply({ active: e.target.checked })} className="!w-auto" /> Visible in shop</label>
    </div>
  );
}
