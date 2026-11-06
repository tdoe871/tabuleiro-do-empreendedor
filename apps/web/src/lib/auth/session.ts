import { SignJWT, jwtVerify } from "jose";

// Same pattern as Maestro-virtual: hand-rolled JWT session (no NextAuth),
// signed with AUTH_SECRET and stored in an httpOnly cookie.
//
// Each kind of session has its own cookie and its own `kind` claim, and both
// must match: a player token copied into the staff cookie is rejected.

export const STAFF_SESSION_COOKIE = "tdoe_staff";
export const STAFF_SESSION_DURATION_SECONDS = 60 * 60 * 12;

const MIN_SECRET_LENGTH = 32;
const ALGORITHM = "HS256";

export type StaffSession = { staffId: string };

// Read on every call (not at import) so the build does not fail when
// AUTH_SECRET is missing, and so verification fails closed at runtime.
function getSecretKey(): Uint8Array | null {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) return null;
  return new TextEncoder().encode(secret);
}

export async function createStaffSession(staffId: string): Promise<string> {
  const key = getSecretKey();
  if (!key) {
    throw new Error(
      `AUTH_SECRET is not set or is shorter than ${MIN_SECRET_LENGTH} characters`,
    );
  }

  return new SignJWT({ kind: "staff" })
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(staffId)
    .setIssuedAt()
    .setExpirationTime(`${STAFF_SESSION_DURATION_SECONDS}s`)
    .sign(key);
}

export async function verifyStaffSession(
  token: string | undefined,
): Promise<StaffSession | null> {
  if (!token) return null;

  const key = getSecretKey();
  if (!key) return null;

  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: [ALGORITHM],
    });
    if (payload.kind !== "staff" || typeof payload.sub !== "string")
      return null;
    return { staffId: payload.sub };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
