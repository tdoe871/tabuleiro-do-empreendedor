import { after, NextResponse } from "next/server";
import { prisma } from "@tdoe/db";

import type { Locale } from "@/i18n/routing";
import { apiError, readJsonObject } from "@/lib/api/errors";
import { isValidEmail, normalizeEmail } from "@/lib/auth/account";
import {
  MAX_RESETS_PER_HOUR,
  RESET_TOKEN_TTL_MINUTES,
  generateResetToken,
  resetLink,
} from "@/lib/auth/password-reset";
import { clientIp, createRateLimiter } from "@/lib/auth/rate-limit";
import {
  emailLocale,
  passwordResetEmail,
} from "@/lib/email/password-reset-email";
import { sendEmail } from "@/lib/email/send";

const isRateLimited = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 5 });

// POST /api/auth/password/forgot — an educator asks for a link to set a new
// password. Body: { email, locale? } (locale picks the email's language).
//
// Always answers 202, whether the email has an account or not, and does the
// work after responding: neither the answer nor its timing reveals which
// emails are registered.
export async function POST(request: Request) {
  const body = await readJsonObject(request);
  const email = normalizeEmail(body?.email);
  if (!email) return apiError("VALIDATION_ERROR", { email: "REQUIRED" });
  if (!isValidEmail(email)) {
    return apiError("VALIDATION_ERROR", { email: "INVALID" });
  }

  if (isRateLimited(clientIp(request))) return apiError("RATE_LIMITED");

  const locale = emailLocale(body?.locale);
  after(() => sendResetLink(email, locale));
  return NextResponse.json({ ok: true }, { status: 202 });
}

async function sendResetLink(email: string, locale: Locale): Promise<void> {
  // The link must point at our own site. Never build it from the request's
  // Host header: a forged one would send the token somewhere else.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    console.error("[password-reset] NEXT_PUBLIC_APP_URL is not set");
    return;
  }

  try {
    const staff = await prisma.staff.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    });
    if (!staff) return;

    const now = Date.now();
    const recent = await prisma.passwordReset.count({
      where: { staffId: staff.id, createdAt: { gt: new Date(now - 3600_000) } },
    });
    if (recent >= MAX_RESETS_PER_HOUR) {
      console.info("[password-reset] hourly limit reached for an account");
      return;
    }

    // Only the newest link works. Older unused ones are marked used, not
    // deleted, so they still count toward the hourly limit.
    const { token, tokenHash } = generateResetToken();
    const [, reset] = await prisma.$transaction([
      prisma.passwordReset.updateMany({
        where: { staffId: staff.id, usedAt: null },
        data: { usedAt: new Date(now) },
      }),
      prisma.passwordReset.create({
        data: {
          staffId: staff.id,
          tokenHash,
          expiresAt: new Date(now + RESET_TOKEN_TTL_MINUTES * 60_000),
        },
      }),
    ]);

    const sent = await sendEmail({
      ...passwordResetEmail({
        to: staff.email,
        name: staff.name,
        link: resetLink(appUrl, locale, token),
        minutes: RESET_TOKEN_TTL_MINUTES,
        locale,
      }),
      idempotencyKey: `password-reset/${reset.id}`,
    });
    if (!sent.ok) {
      console.error(`[password-reset] email not sent: ${sent.reason}`);
    }
  } catch (error) {
    console.error("[password-reset] failed:", error);
  }
}
