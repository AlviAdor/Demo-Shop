import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { formatMinor, usd } from "@/lib/currency";
import { expireStale, orderById } from "@/lib/store";
import OrderStatus from "./OrderStatus";

export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole(["customer", "staff", "owner"], `/order/${id}`);
  expireStale();
  const order = orderById(Number(id));
  if (!order || order.userId !== user.id) notFound();
  const pay = order.payment;
  const total = pay ? formatMinor(pay.amountMinor, pay.currency) : usd(order.total);
  return (
    <div className="mx-auto max-w-2xl px-5 pb-24 pt-32 md:px-8">
      <OrderStatus orderId={order.id} initial={pay?.status ?? "paid"} />
      <div className="mt-10 border-t border-line">
        {order.items.map((i) => (
          <div key={`${i.productId}-${i.size}`} className="flex justify-between border-b border-line py-3 text-sm"><span>{i.name} <span className="text-muted">· {i.size} × {i.qty}</span></span></div>
        ))}
        <div className="micro flex justify-between py-4"><span>Total</span><span>{total}</span></div>
        {pay?.method && <p className="micro text-muted">Paid with {pay.method.brand} ending {pay.method.last4}</p>}
        <p className="micro mt-1 text-muted">Order #{order.id} · Ship to {order.address}</p>
      </div>
      <div className="mt-10 flex gap-2"><Link href="/account" className="btn btn-gold">My orders</Link><Link href="/shop" className="btn btn-ghost">Keep shopping</Link></div>
    </div>
  );
}
