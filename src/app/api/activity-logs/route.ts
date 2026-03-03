// GET /api/activity-logs — audit log (admin only)
import { NextRequest } from "next/server";
import { activityLogsApi, statusHistoryApi } from "@/lib/airtable";
import { requireAuth, serverErrorResponse } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request, ["super_admin"]);
  if (authResult instanceof Response) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // "activity" | "status"
    const limitParam = parseInt(searchParams.get("limit") ?? "100");
    const limit = isNaN(limitParam) || limitParam < 1 ? 100 : limitParam;

    if (type === "status") {
      const history = await statusHistoryApi.getAll();
      return Response.json({ success: true, data: history });
    }

    const logs = await activityLogsApi.getAll(limit);
    return Response.json({ success: true, data: logs });
  } catch (err) {
    console.error("[GET /activity-logs] Error:", err);
    return serverErrorResponse("Failed to fetch activity logs");
  }
}
