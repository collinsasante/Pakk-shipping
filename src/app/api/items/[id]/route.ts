// GET    /api/items/[id]  — get single item
// PATCH  /api/items/[id]  — update item fields
// DELETE /api/items/[id]  — delete item
import { NextRequest } from "next/server";
import { itemsApi, statusHistoryApi } from "@/lib/airtable";
import {
  requireAuth,
  serverErrorResponse,
  notFoundResponse,
  badRequestResponse,
} from "@/lib/auth";
import { z } from "zod";

const UpdateItemSchema = z.object({
  weight: z.number().positive().optional(),
  length: z.number().positive().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  description: z.string().optional(),
  trackingNumber: z.string().optional(),
  notes: z.string().optional(),
  orderId: z.string().optional(),
  containerId: z.string().optional(),
  isMissing: z.boolean().optional(),
  photoUrls: z.array(z.string().url()).optional(),
});

// GET /api/items/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth(request, [
    "super_admin",
    "warehouse_staff",
    "customer",
  ]);
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;

  try {
    const item = await itemsApi.getById(params.id);

    // Customers can only access their own items
    if (user.role === "customer" && item.customerId !== user.customerId) {
      return Response.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    // Fetch status history
    const history = await statusHistoryApi.getForRecord(params.id);

    return Response.json({
      success: true,
      data: { ...item, statusHistory: history },
    });
  } catch (err) {
    console.error(`[GET /items/${params.id}] Error:`, err);
    return notFoundResponse("Item not found");
  }
}

// PATCH /api/items/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth(request, [
    "super_admin",
    "warehouse_staff",
  ]);
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;

  try {
    const body = await request.json();
    const parsed = UpdateItemSchema.safeParse(body);

    if (!parsed.success) {
      return badRequestResponse(
        parsed.error.errors.map((e) => e.message).join(", ")
      );
    }

    const item = await itemsApi.update(params.id, parsed.data, user.email);

    return Response.json({
      success: true,
      data: item,
      message: "Item updated successfully",
    });
  } catch (err) {
    console.error(`[PATCH /items/${params.id}] Error:`, err);
    return serverErrorResponse("Failed to update item");
  }
}

// DELETE /api/items/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth(request, ["super_admin"]);
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;

  try {
    await itemsApi.delete(params.id, user.email);
    return Response.json({ success: true, message: "Item deleted" });
  } catch (err) {
    console.error(`[DELETE /items/${params.id}] Error:`, err);
    return serverErrorResponse("Failed to delete item");
  }
}
