import { NextResponse } from "next/server";
import { prisma } from "@tdoe/db";

import { apiError, readJsonObject } from "@/lib/api/errors";
import { normalizeEmail } from "@/lib/auth/account";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { clientIp, createRateLimiter } from "@/lib/auth/rate-limit";
import {
  STAFF_SESSION_COOKIE,
  STAFF_SESSION_DURATION_SECONDS,
  createStaffSession,
  sessionCookieOptions,
} from "@/lib/auth/session";

const isRateLimited = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10 });

// POST /api/auth/login — staff (educator) email + password login.
// Body: { email, senha }. See docs/backend/api.md.
export async function POST(request: Request) {
  const body = await readJsonObject(request);
  const email = normalizeEmail(body?.email);
  const senha = typeof body?.senha === "string" ? body.senha : "";
  if (!email || !senha) {
    const fields: Record<string, string> = {};
    if (!email) fields.email = "REQUIRED";
    if (!senha) fields.senha = "REQUIRED";
    return apiError("VALIDATION_ERROR", fields);
  }

  if (isRateLimited(clientIp(request))) return apiError("RATE_LIMITED");

  try {
    const staff = await prisma.staff.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, hashedPassword: true },
    });

    if (!staff) {
      // Hash anyway so the response time does not reveal whether the email
      // exists. Same error for unknown email and wrong password.
      await hashPassword(senha);
      return apiError("INVALID_CREDENTIALS");
    }
    if (!(await verifyPassword(senha, staff.hashedPassword))) {
      return apiError("INVALID_CREDENTIALS");
    }

    const response = NextResponse.json({
      staff: { id: staff.id, name: staff.name, email: staff.email },
    });
    response.cookies.set(
      STAFF_SESSION_COOKIE,
      await createStaffSession(staff.id),
      sessionCookieOptions(STAFF_SESSION_DURATION_SECONDS),
    );
    return response;
  } catch (error) {
    console.error("Staff login failed:", error);
    return apiError("INTERNAL_ERROR");
  }
}
