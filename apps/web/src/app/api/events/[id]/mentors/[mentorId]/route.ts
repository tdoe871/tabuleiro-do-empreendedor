import { NextResponse, type NextRequest } from "next/server";
import { INTERACTIVE_TX, Prisma, prisma } from "@tdoe/db";

import { loadOwnedEvent } from "@/features/event/server/owned-event";
import { asStaff, recordActivity } from "@/features/activity/server/record";
import { apiError } from "@/lib/api/errors";
import { generateCode } from "@/lib/codes";
import { notify, staffTopic } from "@/lib/realtime/server";

type Context = { params: Promise<{ id: string; mentorId: string }> };

const MAX_CODE_ATTEMPTS = 5;

// DELETE /api/events/:id/mentors/:mentorId — the educator removes a mentor
// (wrong person joined with the shared code, or they are done). Deleting
// the row ends their session on their next request (getMentorFromToken
// re-checks the database) and, by cascade, removes every evaluation they
// made — their grades stop counting toward each team's average. 204.
//
// The removed mentor knew the mentor code, so the same transaction replaces
// it: they cannot come back in with it. Mentors already in keep their
// session; the educator shares the new code only with whoever still needs
// to enter.
export async function DELETE(request: NextRequest, { params }: Context) {
  const { id, mentorId } = await params;
  const loaded = await loadOwnedEvent(request, id);
  if ("error" in loaded) return loaded.error;
  const eventId = loaded.event.id;

  for (let attempt = 1; attempt <= MAX_CODE_ATTEMPTS; attempt++) {
    try {
      const removed = await prisma.$transaction(async (tx) => {
        const { count } = await tx.mentor.deleteMany({
          where: { id: mentorId, eventId },
        });
        if (count === 0) return false;
        await tx.event.update({
          where: { id: eventId },
          data: { mentorCode: generateCode() },
        });
        return true;
      }, INTERACTIVE_TX);
      if (!removed) return apiError("MENTOR_NOT_FOUND");

      notify({ topic: staffTopic(eventId), signal: "overview" });
      await recordActivity(
        {
          ...asStaff(loaded.staff, eventId),
          action: "MENTOR_REMOVED",
          details: { mentorId },
        },
        { ...asStaff(loaded.staff, eventId), action: "MENTOR_CODE_CHANGED" },
      );
      return new NextResponse(null, { status: 204 });
    } catch (error) {
      // The new code is already another event's (32^6 codes, very rare): the
      // transaction rolled back, so try again with another code.
      const collision =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002";
      if (collision && attempt < MAX_CODE_ATTEMPTS) continue;
      console.error("Remove mentor failed:", error);
      return apiError("INTERNAL_ERROR");
    }
  }
  return apiError("INTERNAL_ERROR");
}
