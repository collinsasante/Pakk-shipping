// GET  /api/sourcing-requests  — list requests (customers see only their own)
// POST /api/sourcing-requests  — submit a new sourcing request (customer only)
import { NextRequest } from "next/server";
import { sourcingRequestsApi } from "@/lib/airtable";
import { requireAuth, serverErrorResponse, badRequestResponse, forbiddenResponse } from "@/lib/auth";
import { z } from "zod";
import type { SourcingRequestStatus } from "@/types";

const CreateSourcingRequestSchema = z.object({
  photos: z.array(z.string().url().max(500)).min(1, "At least one photo is required").max(10),
  description: z.string().min(1, "Description is required").max(2000),
  quantity: z.number().int().positive().max(10_000),
  notes: z.string().max(2000).optional(),
});

const STATUS_VALUES: SourcingRequestStatus[] = ["Requested", "Quoted", "Approved", "Declined", "Converted"];

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request, ["super_admin", "warehouse_staff", "customer"]);
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const status =
      statusParam && STATUS_VALUES.includes(statusParam as SourcingRequestStatus)
        ? (statusParam as SourcingRequestStatus)
        : undefined;

    if (user.role === "customer") {
      if (!user.customerId) return forbiddenResponse("No linked customer record");
      const data = await sourcingRequestsApi.list({ customerId: user.customerId, status });
      return Response.json({ success: true, data });
    }

    const data = await sourcingRequestsApi.list({ status });
    return Response.json({ success: true, data });
  } catch {
    return serverErrorResponse("Failed to fetch sourcing requests");
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request, ["customer"]);
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;

  if (!user.customerId) return forbiddenResponse("No linked customer record");

  try {
    const body = await request.json();
    const parsed = CreateSourcingRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequestResponse(parsed.error.errors[0].message);
    }

    const created = await sourcingRequestsApi.create(
      { ...parsed.data, customerId: user.customerId },
      user.email
    );
    return Response.json({ success: true, data: created }, { status: 201 });
  } catch {
    return serverErrorResponse("Failed to submit sourcing request");
  }
}
