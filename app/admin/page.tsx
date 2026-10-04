import { redirect } from "next/navigation";
import Link from "next/link";
import Counter from "@/components/Counter";
import { AreaChart, Donut } from "@/components/Charts";
import { Reveal } from "@/components/Reveal";
import ProductArt from "@/components/ProductArt";
import { getUser } from "@/lib/auth";
import { usd } from "@/lib/currency";
import { listOrders, stats } from "@/lib/store";

const pct = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : 0);

function Kpi({ label, to, prefix, delta, note, i }: { label: string; to: number; prefix?: string; delta?: number; note?: string; i: number }) {
  return (
    <Reveal delay={i * 0.07} className=" border border-line bg-card p-6">
      <p className="text-sm text-muted">{label}</p>
      <Counter to={to} prefix={prefix} className="display mt-2 block text-5xl" />
      {delta !== undefined ? <p className={`mt-2 text-sm ${delta >= 0 ? "text-emerald-700" : "text-ember"}`}>{delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}% vs prior 30 days</p> : <p className="mt-2 text-sm text-muted">{note}</p>}
    </Reveal>
  );
}

export default async function Overview() {
  const user = await getUser();
  if (user?.role === "staff") redirect("/admin/orders");
  const s = stats(30);
  const recent = listOrders({ limit: 6 }).rows;
  return (
    <div className="space-y-6">
      <Reveal><h1 className="display text-6xl md:text-8xl">Overview</h1><p className="mt-2 text-muted">The last 30 days, live from your orders.</p></Reveal>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi i={0} label="Revenue" to={s.revenue} prefix="$" delta={pct(s.revenue, s.prevRevenue)} />
        <Kpi i={1} label="Orders" to={s.orders} delta={pct(s.orders, s.prevOrders)} />
        <Kpi i={2} label="Avg. order value" to={s.aov} prefix="$" note="per completed order" />
        <Kpi i={3} label="Customers" to={s.customers} note={`+${s.newCustomers} this month`} />
        <Kpi i={4} label="To fulfil" to={s.toFulfil} note="pending or paid" />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Reveal className=" border border-line bg-card p-6 xl:col-span-2"><h2 className="mb-4 text-lg font-semibold">Revenue, last 30 days</h2><AreaChart data={s.daily} /></Reveal>
        <Reveal delay={0.1} className=" border border-line bg-card p-6"><h2 className="mb-4 text-lg font-semibold">Sales by category</h2><Donut data={s.categories} /></Reveal>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Reveal className=" border border-line bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Top products</h2>
          {!s.top.length && <p className="text-muted">No sales in the last 30 days yet. Your best sellers will appear here.</p>}
          <ul className="space-y-3">{s.top.slice(0, 5).map((t) => (
            <li key={t.product.id} className="flex items-center gap-3"><span className="relative block h-12 w-12 shrink-0 overflow-hidden"><ProductArt p={t.product} sizes="48px" /></span><span className="flex-1">{t.product.name}</span><span className="text-sm text-muted">{t.qty} sold</span><strong className="w-20 text-right">{usd(t.revenue)}</strong></li>))}</ul>
        </Reveal>
        <Reveal delay={0.1} className=" border border-line bg-card p-6">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">Low stock</h2><Link href="/admin/inventory" className="tap text-sm text-fg">Manage →</Link></div>
          <ul className="space-y-3">{s.low.map((l) => <li key={l.product.id} className="flex items-center justify-between"><span>{l.product.name}</span><span className={` px-3 py-1 text-xs font-bold ${l.stock <= 3 ? "bg-ember text-bg" : "bg-gold text-bg"}`}>{l.stock} left</span></li>)}{!s.low.length && <li className="text-muted">All stocked up.</li>}</ul>
        </Reveal>
      </div>
      <Reveal className=" border border-line bg-card p-6">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">Recent orders</h2><Link href="/admin/orders" className="tap text-sm text-fg">View all →</Link></div>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs uppercase tracking-widest text-muted"><tr><th className="py-2">#</th><th>Customer</th><th>Items</th><th>Status</th><th className="text-right">Total</th></tr></thead>
          <tbody>{recent.map((o) => <tr key={o.id} className="border-t border-line"><td className="py-3">{o.id}</td><td>{o.userName}</td><td className="text-muted">{o.items.map((i) => i.name).join(", ")}</td><td className="capitalize">{o.status}</td><td className="text-right">{usd(o.total)}</td></tr>)}</tbody></table></div>
      </Reveal>
    </div>
  );
}
