import type { SubmissionType } from "@tdoe/db";

// Rules for team deliveries. Pure functions (no database or Storage access)
// so they can be unit-tested. The limits are defaults while the team decides;
// changing a constant is enough.

export const MAX_FILES_PER_TEAM = 5;
export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
export const MAX_EXTRA_LINKS = 5;
export const MAX_URL_LENGTH = 2000;
export const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_FILE_NAME_LENGTH = 120;

type Signature = "pdf" | "zip" | "ole" | "png" | "jpeg" | "webp";

// Allowed files: PDF and Word (what the PM asked for), plus PowerPoint and
// images for teams that deliver a presentation or a picture.
export const ALLOWED_FILE_TYPES = {
  pdf: { contentType: "application/pdf", signature: "pdf" },
  doc: { contentType: "application/msword", signature: "ole" },
  docx: {
    contentType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    signature: "zip",
  },
  ppt: { contentType: "application/vnd.ms-powerpoint", signature: "ole" },
  pptx: {
    contentType:
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    signature: "zip",
  },
  png: { contentType: "image/png", signature: "png" },
  jpg: { contentType: "image/jpeg", signature: "jpeg" },
  jpeg: { contentType: "image/jpeg", signature: "jpeg" },
  webp: { contentType: "image/webp", signature: "webp" },
} as const satisfies Record<
  string,
  { contentType: string; signature: Signature }
>;

export type FileExtension = keyof typeof ALLOWED_FILE_TYPES;

export const ALLOWED_CONTENT_TYPES = [
  ...new Set(Object.values(ALLOWED_FILE_TYPES).map((t) => t.contentType)),
];

// Bytes needed to recognize every allowed format.
export const SIGNATURE_BYTES = 12;

function startsWith(bytes: Uint8Array, prefix: number[], offset = 0) {
  return prefix.every((byte, i) => bytes[offset + i] === byte);
}

const SIGNATURE_CHECKS: Record<Signature, (bytes: Uint8Array) => boolean> = {
  pdf: (b) => startsWith(b, [0x25, 0x50, 0x44, 0x46, 0x2d]), // %PDF-
  zip: (b) => startsWith(b, [0x50, 0x4b, 0x03, 0x04]), // PK.. (docx, pptx)
  ole: (b) => startsWith(b, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
  png: (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  jpeg: (b) => startsWith(b, [0xff, 0xd8, 0xff]),
  webp: (b) =>
    startsWith(b, [0x52, 0x49, 0x46, 0x46]) && // RIFF
    startsWith(b, [0x57, 0x45, 0x42, 0x50], 8), // WEBP
};

// Checks the real content (magic bytes), not just the name or the
// Content-Type the browser sent.
export function matchesSignature(ext: FileExtension, bytes: Uint8Array) {
  return SIGNATURE_CHECKS[ALLOWED_FILE_TYPES[ext].signature](bytes);
}

// Keeps the name readable for display and download, without path separators
// or control characters. It is never used to build the storage path.
export function sanitizeFileName(name: string): string {
  const clean = name
    .replace(/[\u0000-\u001f\u007f/\\]/g, "")
    .trim()
    .slice(-MAX_FILE_NAME_LENGTH);
  return clean || "archivo";
}

type UploadRequest =
  | {
      ok: true;
      fileName: string;
      ext: FileExtension;
      contentType: string;
      size: number;
    }
  | { ok: false; error: "VALIDATION_ERROR"; fields: Record<string, string> }
  | { ok: false; error: "FILE_TYPE_NOT_ALLOWED" | "FILE_TOO_LARGE" };

// Body of POST /api/submissions/files: { fileName, contentType, size }.
export function parseUploadRequest(
  body: Record<string, unknown>,
): UploadRequest {
  const fields: Record<string, string> = {};
  const fileName =
    typeof body.fileName === "string" ? sanitizeFileName(body.fileName) : "";
  if (typeof body.fileName !== "string" || !body.fileName.trim()) {
    fields.fileName = "REQUIRED";
  }
  if (typeof body.contentType !== "string" || !body.contentType) {
    fields.contentType = "REQUIRED";
  }
  if (!Number.isInteger(body.size) || (body.size as number) <= 0) {
    fields.size = "INVALID";
  }
  if (Object.keys(fields).length > 0) {
    return { ok: false, error: "VALIDATION_ERROR", fields };
  }

  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const type =
    ext in ALLOWED_FILE_TYPES
      ? ALLOWED_FILE_TYPES[ext as FileExtension]
      : undefined;
  // The extension and the declared type have to agree.
  if (!type || type.contentType !== body.contentType) {
    return { ok: false, error: "FILE_TYPE_NOT_ALLOWED" };
  }
  if ((body.size as number) > MAX_FILE_SIZE_BYTES) {
    return { ok: false, error: "FILE_TOO_LARGE" };
  }
  return {
    ok: true,
    fileName,
    ext: ext as FileExtension,
    contentType: type.contentType,
    size: body.size as number,
  };
}

// Only https links, so nothing like javascript: or plain http ends up in a
// page the educator opens.
export function parseHttpsUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_URL_LENGTH) return null;
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" && url.hostname ? url.toString() : null;
  } catch {
    return null;
  }
}

const SUBMISSION_TYPES: SubmissionType[] = [
  "DEPLOY_LINK",
  "REPO_LINK",
  "FILE_OR_IMAGE",
  "NONE",
];

export type SubmissionInput = {
  type: SubmissionType;
  url: string | null;
  links: string[];
  description: string | null;
};

// Body of PUT /api/submissions: { type, url?, links?, description? }.
// Whether FILE_OR_IMAGE has files is checked by the route (needs the DB).
export function parseSubmissionBody(
  body: Record<string, unknown>,
):
  | { ok: true; data: SubmissionInput }
  | { ok: false; fields: Record<string, string> } {
  const fields: Record<string, string> = {};

  const type = SUBMISSION_TYPES.includes(body.type as SubmissionType)
    ? (body.type as SubmissionType)
    : null;
  if (!type) fields.type = "INVALID";

  let url: string | null = null;
  const hasUrl = typeof body.url === "string" && body.url.trim() !== "";
  if (hasUrl) {
    url = parseHttpsUrl(body.url);
    if (!url) fields.url = "INVALID_URL";
  } else if (type === "DEPLOY_LINK" || type === "REPO_LINK") {
    fields.url = "REQUIRED";
  }

  const links: string[] = [];
  if (body.links !== undefined && body.links !== null) {
    if (!Array.isArray(body.links) || body.links.length > MAX_EXTRA_LINKS) {
      fields.links = "INVALID";
    } else {
      for (const link of body.links) {
        const parsed = parseHttpsUrl(link);
        if (!parsed) {
          fields.links = "INVALID_URL";
          break;
        }
        links.push(parsed);
      }
    }
  }

  let description: string | null = null;
  if (typeof body.description === "string" && body.description.trim()) {
    description = body.description.trim();
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      fields.description = "TOO_LONG";
    }
  }

  if (!type || Object.keys(fields).length > 0) return { ok: false, fields };
  return { ok: true, data: { type, url, links, description } };
}

// Deliveries follow the same window as the board (ACTIVE with time left);
// once the clock runs out the answer is DEADLINE_PASSED.
export function canSubmit(
  gate: "ok" | "EVENT_NOT_ACTIVE" | "EVENT_FINISHED",
): "ok" | "EVENT_NOT_ACTIVE" | "DEADLINE_PASSED" {
  return gate === "EVENT_FINISHED" ? "DEADLINE_PASSED" : gate;
}
