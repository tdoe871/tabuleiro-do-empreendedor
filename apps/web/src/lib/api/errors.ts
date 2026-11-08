import { NextResponse } from "next/server";

// Error codes from docs/backend/api.md (section 5). The frontend translates
// them; never return user-facing text from the API.
export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "INVALID_CREDENTIALS"
  | "FORBIDDEN"
  | "EVENT_NOT_FOUND"
  | "TEAM_NOT_FOUND"
  | "EMAIL_TAKEN"
  | "TEAM_NAME_TAKEN"
  | "TEAM_FULL"
  | "EVENT_FULL"
  | "EVENT_NOT_ACTIVE"
  | "EVENT_FINISHED"
  | "CHAT_DISABLED"
  | "SUBMISSIONS_DISABLED"
  | "JOINS_DISABLED"
  | "KEY_LOCKED"
  | "PHASE_LOCKED"
  | "DEADLINE_PASSED"
  | "FILE_NOT_FOUND"
  | "ANNOUNCEMENT_NOT_FOUND"
  | "FILE_NOT_UPLOADED"
  | "FILE_TYPE_NOT_ALLOWED"
  | "FILE_TOO_LARGE"
  | "TOO_MANY_FILES"
  | "TOO_MANY_MENTORS"
  | "INVALID_STATUS_TRANSITION"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

const STATUS: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  INVALID_CREDENTIALS: 401,
  FORBIDDEN: 403,
  EVENT_NOT_FOUND: 404,
  TEAM_NOT_FOUND: 404,
  EMAIL_TAKEN: 409,
  TEAM_NAME_TAKEN: 409,
  TEAM_FULL: 409,
  EVENT_FULL: 409,
  EVENT_NOT_ACTIVE: 409,
  EVENT_FINISHED: 409,
  CHAT_DISABLED: 409,
  SUBMISSIONS_DISABLED: 409,
  JOINS_DISABLED: 409,
  KEY_LOCKED: 409,
  PHASE_LOCKED: 409,
  DEADLINE_PASSED: 409,
  FILE_NOT_FOUND: 404,
  ANNOUNCEMENT_NOT_FOUND: 404,
  FILE_NOT_UPLOADED: 409,
  FILE_TYPE_NOT_ALLOWED: 400,
  FILE_TOO_LARGE: 400,
  TOO_MANY_FILES: 409,
  TOO_MANY_MENTORS: 409,
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

// Thrown inside a transaction to abort it with an API error code; the route
// catches it and answers with apiError(code).
export class ApiFailure extends Error {
  constructor(readonly code: ApiErrorCode) {
    super(code);
  }
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
