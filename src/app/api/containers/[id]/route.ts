// GET    /api/containers/[id]         — get single container with items
// PATCH  /api/containers/[id]         — update container
// DELETE /api/containers/[id]         — delete container
// POST  /api/containers/[id]/items    — add item to container
// DELETE /api/containers/[id]/items   — remove item from container
import { NextRequest } from "next/server";
import { containersApi, itemsApi } from "@/lib/airtable";
import {
  requireAuth,
  serverErrorResponse,
  notFoundResponse,
  badRequestResponse,
} from "@/lib/auth";
import { z } from "zod";

const UpdateContainerSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  departureDate: z.string().optional(),
  arrivalDate: z.string().optional(),
  trackingNumber: z.string().optional(),
  notes: z.string().optional(),
});

const ManageItemSchema = z.object({
  itemId: z.string().min(1, "Item ID is required"),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth(request, [
    "super_admin",
    "warehouse_staff",
  ]);
  if (authResult instanceof Response) return authResult;

  try {
    const container = await containersApi.getById(params.id);

    // Hydrate items — log failures but return partial data
    const items = container.itemIds.length
      ? (
          await Promise.all(
            container.itemIds.map((id) =>
              itemsApi.getById(id).catch((err) => {
                console.error(`[containers/${params.id}] Failed to fetch item ${id}:`, err);
                return null;
              })
            )
          )
        ).filter(Boolean)
      : [];

    return Response.json({
      success: true,
      data: { ...container, items },
    });
  } catch (err) {
    console.error(`[GET /containers/${params.id}] Error:`, err);
    return notFoundResponse("Container not found");
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth(request, ["super_admin"]);
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;

  try {
    const body = await request.json();
    const parsed = UpdateContainerSchema.safeParse(body);

    if (!parsed.success) {
      return badRequestResponse(
        parsed.error.errors.map((e) => e.message).join(", ")
      );
    }

    const container = await containersApi.update(
      params.id,
      parsed.data,
      user.email
    );

    return Response.json({
      success: true,
      data: container,
      message: "Container updated",
    });
  } catch (err) {
    console.error(`[PATCH /containers/${params.id}] Error:`, err);
    return serverErrorResponse("Failed to update container");
  }
}

// DELETE /api/containers/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth(request, ["super_admin"]);
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;

  try {
    await containersApi.delete(params.id, user.email);
    return Response.json({ success: true, message: "Container deleted" });
  } catch (err) {
    console.error(`[DELETE /containers/${params.id}] Error:`, err);
    return serverErrorResponse("Failed to delete container");
  }
}
