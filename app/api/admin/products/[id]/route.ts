import { getUser } from "@/lib/auth";
import { allCategories, setVariantStock, updateProduct, getProductById, bumpCatalog } from "@/lib/catalog";
import { forbidden, sameOrigin } from "@/lib/security";

// Inventory and catalogue edits. Staff and owner can change stock; only the owner can change price, visibility or category.
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return forbidden();
  const user = await getUser();
  if (!user || user.role === "customer") return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const product = getProductById(id);
  if (!product) return Response.json({ error: "Product not found" }, { status: 404 });

  if (body.size !== undefined) {
    if (typeof body.size !== "string" || !product.sizes.includes(body.size) || !setVariantStock(id, body.size, body.stock)) return Response.json({ error: "Invalid stock update" }, { status: 400 });
    bumpCatalog();
    return Response.json({ ok: true });
  }
  if (user.role !== "owner") return Response.json({ error: "Only the owner can change price, visibility or category." }, { status: 403 });
  const patch: { price?: number; active?: boolean; categoryId?: string } = {};
  if (body.price !== undefined) patch.price = body.price;
  if (body.active !== undefined) patch.active = !!body.active;
  if (body.categoryId !== undefined) { if (!allCategories().some((c) => c.id === body.categoryId)) return Response.json({ error: "Unknown category" }, { status: 400 }); patch.categoryId = body.categoryId; }
  if (!Object.keys(patch).length || !updateProduct(id, patch)) return Response.json({ error: "Invalid update" }, { status: 400 });
  return Response.json({ ok: true });
}
