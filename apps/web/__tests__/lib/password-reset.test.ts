/**
 * @jest-environment node
 */
import {
  checkResetToken,
  generateResetToken,
  hashResetToken,
  isTokenShape,
  issuedBeforePasswordChange,
  resetLink,
} from "@/lib/auth/password-reset";
import {
  emailLocale,
  passwordResetEmail,
} from "@/lib/email/password-reset-email";

describe("password reset", () => {
  it("generates a random token and stores only its hash", () => {
    const a = generateResetToken();
    const b = generateResetToken();
    expect(isTokenShape(a.token)).toBe(true);
    expect(a.token).not.toBe(b.token);
    expect(a.tokenHash).toBe(hashResetToken(a.token));
    expect(a.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(a.tokenHash).not.toContain(a.token);
  });

  it("rejects values that cannot be a token", () => {
    for (const bad of [
      undefined,
      null,
      42,
      "",
      "short",
      "a".repeat(44),
      "!".repeat(43),
    ]) {
      expect(isTokenShape(bad)).toBe(false);
    }
  });

  it("accepts only unused links before they expire", () => {
    const now = new Date("2026-11-12T10:00:00Z");
    const later = new Date("2026-11-12T10:30:00Z");
    expect(checkResetToken({ expiresAt: later, usedAt: null }, now)).toBe("ok");
    expect(checkResetToken(null, now)).toBe("RESET_TOKEN_INVALID");
    expect(checkResetToken({ expiresAt: later, usedAt: now }, now)).toBe(
      "RESET_TOKEN_INVALID",
    );
    expect(checkResetToken({ expiresAt: now, usedAt: null }, now)).toBe(
      "RESET_TOKEN_EXPIRED",
    );
  });

  it("builds the link with the token in the fragment", () => {
    expect(resetLink("https://app.example/", "es", "abc")).toBe(
      "https://app.example/es/reset-password#token=abc",
    );
    expect(emailLocale("fr")).toBe("fr");
    expect(emailLocale("xx")).toBe("pt-BR");
    expect(emailLocale("toString")).toBe("pt-BR");
    expect(emailLocale(undefined)).toBe("pt-BR");
  });

  it("revokes sessions issued before the password changed", () => {
    const changed = new Date("2026-11-12T10:00:00.700Z");
    const second = Math.floor(changed.getTime() / 1000);
    expect(issuedBeforePasswordChange(second - 1, changed)).toBe(true);
    // Same second: the session created right after the change still works.
    expect(issuedBeforePasswordChange(second, changed)).toBe(false);
    expect(issuedBeforePasswordChange(second + 5, changed)).toBe(false);
    expect(issuedBeforePasswordChange(second - 100, null)).toBe(false);
    expect(issuedBeforePasswordChange(null, changed)).toBe(true);
  });

  it("writes the email in the chosen language and escapes the name", () => {
    const email = passwordResetEmail({
      to: "ana@example.com",
      name: "Ana <b>Souza</b>",
      link: "https://app.example/es/reset-password#token=abc",
      minutes: 60,
      locale: "es",
    });
    expect(email.to).toBe("ana@example.com");
    expect(email.subject).toContain("Restablece");
    expect(email.text).toContain("60 minutos");
    expect(email.text).toContain("#token=abc");
    expect(email.html).not.toContain("<b>");
    expect(
      passwordResetEmail({
        ...email,
        name: "Ana",
        link: "x",
        minutes: 60,
        locale: "en",
      }).subject,
    ).toContain("Reset");
  });
});
