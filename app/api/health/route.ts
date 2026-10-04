export const dynamic = "force-dynamic";

// Liveness probe for load balancers and container orchestrators.
export function GET() {
  return Response.json({ ok: true, uptime: Math.round(process.uptime()) }, { headers: { "Cache-Control": "no-store" } });
}
