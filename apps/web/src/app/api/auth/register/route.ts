import { NextResponse } from "next/server";
import { Prisma, prisma } from "@tdoe/db";

import { apiError, readJsonObject } from "@/lib/api/errors";
import {
  isValidEmail,
  nameError,
  normalizeEmail,
  passwordError,
} from "@/lib/auth/account";
import { hashPassword } from "@/lib/auth/password";
import { clientIp, createRateLimiter } from "@/lib/auth/rate-limit";
import {
  STAFF_SESSION_COOKIE,
  STAFF_SESSION_DURATION_SECONDS,
  createStaffSession,
  sessionCookieOptions,
} from "@/lib/auth/session";

const isRateLimited = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 5 });

// POST /api/auth/register — staff (educator) signup.
// Body: { nome, sobrenome, email, senha }. See docs/backend/api.md.
export async function POST(request: Request) {
  const body = await readJsonObject(request);
  if (!body) return apiError("VALIDATION_ERROR");

  const email = normalizeEmail(body.email);
  const fields: Record<string, string> = {};
  const firstNameError = nameError(body.nome);
  const lastNameError = nameError(body.sobrenome);
  const senhaError = passwordError(body.senha);
  if (firstNameError) fields.nome = firstNameError;
  if (lastNameError) fields.sobrenome = lastNameError;
  if (!email) fields.email = "REQUIRED";
  else if (!isValidEmail(email)) fields.email = "INVALID";
  if (senhaError) fields.senha = senhaError;
  if (Object.keys(fields).length > 0) {
    return apiError("VALIDATION_ERROR", fields);
  }

  if (isRateLimited(clientIp(request))) return apiError("RATE_LIMITED");

  try {
    const staff = await prisma.staff.create({
      data: {
        name: `${String(body.nome).trim()} ${String(body.sobrenome).trim()}`,
        email,
        hashedPassword: await hashPassword(body.senha as string),
      },
      select: { id: true, name: true, email: true },
    });

    const response = NextResponse.json({ staff }, { status: 201 });
    response.cookies.set(
      STAFF_SESSION_COOKIE,
      await createStaffSession(staff.id),
      sessionCookieOptions(STAFF_SESSION_DURATION_SECONDS),
    );
    return response;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return apiError("EMAIL_TAKEN");
    }
    console.error("Staff register failed:", error);
    return apiError("INTERNAL_ERROR");
  }
}
