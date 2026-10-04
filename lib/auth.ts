import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { findUser, publicUser } from "./store";
import type { Role } from "./types";

const COOKIE = "alta_session";

function secretKey() {
  const s = process.env.AUTH_SECRET;
  if (!s && process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
    throw new Error("AUTH_SECRET must be set in production (use a random string of 32+ characters).");
  }
  return new TextEncoder().encode(s ?? "dev-only-secret-change-me-in-production-0123456789");
}

export async function createSession(userId: string) {
  const token = await new SignJWT({ uid: userId }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(secretKey());
  // Only mark the cookie Secure when the request really arrived over https, otherwise Safari drops it on http://localhost.
  const secure = (await headers()).get("x-forwarded-proto") === "https";
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 7 * 86400 });
}
export async function destroySession() {
  (await cookies()).delete(COOKIE);
}
export async function getUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    const u = findUser(String(payload.uid));
    return u ? publicUser(u) : null;
  } catch {
    return null;
  }
}
export async function requireRole(roles: Role[], next = "/") {
  const u = await getUser();
  if (!u) redirect("/login?next=" + encodeURIComponent(next));
  if (!roles.includes(u.role)) redirect("/?denied=1");
  return u;
}
