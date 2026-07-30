// GET    /api/sourcing-requests/[id]
// DELETE /api/sourcing-requests/[id]
import { NextRequest } from "next/server";
import { sourcingRequestsApi, BusinessError } from "@/lib/airtable";
import { requireAuth, serverErrorResponse, forbiddenResponse, badRequestResponse } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth(request, ["super_admin", "warehouse_staff", "customer"]);
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;
  const { id } = await params;

  try {
    const sourcingRequest = await sourcingRequestsApi.getById(id);

    if (user.role === "customer" && sourcingRequest.customerId !== user.customerId) {
      return forbiddenResponse("Access denied");
    }

    return Response.json({ success: true, data: sourcingRequest });
  } catch {
    return serverErrorResponse("Sourcing request not found");
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth(request, ["super_admin"]);
  if (authResult instanceof Response) return authResult;
  const { id } = await params;

  try {
    await sourcingRequestsApi.delete(id);
    return Response.json({ success: true });
  } catch (err: unknown) {
    if (err instanceof BusinessError) return badRequestResponse(err.message);
    return serverErrorResponse("Failed to delete sourcing request");
  }
}
