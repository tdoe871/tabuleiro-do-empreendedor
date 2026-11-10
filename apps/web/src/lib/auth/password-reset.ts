import { createHash, randomBytes } from "node:crypto";

import type { Locale } from "@/i18n/routing";

// "Forgot my password" rules for educators. Pure functions (no database
// access) so they can be unit-tested; the limits are defaults.

export const RESET_TOKEN_TTL_MINUTES = 60;
// Links per account per hour: stops someone from flooding an inbox.
export const MAX_RESETS_PER_HOUR = 3;
// The frontend page that reads the token (from the URL fragment) and asks
// for the new password.
export const RESET_PASSWORD_PATH = "/reset-password";

// 32 random bytes: the token goes in the email, only its hash is stored.
export function generateResetToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashResetToken(token) };
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Tokens are 43 base64url characters; anything else is not worth a query.
export function isTokenShape(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
}

export function checkResetToken(
  reset: { expiresAt: Date; usedAt: Date | null } | null,
  now: Date,
): "ok" | "RESET_TOKEN_INVALID" | "RESET_TOKEN_EXPIRED" {
  if (!reset || reset.usedAt) return "RESET_TOKEN_INVALID";
  if (reset.expiresAt.getTime() <= now.getTime()) return "RESET_TOKEN_EXPIRED";
  return "ok";
}

// The token travels in the fragment (#token=...): browsers never send it to
// a server, so it does not end up in access logs or Referer headers.
export function resetLink(appUrl: string, locale: Locale, token: string) {
  return `${appUrl.replace(/\/$/, "")}/${locale}${RESET_PASSWORD_PATH}#token=${token}`;
}

// A session issued before the password changed is no longer valid. `iat` is
// in whole seconds, so compare at that precision: the session created right
// after the change (same second) stays valid.
export function issuedBeforePasswordChange(
  issuedAtSeconds: number | null,
  passwordChangedAt: Date | null,
): boolean {
  if (!passwordChangedAt) return false;
  if (issuedAtSeconds === null) return true;
  return issuedAtSeconds < Math.floor(passwordChangedAt.getTime() / 1000);
}
