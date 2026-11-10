import { NextResponse } from "next/server";
import { prisma } from "@tdoe/db";

import { apiError, readJsonObject } from "@/lib/api/errors";
import {
  checkResetToken,
  hashResetToken,
  isTokenShape,
} from "@/lib/auth/password-reset";
import { clientIp, createRateLimiter } from "@/lib/auth/rate-limit";

const isRateLimited = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 30 });

// POST /api/auth/password/check — whether a reset link still works, so the
// page can say so before the educator types a new password. Body: { token }.
// POST (not GET) so the token never lands in a URL or an access log.
export async function POST(request: Request) {
  const body = await readJsonObject(request);
  if (!isTokenShape(body?.token)) return apiError("RESET_TOKEN_INVALID");
  if (isRateLimited(clientIp(request))) return apiError("RATE_LIMITED");

  try {
    const reset = await prisma.passwordReset.findUnique({
      where: { tokenHash: hashResetToken(body.token) },
      select: { expiresAt: true, usedAt: true },
    });
    const check = checkResetToken(reset, new Date());
    if (check !== "ok") return apiError(check);
    return NextResponse.json({
      valid: true,
      expiresAt: reset!.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Check reset token failed:", error);
    return apiError("INTERNAL_ERROR");
  }
}
