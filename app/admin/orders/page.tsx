import Link from "next/link";
import { StatusSelect } from "@/components/AdminTables";
import { formatMinor, usd } from "@/lib/currency";
import { STATUSES, expireStale, listOrders, type Status } from "@/lib/store";

const PAGE = 25;

export default async function Orders({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as Status) ? (sp.status as Status) : undefined;
  const page = Math.max(1, Math.floor(Number(sp.page)) || 1);
  expireStale();
  const { rows, total } = listOrders({ status, limit: PAGE, offset: (page - 1) * PAGE });
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const href = (p: number) => `/admin/orders?${new URLSearchParams({ ...(status ? { status } : {}), page: String(p) })}`;
  return (
    <div className="space-y-6">
      <h1 className="display text-6xl md:text-8xl">Orders</h1>
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/orders" className={`border px-4 py-2.5 text-sm ${!status ? "border-fg bg-fg text-bg" : "border-line"}`}>All</Link>
        {STATUSES.map((s) => <Link key={s} href={`/admin/orders?status=${s}`} className={`border px-4 py-2.5 text-sm capitalize ${status === s ? "border-fg bg-fg text-bg" : "border-line hover:border-fg"}`}>{s}</Link>)}
      </div>
      <ul className="space-y-3 md:hidden">
        {rows.map((o) => (
          <li key={o.id} className="border border-line bg-card p-4 text-sm">
            <div className="flex items-start justify-between gap-3"><div><p className="font-medium">#{o.id} · {o.userName}</p><p className="text-xs text-muted">{o.userEmail}</p></div><p className="text-right"><span className="block font-medium">{usd(o.total)}</span><span className="text-xs text-muted">{new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span></p></div>
            <p className="mt-3 text-muted">{o.items.map((i) => `${i.name} (${i.size}) ×${i.qty}`).join(", ")}</p>
            <p className="mt-2 text-xs text-muted">{o.payment ? `${o.payment.status.replace("_", " ")} · ${formatMinor(o.payment.amountMinor, o.payment.currency)}${o.payment.method ? ` · ${o.payment.method.brand} ${o.payment.method.last4}` : ""}` : "no payment"}</p>
            <div className="mt-3"><StatusSelect id={o.id} status={o.status} options={STATUSES} /></div>
          </li>
        ))}
        {!rows.length && <li className="border border-line bg-card p-6 text-muted">No orders.</li>}
      </ul>
      <div className="hidden overflow-x-auto border border-line bg-card p-4 md:block">
        <table className="w-full text-left text-sm"><thead className="text-xs uppercase tracking-widest text-muted"><tr><th className="p-3">#</th><th>Customer</th><th>Items</th><th>Date</th><th className="text-right">Total</th><th className="pl-6">Payment</th><th className="pl-6">Status</th></tr></thead>
          <tbody>{rows.map((o) => (
            <tr key={o.id} className="border-t border-line"><td className="p-3">{o.id}</td><td>{o.userName}<br /><span className="text-xs text-muted">{o.userEmail}</span></td>
              <td className="max-w-xs text-muted">{o.items.map((i) => `${i.name} (${i.size}) ×${i.qty}`).join(", ")}</td>
              <td className="text-muted">{new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td><td className="text-right">{usd(o.total)}</td>
              <td className="pl-6 text-xs">{o.payment ? <>{o.payment.status.replace("_", " ")}<br /><span className="text-muted">{formatMinor(o.payment.amountMinor, o.payment.currency)}{o.payment.method ? ` · ${o.payment.method.brand} ${o.payment.method.last4}` : ""}</span></> : <span className="text-muted">none</span>}</td>
              <td className="pl-6"><StatusSelect id={o.id} status={o.status} options={STATUSES} /></td></tr>))}
            {!rows.length && <tr><td colSpan={7} className="p-6 text-muted">No orders.</td></tr>}</tbody></table>
      </div>
      <nav aria-label="Pages" className="micro flex items-center justify-between">
        <span className="text-muted">{total} order{total === 1 ? "" : "s"} · page {Math.min(page, pages)} of {pages}</span>
        <span className="flex gap-6">{page > 1 && <Link href={href(page - 1)} className="link-u tap">← Newer</Link>}{page < pages && <Link href={href(page + 1)} className="link-u tap">Older →</Link>}</span>
      </nav>
    </div>
  );
}
