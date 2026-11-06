/**
 * @jest-environment node
 */
import {
  MAX_EXTRA_LINKS,
  MAX_FILE_SIZE_BYTES,
  canSubmit,
  matchesSignature,
  parseHttpsUrl,
  parseSubmissionBody,
  parseUploadRequest,
  sanitizeFileName,
} from "@/features/submission/server/rules";

const bytes = (...values: number[]) => new Uint8Array(values);
const ascii = (text: string) => new TextEncoder().encode(text);

describe("matchesSignature", () => {
  it("recognizes each allowed format by its first bytes", () => {
    expect(matchesSignature("pdf", ascii("%PDF-1.7\n"))).toBe(true);
    expect(matchesSignature("docx", bytes(0x50, 0x4b, 0x03, 0x04, 0x14))).toBe(
      true,
    );
    expect(
      matchesSignature(
        "doc",
        bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1),
      ),
    ).toBe(true);
    expect(
      matchesSignature(
        "png",
        bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a),
      ),
    ).toBe(true);
    expect(matchesSignature("jpg", bytes(0xff, 0xd8, 0xff, 0xe0))).toBe(true);
    expect(matchesSignature("webp", ascii("RIFF\0\0\0\0WEBPVP8 "))).toBe(true);
  });

  it("rejects content that does not match the extension", () => {
    expect(matchesSignature("pdf", ascii("<html><script>"))).toBe(false);
    expect(matchesSignature("pdf", bytes(0x50, 0x4b, 0x03, 0x04))).toBe(false);
    expect(matchesSignature("png", ascii("%PDF-1.7"))).toBe(false);
    expect(matchesSignature("webp", ascii("RIFF\0\0\0\0AVI "))).toBe(false);
  });
});

describe("parseUploadRequest", () => {
  const pdf = {
    fileName: "pitch.pdf",
    contentType: "application/pdf",
    size: 1000,
  };

  it("accepts an allowed file", () => {
    expect(parseUploadRequest(pdf)).toEqual({
      ok: true,
      fileName: "pitch.pdf",
      ext: "pdf",
      contentType: "application/pdf",
      size: 1000,
    });
    expect(
      parseUploadRequest({
        fileName: "Propuesta Final.DOCX",
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        size: 5,
      }),
    ).toMatchObject({ ok: true, ext: "docx" });
  });

  it("rejects other types, mismatched types and big files", () => {
    expect(parseUploadRequest({ ...pdf, fileName: "virus.exe" })).toEqual({
      ok: false,
      error: "FILE_TYPE_NOT_ALLOWED",
    });
    expect(parseUploadRequest({ ...pdf, contentType: "image/png" })).toEqual({
      ok: false,
      error: "FILE_TYPE_NOT_ALLOWED",
    });
    expect(parseUploadRequest({ ...pdf, fileName: "sin-extension" })).toEqual({
      ok: false,
      error: "FILE_TYPE_NOT_ALLOWED",
    });
    expect(
      parseUploadRequest({ ...pdf, size: MAX_FILE_SIZE_BYTES + 1 }),
    ).toEqual({ ok: false, error: "FILE_TOO_LARGE" });
  });

  it("reports missing fields", () => {
    expect(parseUploadRequest({ size: 0 })).toEqual({
      ok: false,
      error: "VALIDATION_ERROR",
      fields: {
        fileName: "REQUIRED",
        contentType: "REQUIRED",
        size: "INVALID",
      },
    });
  });
});

describe("sanitizeFileName", () => {
  it("removes path separators and control characters", () => {
    expect(sanitizeFileName("../../etc/passwd.pdf")).toBe("....etcpasswd.pdf");
    expect(sanitizeFileName("a\u0000b\nc.pdf")).toBe("abc.pdf");
    expect(sanitizeFileName("   ")).toBe("archivo");
  });
});

describe("parseHttpsUrl", () => {
  it("accepts https links only", () => {
    expect(parseHttpsUrl(" https://mi-app.vercel.app ")).toBe(
      "https://mi-app.vercel.app/",
    );
    expect(parseHttpsUrl("http://mi-app.com")).toBeNull();
    expect(parseHttpsUrl("javascript:alert(1)")).toBeNull();
    expect(parseHttpsUrl("no es un link")).toBeNull();
    expect(parseHttpsUrl(42)).toBeNull();
  });
});

describe("parseSubmissionBody", () => {
  it("requires a link for link deliveries", () => {
    expect(parseSubmissionBody({ type: "DEPLOY_LINK" })).toEqual({
      ok: false,
      fields: { url: "REQUIRED" },
    });
    expect(
      parseSubmissionBody({ type: "REPO_LINK", url: "http://github.com/x" }),
    ).toEqual({ ok: false, fields: { url: "INVALID_URL" } });
  });

  it("accepts extra https links up to the limit", () => {
    const ok = parseSubmissionBody({
      type: "DEPLOY_LINK",
      url: "https://app.vercel.app",
      links: ["https://github.com/team/app", "https://youtu.be/demo"],
      description: "  Nuestra app  ",
    });
    expect(ok).toEqual({
      ok: true,
      data: {
        type: "DEPLOY_LINK",
        url: "https://app.vercel.app/",
        links: ["https://github.com/team/app", "https://youtu.be/demo"],
        description: "Nuestra app",
      },
    });
    expect(
      parseSubmissionBody({
        type: "NONE",
        links: Array(MAX_EXTRA_LINKS + 1).fill("https://a.com"),
      }),
    ).toEqual({ ok: false, fields: { links: "INVALID" } });
    expect(
      parseSubmissionBody({ type: "NONE", links: ["ftp://a.com"] }),
    ).toEqual({ ok: false, fields: { links: "INVALID_URL" } });
  });

  it("does not need a link for file or empty deliveries", () => {
    expect(parseSubmissionBody({ type: "FILE_OR_IMAGE" }).ok).toBe(true);
    expect(parseSubmissionBody({ type: "NONE" }).ok).toBe(true);
    expect(parseSubmissionBody({ type: "OTHER" })).toEqual({
      ok: false,
      fields: { type: "INVALID" },
    });
  });
});

describe("canSubmit", () => {
  it("turns the end of the event into DEADLINE_PASSED", () => {
    expect(canSubmit("ok")).toBe("ok");
    expect(canSubmit("EVENT_NOT_ACTIVE")).toBe("EVENT_NOT_ACTIVE");
    expect(canSubmit("EVENT_FINISHED")).toBe("DEADLINE_PASSED");
  });
});
