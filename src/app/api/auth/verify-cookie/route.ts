// GET /api/auth/verify-cookie — lightweight cookie validation for middleware
import { NextRequest } from "next/server";
import { verifyIdToken } from "@/lib/firebase-admin";
import { usersApi } from "@/lib/airtable";

const DEV_TOKEN = "DEV_ADMIN_TEST_TOKEN";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    if (!token) {
      return Response.json({ success: false }, { status: 401 });
    }

    // DEV bypass
    if (process.env.NODE_ENV === "development" && token === DEV_TOKEN) {
      return Response.json({
        success: true,
        data: {
          id: "dev-user-id",
          firebaseUid: "dev-uid",
          email: "dev@pakkmaxx.com",
          role: "super_admin",
          createdAt: new Date().toISOString(),
        },
      });
    }

    const decoded = await verifyIdToken(token);
    const user = await usersApi.getByFirebaseUid(decoded.uid);

    if (!user) {
      return Response.json({ success: false }, { status: 401 });
    }

    return Response.json({
      success: true,
      data: user,
    });
  } catch {
    return Response.json({ success: false }, { status: 401 });
  }
}
