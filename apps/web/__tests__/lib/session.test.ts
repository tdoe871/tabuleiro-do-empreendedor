/**
 * @jest-environment node
 */
import { SignJWT, UnsecuredJWT } from "jose";

import {
  MENTOR_SESSION_DURATION_SECONDS,
  PLAYER_SESSION_DURATION_SECONDS,
  STAFF_SESSION_DURATION_SECONDS,
  createMentorSession,
  createPlayerSession,
  createStaffSession,
  sessionCookieOptions,
  verifyMentorSession,
  verifyPlayerSession,
  verifyStaffSession,
} from "@/lib/auth/session";

// Round-trips, foreign secrets and cross-kind tokens are covered in
// lib/auth.test.ts, features/players.test.ts and features/mentors.test.ts.
// This file covers the gaps: expiry, forged payloads, unsigned tokens and
// cookie flags.

const SECRET = "test-secret-at-least-32-characters-long!!";
const NOW = new Date("2026-01-01T00:00:00Z");

const player = { participantId: "p1", teamId: "t1", eventId: "e1" };
const mentor = { mentorId: "m1", eventId: "e1" };

const kinds = [
  {
    kind: "staff",
    duration: STAFF_SESSION_DURATION_SECONDS,
    create: () => createStaffSession("staff-1"),
    verify: verifyStaffSession,
  },
  {
    kind: "player",
    duration: PLAYER_SESSION_DURATION_SECONDS,
    create: () => createPlayerSession(player),
    verify: verifyPlayerSession,
  },
  {
    kind: "mentor",
    duration: MENTOR_SESSION_DURATION_SECONDS,
    create: () => createMentorSession(mentor),
    verify: verifyMentorSession,
  },
] as const;

describe("session tokens", () => {
  const originalSecret = process.env.AUTH_SECRET;

  beforeEach(() => {
    process.env.AUTH_SECRET = SECRET;
    jest.useFakeTimers({ now: NOW });
  });

  afterEach(() => {
    jest.useRealTimers();
    process.env.AUTH_SECRET = originalSecret;
  });

  describe.each(kinds)("$kind session", ({ duration, create, verify }) => {
    it("is still valid just before it expires", async () => {
      const token = await create();
      jest.setSystemTime(NOW.getTime() + (duration - 60) * 1000);
      await expect(verify(token)).resolves.not.toBeNull();
    });

    it("is rejected once it expires", async () => {
      const token = await create();
      jest.setSystemTime(NOW.getTime() + (duration + 1) * 1000);
      await expect(verify(token)).resolves.toBeNull();
    });

    it("is rejected when the payload is swapped but the signature kept", async () => {
      const [header, payload, signature] = (await create()).split(".");
      const claims = JSON.parse(Buffer.from(payload!, "base64url").toString());
      const forged = Buffer.from(
        JSON.stringify({ ...claims, sub: "attacker" }),
      ).toString("base64url");
      await expect(
        verify(`${header}.${forged}.${signature}`),
      ).resolves.toBeNull();
    });
  });

  it.each(kinds)(
    "rejects an unsigned (alg: none) $kind token",
    async ({ kind, verify }) => {
      const token = new UnsecuredJWT({ kind, teamId: "t1", eventId: "e1" })
        .setSubject("attacker")
        .setExpirationTime("1h")
        .encode();
      await expect(verify(token)).resolves.toBeNull();
    },
  );

  it("rejects a staff token signed with another HMAC algorithm", async () => {
    const token = await new SignJWT({ kind: "staff" })
      .setProtectedHeader({ alg: "HS512" })
      .setSubject("staff-1")
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(SECRET));
    await expect(verifyStaffSession(token)).resolves.toBeNull();
  });

  it("rejects staff tokens in the player and mentor verifiers", async () => {
    const staffToken = await createStaffSession("staff-1");
    await expect(verifyPlayerSession(staffToken)).resolves.toBeNull();
    await expect(verifyMentorSession(staffToken)).resolves.toBeNull();
  });
});

describe("sessionCookieOptions", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
  });

  it("is httpOnly, lax and site-wide", () => {
    expect(sessionCookieOptions(60)).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60,
    });
  });

  it("is secure only in production", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    expect(sessionCookieOptions(60).secure).toBe(true);

    (process.env as Record<string, string | undefined>).NODE_ENV =
      "development";
    expect(sessionCookieOptions(60).secure).toBe(false);
  });
});
