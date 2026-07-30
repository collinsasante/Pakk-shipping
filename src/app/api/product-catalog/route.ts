// GET  /api/product-catalog  — list/search catalog entries
// POST /api/product-catalog  — create catalog entry (staff only)
import { NextRequest } from "next/server";
import { productCatalogApi } from "@/lib/airtable";
import { requireAuth, serverErrorResponse, badRequestResponse } from "@/lib/auth";
import { z } from "zod";

const CreateProductCatalogSchema = z.object({
  productName: z.string().min(1, "Product name is required"),
  description: z.string().max(2000).optional(),
  referenceImages: z.array(z.string().url().max(500)).max(20).optional(),
  baseCost: z.number().min(0).max(1_000_000).optional(),
  supplierId: z.string().max(50).optional(),
  materialSpecs: z.string().max(2000).optional(),
});

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request, ["super_admin", "warehouse_staff"]);
  if (authResult instanceof Response) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? undefined;
    const data = await productCatalogApi.list(search);
    return Response.json({ success: true, data });
  } catch {
    return serverErrorResponse("Failed to fetch product catalog");
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request, ["super_admin", "warehouse_staff"]);
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;

  try {
    const body = await request.json();
    const parsed = CreateProductCatalogSchema.safeParse(body);
    if (!parsed.success) {
      return badRequestResponse(parsed.error.errors[0].message);
    }

    const entry = await productCatalogApi.create(parsed.data, user.email);
    return Response.json({ success: true, data: entry }, { status: 201 });
  } catch {
    return serverErrorResponse("Failed to create catalog entry");
  }
}
