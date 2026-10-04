import { getProductsByIds, toCard } from "@/lib/catalog";

export const dynamic = "force-dynamic";

// Small public lookup used by the bag, so the browser never needs the whole catalogue: GET /api/products?ids=p01,p04
export function GET(req: Request) {
  const ids = (new URL(req.url).searchParams.get("ids") ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 30);
  return Response.json({ products: getProductsByIds(ids).map(toCard) }, { headers: { "Cache-Control": "public, max-age=15, stale-while-revalidate=60" } });
}
