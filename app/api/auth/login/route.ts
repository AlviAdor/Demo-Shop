import { createSession } from "@/lib/auth";
import { clientIp, clip, forbidden, isEmail, rateLimit, resetLimit, sameOrigin, tooMany } from "@/lib/security";
import { DUMMY_HASH, verifyPassword } from "@/lib/password";
import { createUser, findByEmail, publicUser } from "@/lib/store";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return forbidden();
  const body = await req.json().catch(() => ({}));
  const email = clip(body.email, 120).toLowerCase();
  const password = clip(body.password, 200);
  const ip = clientIp(req);

  if (body.mode === "register") {
    const wait = rateLimit(`reg:${ip}`, 6, 60 * 60_000);
    if (wait) return tooMany(wait);
    const name = clip(body.name, 80);
    if (!name || !isEmail(email)) return Response.json({ error: "Enter your name and a valid email." }, { status: 400 });
    if (password.length < 8) return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    if (findByEmail(email)) return Response.json({ error: "That email is already registered." }, { status: 409 });
    const u = createUser(name, email, password);
    if (!u) return Response.json({ error: "That email is already registered." }, { status: 409 });
    await createSession(u.id);
    return Response.json({ user: publicUser(u) });
  }

  // Throttle by IP and by account so neither one machine nor one target can be hammered.
  const wait = Math.max(rateLimit(`login-ip:${ip}`, 30, 15 * 60_000), rateLimit(`login-acct:${email}`, 8, 15 * 60_000));
  if (wait) return tooMany(wait);
  const u = findByEmail(email);
  // Always run a hash comparison so response time doesn't reveal whether the email exists.
  const ok = verifyPassword(password, u?.hash ?? DUMMY_HASH) && !!u;
  if (!u || !ok) return Response.json({ error: "Wrong email or password." }, { status: 401 });
  resetLimit(`login-acct:${email}`);
  await createSession(u.id);
  return Response.json({ user: publicUser(u) });
}
