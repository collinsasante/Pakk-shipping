// GET    /api/product-catalog/[id]
// PATCH  /api/product-catalog/[id]
// DELETE /api/product-catalog/[id]
import { NextRequest } from "next/server";
import { productCatalogApi } from "@/lib/airtable";
import { requireAuth, serverErrorResponse, badRequestResponse } from "@/lib/auth";
import { z } from "zod";

const UpdateProductCatalogSchema = z.object({
  productName: z.string().min(1).optional(),
  description: z.string().max(2000).optional(),
  referenceImages: z.array(z.string().url().max(500)).max(20).optional(),
  baseCost: z.number().min(0).max(1_000_000).optional(),
  supplierId: z.string().max(50).optional(),
  materialSpecs: z.string().max(2000).optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth(request, ["super_admin", "warehouse_staff"]);
  if (authResult instanceof Response) return authResult;
  const { id } = await params;

  try {
    const entry = await productCatalogApi.getById(id);
    return Response.json({ success: true, data: entry });
  } catch {
    return serverErrorResponse("Catalog entry not found");
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth(request, ["super_admin", "warehouse_staff"]);
  if (authResult instanceof Response) return authResult;
  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = UpdateProductCatalogSchema.safeParse(body);
    if (!parsed.success) {
      return badRequestResponse(parsed.error.errors[0].message);
    }

    const entry = await productCatalogApi.update(id, parsed.data);
    return Response.json({ success: true, data: entry });
  } catch {
    return serverErrorResponse("Failed to update catalog entry");
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth(request, ["super_admin"]);
  if (authResult instanceof Response) return authResult;
  const { id } = await params;

  try {
    await productCatalogApi.delete(id);
    return Response.json({ success: true });
  } catch {
    return serverErrorResponse("Failed to delete catalog entry");
  }
}
