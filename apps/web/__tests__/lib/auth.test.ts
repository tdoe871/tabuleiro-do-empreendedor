/**
 * @jest-environment node
 */
import { SignJWT } from "jose";

import {
  isValidEmail,
  nameError,
  normalizeEmail,
  passwordError,
} from "@/lib/auth/account";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { clientIp, createRateLimiter } from "@/lib/auth/rate-limit";
import { createStaffSession, verifyStaffSession } from "@/lib/auth/session";

const SECRET = "test-secret-with-at-least-32-characters!!";

describe("password", () => {
  it("verifies the right password and rejects a wrong one", async () => {
    const hash = await hashPassword("correct horse");
    expect(hash.startsWith("scrypt$")).toBe(true);
    await expect(verifyPassword("correct horse", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong horse", hash)).resolves.toBe(false);
  });

  it("rejects the seed placeholder and malformed hashes", async () => {
    await expect(verifyPassword("anything", "!")).resolves.toBe(false);
    await expect(verifyPassword("anything", "")).resolves.toBe(false);
    await expect(verifyPassword("x", "scrypt$a$b$c$$")).resolves.toBe(false);
  });
});

describe("staff session", () => {
  const original = process.env.AUTH_SECRET;
  beforeEach(() => {
    process.env.AUTH_SECRET = SECRET;
  });
  afterAll(() => {
    process.env.AUTH_SECRET = original;
  });

  it("round-trips the staff id", async () => {
    const token = await createStaffSession("staff-1");
    await expect(verifyStaffSession(token)).resolves.toEqual({
      staffId: "staff-1",
    });
  });

  it("rejects missing, tampered and foreign-secret tokens", async () => {
    const token = await createStaffSession("staff-1");
    await expect(verifyStaffSession(undefined)).resolves.toBeNull();
    await expect(verifyStaffSession(`${token}x`)).resolves.toBeNull();

    process.env.AUTH_SECRET = "another-secret-with-at-least-32-chars!!";
    await expect(verifyStaffSession(token)).resolves.toBeNull();
  });

  it("rejects a valid token of another kind (e.g. a player session)", async () => {
    const playerToken = await new SignJWT({ kind: "player" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("participant-1")
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(SECRET));
    await expect(verifyStaffSession(playerToken)).resolves.toBeNull();
  });

  it("fails closed when AUTH_SECRET is missing or too short", async () => {
    const token = await createStaffSession("staff-1");
    process.env.AUTH_SECRET = "short";
    await expect(verifyStaffSession(token)).resolves.toBeNull();
    await expect(createStaffSession("staff-1")).rejects.toThrow();
  });
});

describe("account rules", () => {
  it("normalizes and validates emails", () => {
    expect(normalizeEmail("  Ana@Ejemplo.COM ")).toBe("ana@ejemplo.com");
    expect(normalizeEmail(42)).toBe("");
    expect(isValidEmail("ana@ejemplo.com")).toBe(true);
    expect(isValidEmail("ana@ejemplo")).toBe(false);
  });

  it("returns error codes for passwords and names", () => {
    expect(passwordError(undefined)).toBe("REQUIRED");
    expect(passwordError("1234567")).toBe("TOO_SHORT");
    expect(passwordError("x".repeat(129))).toBe("TOO_LONG");
    expect(passwordError("12345678")).toBeNull();
    expect(nameError("   ")).toBe("REQUIRED");
    expect(nameError("x".repeat(61))).toBe("TOO_LONG");
    expect(nameError("Ana")).toBeNull();
  });
});

describe("rate limit", () => {
  it("blocks after max hits per key", () => {
    const isLimited = createRateLimiter({ windowMs: 60_000, max: 2 });
    expect(isLimited("1.1.1.1")).toBe(false);
    expect(isLimited("1.1.1.1")).toBe(false);
    expect(isLimited("1.1.1.1")).toBe(true);
    expect(isLimited("2.2.2.2")).toBe(false);
  });

  it("reads the first forwarded IP", () => {
    const request = new Request("http://x", {
      headers: { "x-forwarded-for": "9.9.9.9, 10.0.0.1" },
    });
    expect(clientIp(request)).toBe("9.9.9.9");
    expect(clientIp(new Request("http://x"))).toBe("unknown");
  });
});
