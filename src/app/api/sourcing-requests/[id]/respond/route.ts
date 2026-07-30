// PATCH /api/sourcing-requests/[id]/respond — customer approves or declines a quote
import { NextRequest } from "next/server";
import { sourcingRequestsApi, BusinessError } from "@/lib/airtable";
import { requireAuth, serverErrorResponse, badRequestResponse, forbiddenResponse } from "@/lib/auth";
import { z } from "zod";

const RespondSourcingRequestSchema = z.object({
  approve: z.boolean(),
  declineReason: z.string().max(1000).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth(request, ["customer"]);
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;
  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = RespondSourcingRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequestResponse(parsed.error.errors[0].message);
    }

    const existing = await sourcingRequestsApi.getById(id);
    if (existing.customerId !== user.customerId) {
      return forbiddenResponse("Access denied");
    }

    const updated = await sourcingRequestsApi.respond(id, parsed.data, user.email);
    return Response.json({
      success: true,
      data: updated,
      message: parsed.data.approve ? "Quote approved" : "Quote declined",
    });
  } catch (err: unknown) {
    if (err instanceof BusinessError) return badRequestResponse(err.message);
    return serverErrorResponse("Failed to respond to quote");
  }
}
