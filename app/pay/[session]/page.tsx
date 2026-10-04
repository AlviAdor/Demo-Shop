import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { formatMinor } from "@/lib/currency";
import { TEST_CARDS } from "@/lib/payments/demo-gateway";
import { expireStale, orderBySession } from "@/lib/store";
import PayForm from "./PayForm";

export const metadata: Metadata = { title: "Secure payment", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PayPage({ params, searchParams }: { params: Promise<{ session: string }>; searchParams: Promise<{ error?: string }> }) {
  const { session } = await params;
  const { error } = await searchParams;
  expireStale();
  const order = orderBySession(session);
  const pay = order?.payment;
  const user = await getUser();
  if (!order || !pay) notFound();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/pay/${session}`)}`);
  if (order.userId !== user.id) notFound(); // another customer's payment session looks like it doesn't exist
  if (pay.status !== "requires_payment") redirect(`/order/${order.id}`);

  const cards = Object.entries(TEST_CARDS).map(([n, c]) => ({ number: n.replace(/(\d{4})(?=\d)/g, "$1 "), brand: c.brand, label: c.label }));
  return (
    <div className="min-h-dvh bg-bg px-5 py-10 md:px-8">
      <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-5">
        <section className="md:col-span-2">
          <p className="display text-3xl tracking-[0.18em]">ALTA</p>
          <p className="micro mt-10 text-muted">Pay ALTA</p>
          <p className="display mt-2 text-6xl">{formatMinor(pay.amountMinor, pay.currency)}</p>
          <ul className="mt-8 divide-y divide-line border-y border-line text-sm">
            {order.items.map((i) => (
              <li key={`${i.productId}-${i.size}`} className="flex justify-between gap-4 py-3"><span>{i.name} <span className="text-muted">· {i.size} × {i.qty}</span></span></li>
            ))}
          </ul>
          <p className="micro mt-4 text-muted">Order #{order.id} · Prices in {pay.currency}</p>
        </section>
        <section className="md:col-span-3">
          <div className="mb-6 border border-line bg-card p-4 text-sm">
            <p className="micro">Demo payment gateway · test mode</p>
            <p className="mt-1 text-muted">No real money moves and real card numbers are refused. Use one of these test cards with any future expiry and any 3 digit code.</p>
          </div>
          <PayForm sessionId={session} amountLabel={formatMinor(pay.amountMinor, pay.currency)} initialError={error === "authentication" ? "Authentication failed. Try again or use another card." : ""} expiresAt={pay.expiresAt} />
          <details className="mt-8 text-sm">
            <summary className="micro cursor-pointer">Test cards</summary>
            <table className="mt-3 w-full text-left"><tbody>{cards.map((c) => <tr key={c.number} className="border-t border-line"><td className="py-2 font-mono">{c.number}</td><td className="text-muted">{c.brand}</td><td>{c.label}</td></tr>)}</tbody></table>
          </details>
        </section>
      </div>
    </div>
  );
}
