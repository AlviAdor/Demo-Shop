"use client";
import { useEffect, useState } from "react";
import { useCart } from "@/components/CartProvider";

const COPY: Record<string, { title: string; body: string }> = {
  paid: { title: "Thank you.", body: "Your payment went through and your order is confirmed. We'll email you when it ships." },
  requires_payment: { title: "Confirming…", body: "We're waiting for your bank to confirm the payment." },
  failed: { title: "Payment failed.", body: "Your card wasn't charged and your bag is still saved. You can try again." },
  canceled: { title: "Checkout cancelled.", body: "Nothing was charged and your bag is still saved." },
  expired: { title: "Checkout expired.", body: "The payment window closed before it was completed. Nothing was charged and your bag is still saved." },
  refunded: { title: "Refunded.", body: "This order was cancelled and the payment returned to your card." },
};

export default function OrderStatus({ orderId, initial }: { orderId: number; initial: string }) {
  const [status, setStatus] = useState(initial);
  const { clear } = useCart();

  // The webhook normally lands before this page loads. If it hasn't yet, keep checking for a short while.
  useEffect(() => {
    if (status !== "requires_payment") return;
    let tries = 0;
    const t = setInterval(async () => {
      tries++;
      const res = await fetch(`/api/orders/${orderId}/status`).catch(() => null);
      const data = res && res.ok ? await res.json() : null;
      if (data?.payment && data.payment !== "requires_payment") setStatus(data.payment);
      if (tries >= 20) clearInterval(t);
    }, 1500);
    return () => clearInterval(t);
  }, [status, orderId]);

  // Only a confirmed payment empties the bag, so a failed attempt never loses it.
  useEffect(() => { if (status === "paid") clear(); }, [status, clear]);

  const c = COPY[status] ?? COPY.paid;
  return (
    <div role="status" aria-live="polite">
      <p className="micro text-muted">Order #{orderId}</p>
      <h1 className="display mt-3 text-6xl md:text-8xl">{c.title}</h1>
      <p className="mt-4 max-w-md text-muted">{c.body}</p>
    </div>
  );
}
