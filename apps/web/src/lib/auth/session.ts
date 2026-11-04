import { SignJWT, jwtVerify } from "jose";

// Same pattern as Maestro-virtual: hand-rolled JWT session (no NextAuth),
// signed with AUTH_SECRET. Staff (maestro) sessions only — participants
// authenticate implicitly via their team's joinCode, no password.

const alg = "HS256";

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function createStaffSession(staffId: string) {
  return new SignJWT({ staffId })
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(getSecretKey());
}

export async function verifyStaffSession(token: string) {
  const { payload } = await jwtVerify(token, getSecretKey());
  return payload as { staffId: string };
}
