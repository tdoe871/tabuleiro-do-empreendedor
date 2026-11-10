import { NextResponse } from "next/server";
import { INTERACTIVE_TX, prisma } from "@tdoe/db";

import { ApiFailure, apiError, readJsonObject } from "@/lib/api/errors";
import { passwordError } from "@/lib/auth/account";
import { hashPassword } from "@/lib/auth/password";
import {
  checkResetToken,
  hashResetToken,
  isTokenShape,
} from "@/lib/auth/password-reset";
import { clientIp, createRateLimiter } from "@/lib/auth/rate-limit";
import {
  STAFF_SESSION_COOKIE,
  STAFF_SESSION_DURATION_SECONDS,
  createStaffSession,
  sessionCookieOptions,
} from "@/lib/auth/session";

const isRateLimited = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10 });

// POST /api/auth/password/reset — set a new password with the emailed link.
// Body: { token, senha }. The link works once; the educator's other sessions
// stop working and this one starts logged in (same answer as login).
export async function POST(request: Request) {
  const body = await readJsonObject(request);
  if (!body) return apiError("VALIDATION_ERROR");
  const senhaError = passwordError(body.senha);
  if (senhaError) return apiError("VALIDATION_ERROR", { senha: senhaError });
  if (!isTokenShape(body.token)) return apiError("RESET_TOKEN_INVALID");

  if (isRateLimited(clientIp(request))) return apiError("RATE_LIMITED");

  const tokenHash = hashResetToken(body.token);
  try {
    // Hash first (~200 ms) so the transaction stays short.
    const hashedPassword = await hashPassword(body.senha as string);

    const staff = await prisma.$transaction(async (tx) => {
      const now = new Date();
      // Claiming the link is one conditional update: two submits at the same
      // time cannot both use it.
      const { count } = await tx.passwordReset.updateMany({
        where: { tokenHash, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      const reset = await tx.passwordReset.findUnique({
        where: { tokenHash },
        select: { id: true, staffId: true, expiresAt: true, usedAt: true },
      });
      if (count === 0 || !reset) {
        const check = checkResetToken(reset, now);
        throw new ApiFailure(check === "ok" ? "RESET_TOKEN_INVALID" : check);
      }

      await tx.passwordReset.deleteMany({
        where: { staffId: reset.staffId, id: { not: reset.id } },
      });
      return tx.staff.update({
        where: { id: reset.staffId },
        data: { hashedPassword, passwordChangedAt: now },
        select: { id: true, name: true, email: true },
      });
    }, INTERACTIVE_TX);

    const response = NextResponse.json({ staff });
    response.cookies.set(
      STAFF_SESSION_COOKIE,
      await createStaffSession(staff.id),
      sessionCookieOptions(STAFF_SESSION_DURATION_SECONDS),
    );
    return response;
  } catch (error) {
    if (error instanceof ApiFailure) return apiError(error.code);
    console.error("Password reset failed:", error);
    return apiError("INTERNAL_ERROR");
  }
}
