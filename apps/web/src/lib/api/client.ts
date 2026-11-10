// Shared helpers for calling our own API routes from client components:
// same JSON-body convention and error-code translation on every screen
// (see docs/backend/api.md section 1 and 6).

export async function sendJson(
  url: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<Response> {
  return fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export type ApiErrorBody = {
  error?: string;
  fields?: Record<string, string>;
};

export async function readApiError(
  res: Response,
): Promise<ApiErrorBody | null> {
  return (await res.json().catch(() => null)) as ApiErrorBody | null;
}

// `tCommon` is the `useTranslations("common")` result from the caller — a
// plain function here keeps this usable from any component without
// breaking the rules of hooks.
export function translateApiError(
  tCommon: { has: (key: string) => boolean } & ((key: string) => string),
  code: string | undefined,
  fallback: string,
): string {
  return code && tCommon.has(`errors.${code}`)
    ? tCommon(`errors.${code}`)
    : fallback;
}
