import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@tdoe/db";

import {
  loadOwnedEvent,
  notifyAnnouncementsChanged,
} from "@/features/event/server/owned-event";
import { apiError } from "@/lib/api/errors";

type Context = { params: Promise<{ id: string; announcementId: string }> };

// DELETE /api/events/:id/announcements/:announcementId — take one back (a
// typo, wrong time). It disappears from every screen. 204.
export async function DELETE(request: NextRequest, { params }: Context) {
  const { id, announcementId } = await params;
  const loaded = await loadOwnedEvent(request, id);
  if ("error" in loaded) return loaded.error;

  try {
    const { count } = await prisma.announcement.deleteMany({
      where: { id: announcementId, eventId: loaded.event.id },
    });
    if (count === 0) return apiError("ANNOUNCEMENT_NOT_FOUND");
    notifyAnnouncementsChanged(loaded.event.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Delete announcement failed:", error);
    return apiError("INTERNAL_ERROR");
  }
}
