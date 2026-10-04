import { getUser } from "@/lib/auth";
import { getCurrency, getRate } from "@/lib/currency-server";
import { runAssistant } from "@/lib/assistant";
import { clientIp, clip, forbidden, rateLimit, sameOrigin, tooMany } from "@/lib/security";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return forbidden();
  const wait = rateLimit(`assistant:${clientIp(req)}`, 40, 60_000);
  if (wait) return tooMany(wait);
  const body = await req.json().catch(() => ({}));
  const message = clip(body.message, 400);
  if (!message) return Response.json({ error: "Empty message." }, { status: 400 });
  const user = await getUser();
  const lastProducts = Array.isArray(body.lastProducts) ? body.lastProducts.map((x: unknown) => clip(x, 20)).slice(0, 6) : undefined;
  await new Promise((r) => setTimeout(r, 450)); // small pause so the "thinking" state is visible
  return Response.json(runAssistant({ message, lastProducts }, user && { id: user.id, name: user.name, role: user.role }, await getCurrency(), getRate()));
}
