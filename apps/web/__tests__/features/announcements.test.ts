/**
 * @jest-environment node
 */
import {
  MAX_ANNOUNCEMENT_LENGTH,
  parseAnnouncementBody,
  toAnnouncementDTO,
} from "@/features/event/server/announcements";

describe("announcements", () => {
  it("accepts a trimmed text", () => {
    expect(parseAnnouncementBody({ text: "  Lunch is ready  " })).toEqual({
      ok: true,
      text: "Lunch is ready",
    });
    expect(
      parseAnnouncementBody({ text: "a".repeat(MAX_ANNOUNCEMENT_LENGTH) }).ok,
    ).toBe(true);
  });

  it("rejects empty, missing and long texts", () => {
    for (const text of ["", "   ", undefined, 42]) {
      expect(parseAnnouncementBody({ text })).toEqual({
        ok: false,
        fields: { text: "REQUIRED" },
      });
    }
    expect(
      parseAnnouncementBody({ text: "a".repeat(MAX_ANNOUNCEMENT_LENGTH + 1) }),
    ).toEqual({ ok: false, fields: { text: "TOO_LONG" } });
  });

  it("builds the DTO", () => {
    const createdAt = new Date("2026-11-12T15:00:00Z");
    expect(toAnnouncementDTO({ id: "a1", text: "Hi", createdAt })).toEqual({
      id: "a1",
      text: "Hi",
      createdAt: createdAt.toISOString(),
    });
  });
});
