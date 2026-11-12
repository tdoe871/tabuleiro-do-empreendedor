import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@tdoe/db";

import { loadOwnedEvent } from "@/features/event/server/owned-event";
import { asStaff, recordActivity } from "@/features/activity/server/record";
import { apiError } from "@/lib/api/errors";

type Context = { params: Promise<{ id: string; mentorId: string }> };

// DELETE /api/events/:id/mentors/:mentorId — the educator removes a mentor
// (wrong person joined with the shared code, or they are done). Deleting
// the row ends their session on their next request (getMentorFromToken
// re-checks the database) and, by cascade, removes every evaluation they
// made — their grades stop counting toward each team's average. 204.
export async function DELETE(request: NextRequest, { params }: Context) {
  const { id, mentorId } = await params;
  const loaded = await loadOwnedEvent(request, id);
  if ("error" in loaded) return loaded.error;

  try {
    const { count } = await prisma.mentor.deleteMany({
      where: { id: mentorId, eventId: loaded.event.id },
    });
    if (count === 0) return apiError("MENTOR_NOT_FOUND");
    await recordActivity({
      ...asStaff(loaded.staff, loaded.event.id),
      action: "MENTOR_REMOVED",
      details: { mentorId },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Remove mentor failed:", error);
    return apiError("INTERNAL_ERROR");
  }
}
