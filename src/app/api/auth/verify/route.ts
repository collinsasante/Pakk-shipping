// POST /api/auth/verify — verify Firebase ID token and return app user
// DELETE /api/auth/verify — sign out (clear cookie)
import { NextRequest } from "next/server";
import { verifyIdToken } from "@/lib/firebase-admin";
import { usersApi } from "@/lib/airtable";
import { badRequestResponse } from "@/lib/auth";

const IS_DEV = process.env.NODE_ENV === "development";

// DEV-ONLY: hardcoded test admin — gated by NODE_ENV, never runs in production
const DEV_TOKEN = "DEV_ADMIN_TEST_TOKEN";
const DEV_USER = {
  id: "dev-user-id",
  firebaseUid: "dev-uid",
  email: "dev@pakkmaxx.com",
  role: "super_admin" as const,
  createdAt: new Date().toISOString(),
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken } = body;

    if (!idToken) {
      return badRequestResponse("idToken is required");
    }

    if (IS_DEV && idToken === DEV_TOKEN) {
      return Response.json(
        { success: true, data: { user: DEV_USER, uid: DEV_USER.firebaseUid, email: DEV_USER.email } },
        { status: 200, headers: { "Set-Cookie": `auth-token=${DEV_TOKEN}; Path=/; HttpOnly; SameSite=Strict; Max-Age=3600` } }
      );
    }

    // Verify Firebase token
    let decoded;
    try {
      decoded = await verifyIdToken(idToken);
    } catch (tokenErr) {
      const msg = tokenErr instanceof Error ? tokenErr.message : String(tokenErr);
      console.error("[verify] Token verification failed:", msg);
      return Response.json(
        { success: false, error: "Invalid or expired token", ...(IS_DEV && { detail: msg }) },
        { status: 401 }
      );
    }

    // Look up user in Airtable
    let appUser: import("@/types").AppUser | null = null;
    try {
      appUser = await usersApi.getByFirebaseUid(decoded.uid);
    } catch (dbErr) {
      const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
      console.error("[verify] step=airtable_read error:", msg);
      return Response.json(
        {
          success: false,
          error: "Cannot reach database. Check AIRTABLE_API_KEY and AIRTABLE_BASE_ID, and make sure the Users table exists.",
          step: "airtable_read",
          ...(IS_DEV && { detail: msg }),
        },
        { status: 503 }
      );
    }

    if (!appUser) {
      // Bootstrap: first Firebase login auto-creates super_admin if the Users table is empty.
      let userCount = 0;
      try {
        userCount = await usersApi.countAll();
      } catch (countErr) {
        const msg = countErr instanceof Error ? countErr.message : String(countErr);
        console.error("[verify] step=count_users error:", msg);
        return Response.json(
          {
            success: false,
            error: "Cannot count users in database. Check Airtable setup.",
            step: "count_users",
            ...(IS_DEV && { detail: msg }),
          },
          { status: 503 }
        );
      }

      if (userCount === 0) {
        try {
          appUser = await usersApi.create(decoded.uid, decoded.email ?? "", "super_admin");
          console.log(`[verify] Bootstrap — first super_admin created: ${decoded.email}`);
        } catch (createErr) {
          const msg = createErr instanceof Error ? createErr.message : String(createErr);
          console.error("[verify] step=create_user error:", msg);
          return Response.json(
            {
              success: false,
              error: "Failed to create your account in the database.",
              step: "create_user",
              ...(IS_DEV && { detail: msg }),
            },
            { status: 500 }
          );
        }
      } else {
        return Response.json(
          {
            success: false,
            error: "You are not registered in this system. Ask an administrator to add you.",
            code: "NOT_REGISTERED",
          },
          { status: 404 }
        );
      }
    }

    // Enrich customer users with shippingMark + customerName (login-time only, not per-request)
    appUser = await usersApi.enrichCustomerUser(appUser).catch(() => appUser!);

    // updateLastLogin is non-fatal — don't block login if this fails
    usersApi.updateLastLogin(appUser.id).catch((err) =>
      console.error("[verify] updateLastLogin failed (non-fatal):", err)
    );

    return Response.json(
      { success: true, data: { user: appUser, uid: decoded.uid, email: decoded.email } },
      {
        status: 200,
        headers: { "Set-Cookie": `auth-token=${idToken}; Path=/; HttpOnly; SameSite=Strict; Max-Age=3600` },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[verify] Unexpected error:", message);
    return Response.json(
      { success: false, error: "Verification failed", ...(IS_DEV && { detail: message }) },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  return Response.json(
    { success: true, message: "Signed out" },
    {
      status: 200,
      headers: { "Set-Cookie": `auth-token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0` },
    }
  );
}
