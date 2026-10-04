import { getUser } from "@/lib/auth";
import { forbidden, sameOrigin } from "@/lib/security";
import { findUser, setUserRole } from "@/lib/store";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return forbidden();
  const me = await getUser();
  if (!me || me.role !== "owner") return Response.json({ error: "Only the owner can change roles." }, { status: 403 });
  const { id } = await ctx.params;
  const { role } = await req.json().catch(() => ({}));
  const target = findUser(id);
  if (!target || target.role === "owner" || target.id === me.id || !["staff", "customer"].includes(role)) return Response.json({ error: "Bad request" }, { status: 400 });
  setUserRole(id, role);
  return Response.json({ ok: true });
}
