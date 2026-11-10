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

// issuedAt (seconds) lets the account reject sessions issued before its
// password changed.
export type StaffSession = { staffId: string; issuedAt: number | null };

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
    return {
      staffId: payload.sub,
      issuedAt: typeof payload.iat === "number" ? payload.iat : null,
    };
  } catch {
    return null;
  }
}

// Player session: identifies the participant and pins their team and event,
// so every player endpoint takes identity from here and never from the body.
// Long enough to cover the 24 h event plus margin.
export const PLAYER_SESSION_COOKIE = "tdoe_player";
export const PLAYER_SESSION_DURATION_SECONDS = 60 * 60 * 36;

export type PlayerSession = {
  participantId: string;
  teamId: string;
  eventId: string;
};

export async function createPlayerSession(
  session: PlayerSession,
): Promise<string> {
  const key = getSecretKey();
  if (!key) {
    throw new Error(
      `AUTH_SECRET is not set or is shorter than ${MIN_SECRET_LENGTH} characters`,
    );
  }

  return new SignJWT({
    kind: "player",
    teamId: session.teamId,
    eventId: session.eventId,
  })
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(session.participantId)
    .setIssuedAt()
    .setExpirationTime(`${PLAYER_SESSION_DURATION_SECONDS}s`)
    .sign(key);
}

export async function verifyPlayerSession(
  token: string | undefined,
): Promise<PlayerSession | null> {
  if (!token) return null;

  const key = getSecretKey();
  if (!key) return null;

  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: [ALGORITHM],
    });
    if (
      payload.kind !== "player" ||
      typeof payload.sub !== "string" ||
      typeof payload.teamId !== "string" ||
      typeof payload.eventId !== "string"
    ) {
      return null;
    }
    return {
      participantId: payload.sub,
      teamId: payload.teamId,
      eventId: payload.eventId,
    };
  } catch {
    return null;
  }
}

// Mentor session: a judge of one event. Same length as the player session,
// so mentors can keep grading after the event ends.
export const MENTOR_SESSION_COOKIE = "tdoe_mentor";
export const MENTOR_SESSION_DURATION_SECONDS = 60 * 60 * 36;

export type MentorSession = { mentorId: string; eventId: string };

export async function createMentorSession(
  session: MentorSession,
): Promise<string> {
  const key = getSecretKey();
  if (!key) {
    throw new Error(
      `AUTH_SECRET is not set or is shorter than ${MIN_SECRET_LENGTH} characters`,
    );
  }

  return new SignJWT({ kind: "mentor", eventId: session.eventId })
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(session.mentorId)
    .setIssuedAt()
    .setExpirationTime(`${MENTOR_SESSION_DURATION_SECONDS}s`)
    .sign(key);
}

export async function verifyMentorSession(
  token: string | undefined,
): Promise<MentorSession | null> {
  if (!token) return null;

  const key = getSecretKey();
  if (!key) return null;

  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: [ALGORITHM],
    });
    if (
      payload.kind !== "mentor" ||
      typeof payload.sub !== "string" ||
      typeof payload.eventId !== "string"
    ) {
      return null;
    }
    return { mentorId: payload.sub, eventId: payload.eventId };
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
