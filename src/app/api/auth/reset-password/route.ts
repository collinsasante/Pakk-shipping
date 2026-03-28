// POST /api/auth/reset-password
// Generates a Firebase password reset link silently and sends our custom HTML email.
// Replaces direct client-side sendPasswordResetEmail calls which trigger Firebase's plain-text email.
import { NextRequest } from "next/server";
import { generatePasswordResetLink } from "@/lib/firebase-admin";
import { sendPasswordResetEmail } from "@/lib/email";
import { checkRateLimit, rateLimitedResponse, getClientIp } from "@/lib/rate-limit";
import { z } from "zod";

const Schema = z.object({
  email: z.string().email().max(254),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`reset-password:${ip}`, 5, 10 * 60_000)) {
    return rateLimitedResponse(600);
  }

  const body = await request.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, error: "Invalid email" }, { status: 400 });
  }

  const { email } = parsed.data;

  try {
    const resetUrl = await generatePasswordResetLink(email);
    await sendPasswordResetEmail(email, resetUrl);
  } catch (err) {
    console.error("[reset-password] failed:", err);
    // Still return success to prevent email enumeration
  }

  return Response.json({ success: true });
}
