import Link from "next/link";
import Footer from "@/components/Footer";
import { Price } from "@/components/CurrencyProvider";
import { requireRole } from "@/lib/auth";
import { formatMinor } from "@/lib/currency";
import { expireStale, listOrdersForUser } from "@/lib/store";

export const metadata = { title: "My account", robots: { index: false, follow: false } };

const LABEL: Record<string, string> = { pending: "awaiting payment" };
const STYLE: Record<string, string> = { pending: "text-fg", paid: "text-fg", shipped: "text-sky-700", delivered: "text-emerald-700", cancelled: "text-ember" };

export default async function Account() {
  const user = await requireRole(["customer", "staff", "owner"], "/account");
  expireStale();
  const orders = listOrdersForUser(user.id, 50);
  return (
    <div className="pt-32">
      <section className="mx-auto max-w-4xl px-5 md:px-10">
        <p className="micro text-muted">{user.role}</p>
        <h1 className="display text-6xl md:text-8xl">Hi, {user.name.split(" ")[0]}</h1>
        <p className="mt-2 text-muted">{user.email}</p>
        <h2 className="display mb-6 mt-14 text-4xl">Your orders</h2>
        {!orders.length && <p className="text-muted">No orders yet. Open the bag, add a piece, and it will show up here.</p>}
        <div className="space-y-4">
          {orders.map((o) => (
            <article key={o.id} className="border border-line bg-card p-6">
              <div className="flex items-center justify-between"><strong>Order #{o.id}</strong><span className={`text-sm font-semibold uppercase tracking-widest ${STYLE[o.status]}`}>{LABEL[o.status] ?? o.status}</span></div>
              <p className="text-sm text-muted">{new Date(o.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</p>
              <ul className="my-4 space-y-1 text-sm">{o.items.map((i) => <li key={`${i.productId}-${i.size}`} className="flex justify-between"><span>{i.name} · {i.size} × {i.qty}</span><span><Price usd={i.price * i.qty} /></span></li>)}</ul>
              <div className="flex justify-between border-t border-line pt-3"><span>Total</span><strong>{o.payment ? formatMinor(o.payment.amountMinor, o.payment.currency) : <Price usd={o.total} />}</strong></div>
              {o.payment?.method && <p className="micro mt-2 text-muted">Paid with {o.payment.method.brand} ending {o.payment.method.last4}</p>}
              {o.payment?.status === "requires_payment" && <Link href={`/pay/${o.payment.sessionId}`} className="btn btn-gold mt-4">Complete payment</Link>}
            </article>
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}
