import type { Announcement } from "@tdoe/db";

// The educator's announcements to the whole event. Pure functions (no
// database access) so they can be unit-tested; the limits are defaults while
// the team decides.

export const MAX_ANNOUNCEMENT_LENGTH = 1000;
// How many of the newest announcements players, mentors and the overview get.
export const ANNOUNCEMENTS_SHOWN = 20;
// The educator's full list (GET /api/events/:id/announcements).
export const MAX_ANNOUNCEMENTS_LISTED = 200;
// Per educator, to stop a stuck button from flooding every screen.
export const ANNOUNCEMENTS_PER_MINUTE = 10;

export type AnnouncementDTO = { id: string; text: string; createdAt: string };

// Body of POST /api/events/:id/announcements: { text }.
export function parseAnnouncementBody(
  body: Record<string, unknown>,
): { ok: true; text: string } | { ok: false; fields: Record<string, string> } {
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) return { ok: false, fields: { text: "REQUIRED" } };
  if (text.length > MAX_ANNOUNCEMENT_LENGTH) {
    return { ok: false, fields: { text: "TOO_LONG" } };
  }
  return { ok: true, text };
}

export function toAnnouncementDTO(
  announcement: Pick<Announcement, "id" | "text" | "createdAt">,
): AnnouncementDTO {
  return {
    id: announcement.id,
    text: announcement.text,
    createdAt: announcement.createdAt.toISOString(),
  };
}

// Newest first, for every screen that shows them.
export const NEWEST_ANNOUNCEMENTS = {
  orderBy: { createdAt: "desc" },
  take: ANNOUNCEMENTS_SHOWN,
  select: { id: true, text: true, createdAt: true },
} as const;
