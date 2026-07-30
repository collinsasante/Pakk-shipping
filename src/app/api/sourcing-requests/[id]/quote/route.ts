// PATCH /api/sourcing-requests/[id]/quote — staff sends a price quote (staff only)
import { NextRequest } from "next/server";
import { sourcingRequestsApi, customersApi, BusinessError } from "@/lib/airtable";
import { requireAuth, serverErrorResponse, badRequestResponse } from "@/lib/auth";
import { sendQuoteReadyEmail } from "@/lib/email";
import { z } from "zod";

const QuoteSourcingRequestSchema = z.object({
  catalogId: z.string().max(50).optional(),
  newCatalogEntry: z
    .object({
      productName: z.string().min(1),
      description: z.string().max(2000).optional(),
      referenceImages: z.array(z.string().url().max(500)).max(20).optional(),
      baseCost: z.number().min(0).max(1_000_000).optional(),
      supplierId: z.string().max(50).optional(),
      materialSpecs: z.string().max(2000).optional(),
    })
    .optional(),
  quotedUnitPriceUsd: z.number().positive().max(1_000_000),
  quantity: z.number().int().positive().max(10_000).optional(),
  quoteNotes: z.string().max(2000).optional(),
  sendWhatsApp: z.boolean().optional().default(false),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth(request, ["super_admin", "warehouse_staff"]);
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;
  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = QuoteSourcingRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequestResponse(parsed.error.errors[0].message);
    }

    const updated = await sourcingRequestsApi.quote(id, parsed.data, user.email, user.role);

    // Fire quote-ready email non-fatally, after the write succeeds
    if (updated.customerId) {
      customersApi
        .getById(updated.customerId)
        .then((customer) => {
          if (!customer?.email) return;
          sendQuoteReadyEmail({
            to: customer.email,
            customerName: customer.name,
            requestRef: updated.requestRef,
            productName: updated.catalogProductName ?? updated.description,
            quantity: updated.quantity,
            quotedUnitPriceUsd: updated.quotedUnitPriceUsd ?? 0,
            quotedTotalUsd: updated.quotedTotalUsd ?? 0,
          }).catch(() => {});
        })
        .catch(() => {});
    }

    return Response.json({ success: true, data: updated, message: "Quote sent" });
  } catch (err: unknown) {
    if (err instanceof BusinessError) return badRequestResponse(err.message);
    return serverErrorResponse("Failed to send quote");
  }
}
