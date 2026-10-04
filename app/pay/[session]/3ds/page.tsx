import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { expireStale, orderBySession } from "@/lib/store";
import ThreeDS from "./ThreeDS";

export const metadata: Metadata = { title: "Verify payment", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ThreeDSPage({ params }: { params: Promise<{ session: string }> }) {
  const { session } = await params;
  expireStale();
  const order = orderBySession(session);
  const user = await getUser();
  if (!order?.payment) notFound();
  if (!user || order.userId !== user.id) notFound();
  if (order.payment.status !== "requires_payment") redirect(`/order/${order.id}`);
  if (!order.payment.pending3ds) redirect(`/pay/${session}`);
  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-5">
      <div className="w-full max-w-md">
        <p className="micro text-muted">Demo bank · 3-D Secure</p>
        <h1 className="display mt-3 text-5xl">Verify it&apos;s you</h1>
        <p className="mt-4 text-muted">Your bank needs to confirm this payment. In a live gateway this is where you would enter a code sent to your phone or approve in your banking app.</p>
        <ThreeDS sessionId={session} />
      </div>
    </div>
  );
}
