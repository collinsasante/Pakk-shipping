// POST /api/sourcing-requests/[id]/convert — mark an Approved request Converted,
// linking it to the real Item created once the goods physically arrive (staff only)
import { NextRequest } from "next/server";
import { sourcingRequestsApi, BusinessError } from "@/lib/airtable";
import { requireAuth, serverErrorResponse, badRequestResponse } from "@/lib/auth";
import { z } from "zod";

const ConvertSourcingRequestSchema = z.object({
  itemId: z.string().min(1, "itemId is required"),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth(request, ["super_admin", "warehouse_staff"]);
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;
  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = ConvertSourcingRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequestResponse(parsed.error.errors[0].message);
    }

    const updated = await sourcingRequestsApi.convert(id, parsed.data.itemId, user.email, user.role);
    return Response.json({ success: true, data: updated, message: "Request converted to item" });
  } catch (err: unknown) {
    if (err instanceof BusinessError) return badRequestResponse(err.message);
    return serverErrorResponse("Failed to convert sourcing request");
  }
}
