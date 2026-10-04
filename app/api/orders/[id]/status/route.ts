import { getUser } from "@/lib/auth";
import { expireStale, orderById } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });
  expireStale(true);
  const order = orderById(Number((await ctx.params).id));
  if (!order || (order.userId !== user.id && user.role === "customer")) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ status: order.status, payment: order.payment?.status ?? null });
}
