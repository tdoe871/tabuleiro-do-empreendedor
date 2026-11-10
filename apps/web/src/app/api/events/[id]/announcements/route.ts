import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@tdoe/db";

import {
  ANNOUNCEMENTS_PER_MINUTE,
  MAX_ANNOUNCEMENTS_LISTED,
  parseAnnouncementBody,
  toAnnouncementDTO,
} from "@/features/event/server/announcements";
import {
  loadOwnedEvent,
  notifyAnnouncementsChanged,
} from "@/features/event/server/owned-event";
import { asStaff, recordActivity } from "@/features/activity/server/record";
import { apiError, readJsonObject } from "@/lib/api/errors";
import { createRateLimiter } from "@/lib/auth/rate-limit";

type Context = { params: Promise<{ id: string }> };

const isRateLimited = createRateLimiter({
  windowMs: 60_000,
  max: ANNOUNCEMENTS_PER_MINUTE,
});

// The educator's announcements to the whole event. Players get the newest
// ones in GET /api/board, mentors in GET /api/mentor and the educator in the
// overview.

// GET /api/events/:id/announcements — every announcement, newest first.
export async function GET(request: NextRequest, { params }: Context) {
  const loaded = await loadOwnedEvent(request, (await params).id);
  if ("error" in loaded) return loaded.error;

  try {
    const announcements = await prisma.announcement.findMany({
      where: { eventId: loaded.event.id },
      orderBy: { createdAt: "desc" },
      take: MAX_ANNOUNCEMENTS_LISTED,
    });
    return NextResponse.json({
      announcements: announcements.map(toAnnouncementDTO),
    });
  } catch (error) {
    console.error("List announcements failed:", error);
    return apiError("INTERNAL_ERROR");
  }
}

// POST /api/events/:id/announcements — send one. Body: { text }. 201.
// Allowed in any status: before starting ("we start at 9") and after
// finishing ("results at 6 pm") too.
export async function POST(request: NextRequest, { params }: Context) {
  const loaded = await loadOwnedEvent(request, (await params).id);
  if ("error" in loaded) return loaded.error;
  const { event, staff } = loaded;

  const body = await readJsonObject(request);
  if (!body) return apiError("VALIDATION_ERROR");
  const parsed = parseAnnouncementBody(body);
  if (!parsed.ok) return apiError("VALIDATION_ERROR", parsed.fields);

  if (isRateLimited(event.hostId)) return apiError("RATE_LIMITED");

  try {
    const announcement = await prisma.announcement.create({
      data: { eventId: event.id, text: parsed.text },
    });
    notifyAnnouncementsChanged(event.id);
    await recordActivity({
      ...asStaff(staff, event.id),
      action: "ANNOUNCEMENT_SENT",
      details: { announcementId: announcement.id },
    });
    return NextResponse.json(
      { announcement: toAnnouncementDTO(announcement) },
      { status: 201 },
    );
  } catch (error) {
    console.error("Send announcement failed:", error);
    return apiError("INTERNAL_ERROR");
  }
}
