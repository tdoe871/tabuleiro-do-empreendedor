// Account rules shared by the staff auth endpoints. No server dependencies,
// so forms can import them too.

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;
export const MAX_NAME_LENGTH = 60;

const MAX_EMAIL_LENGTH = 254;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function isValidEmail(email: string): boolean {
  return email.length <= MAX_EMAIL_LENGTH && EMAIL_PATTERN.test(email);
}

// Error code for the `fields` map of VALIDATION_ERROR, or null if valid.
export function passwordError(
  password: unknown,
): "REQUIRED" | "TOO_SHORT" | "TOO_LONG" | null {
  if (typeof password !== "string" || password.length === 0) return "REQUIRED";
  if (password.length < MIN_PASSWORD_LENGTH) return "TOO_SHORT";
  if (password.length > MAX_PASSWORD_LENGTH) return "TOO_LONG";
  return null;
}

export function nameError(name: unknown): "REQUIRED" | "TOO_LONG" | null {
  if (typeof name !== "string" || name.trim().length === 0) return "REQUIRED";
  if (name.trim().length > MAX_NAME_LENGTH) return "TOO_LONG";
  return null;
}
