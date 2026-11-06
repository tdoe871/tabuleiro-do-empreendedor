/**
 * @jest-environment node
 */
import { SignJWT } from "jose";

import { createStaffSession, verifyStaffSession } from "@/lib/auth/session";

const TEST_SECRET = "test-secret-at-least-32-characters-long!!";

describe("staff session (JWT)", () => {
  const originalSecret = process.env.AUTH_SECRET;

  beforeEach(() => {
    process.env.AUTH_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    jest.useRealTimers();
    process.env.AUTH_SECRET = originalSecret;
  });

  it("round-trips the staffId", async () => {
    const token = await createStaffSession("staff-123");
    const payload = await verifyStaffSession(token);
    expect(payload.staffId).toBe("staff-123");
  });

  it("rejects a tampered token", async () => {
    const token = await createStaffSession("staff-123");
    const [header, , signature] = token.split(".");
    const forgedPayload = Buffer.from(
      JSON.stringify({ staffId: "attacker" }),
    ).toString("base64url");
    await expect(
      verifyStaffSession(`${header}.${forgedPayload}.${signature}`),
    ).rejects.toThrow();
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await new SignJWT({ staffId: "staff-123" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("12h")
      .sign(new TextEncoder().encode("some-other-secret-that-is-long-enough"));
    await expect(verifyStaffSession(token)).rejects.toThrow();
  });

  it("rejects an expired token (> 12h)", async () => {
    jest.useFakeTimers({ now: new Date("2026-01-01T00:00:00Z") });
    const token = await createStaffSession("staff-123");
    jest.setSystemTime(new Date("2026-01-01T12:00:01Z"));
    await expect(verifyStaffSession(token)).rejects.toThrow();
  });

  it("throws when AUTH_SECRET is missing", async () => {
    delete process.env.AUTH_SECRET;
    await expect(createStaffSession("staff-123")).rejects.toThrow(
      "AUTH_SECRET is not set",
    );
  });
});
