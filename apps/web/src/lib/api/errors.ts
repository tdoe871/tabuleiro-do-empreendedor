import { NextResponse } from "next/server";

// Error codes from docs/backend/api.md (section 5). The frontend translates
// them; never return user-facing text from the API.
export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "INVALID_CREDENTIALS"
  | "EMAIL_TAKEN"
  | "EVENT_NOT_FOUND"
  | "INVALID_STATUS_TRANSITION"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

const STATUS: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  INVALID_CREDENTIALS: 401,
  EVENT_NOT_FOUND: 404,
  EMAIL_TAKEN: 409,
  INVALID_STATUS_TRANSITION: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

export function apiError(
  error: ApiErrorCode,
  fields?: Record<string, string>,
): NextResponse {
  return NextResponse.json(fields ? { error, fields } : { error }, {
    status: STATUS[error],
  });
}

// Parses a JSON object body; null when the body is missing or not an object.
export async function readJsonObject(
  request: Request,
): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
