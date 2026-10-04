import { getUser } from "@/lib/auth";
import { forbidden, sameOrigin } from "@/lib/security";
import { STATUSES, adminSetStatus, type Status } from "@/lib/store";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return forbidden();
  const user = await getUser();
  if (!user || user.role === "customer") return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const { status } = await req.json().catch(() => ({}));
  if (!STATUSES.includes(status)) return Response.json({ error: "Bad request" }, { status: 400 });
  const result = adminSetStatus(Number(id), status as Status);
  return result.ok ? Response.json({ ok: true }) : Response.json({ error: result.error }, { status: 400 });
}
