// GET  /api/items  — list items
// POST /api/items  — create item (warehouse staff / admin)
import { NextRequest } from "next/server";
import { itemsApi } from "@/lib/airtable";
import {
  requireAuth,
  serverErrorResponse,
  badRequestResponse,
} from "@/lib/auth";
import { z } from "zod";

const CreateItemSchema = z.object({
  weight: z.number().positive("Weight must be positive"),
  length: z.number().positive().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  dimensionUnit: z.enum(["cm", "inches"]).default("cm"),
  description: z.string().optional().default(""),
  dateReceived: z.string(),
  trackingNumber: z.string().optional(),
  customerId: z.string().min(1, "Customer ID is required"),
  notes: z.string().optional(),
  photoUrls: z.array(z.string().url()).optional(),
});

// GET /api/items
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request, [
    "super_admin",
    "warehouse_staff",
    "customer",
  ]);
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;

  try {
    const { searchParams } = new URL(request.url);

    const params = {
      status: searchParams.get("status") as
        | import("@/types").ItemStatus
        | undefined,
      customerId: searchParams.get("customerId") ?? undefined,
      containerId: searchParams.get("containerId") ?? undefined,
      orderId: searchParams.get("orderId") ?? undefined,
      isMissing: searchParams.has("isMissing")
        ? searchParams.get("isMissing") === "true"
        : undefined,
      search: searchParams.get("search") ?? undefined,
    };

    // Customers can only see their own items
    if (user.role === "customer") {
      params.customerId = user.customerId;
    }

    const items = await itemsApi.list(params);

    return Response.json({ success: true, data: items });
  } catch (err) {
    console.error("[GET /items] Error:", err);
    return serverErrorResponse("Failed to fetch items");
  }
}

// POST /api/items
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request, [
    "super_admin",
    "warehouse_staff",
  ]);
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;

  try {
    const body = await request.json();
    const parsed = CreateItemSchema.safeParse(body);

    if (!parsed.success) {
      return badRequestResponse(
        parsed.error.errors.map((e) => e.message).join(", ")
      );
    }

    const item = await itemsApi.create(parsed.data, user.email);

    return Response.json(
      {
        success: true,
        data: item,
        message: `Item ${item.itemRef} received and assigned to customer`,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /items] Error:", err);
    return serverErrorResponse("Failed to create item");
  }
}
