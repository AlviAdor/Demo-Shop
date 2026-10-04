import { destroySession } from "@/lib/auth";
import { forbidden, sameOrigin } from "@/lib/security";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return forbidden();
  await destroySession();
  return Response.json({ ok: true });
}
