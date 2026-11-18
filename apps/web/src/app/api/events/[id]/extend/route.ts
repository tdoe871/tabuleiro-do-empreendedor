import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@tdoe/db";

import {
  notifyEventChanged,
  loadOwnedEvent,
} from "@/features/event/server/owned-event";
import { planExtension, toEventDTO } from "@/features/event/server/event";
import { asStaff, recordActivity } from "@/features/activity/server/record";
import { apiError, readJsonObject } from "@/lib/api/errors";

type Context = { params: Promise<{ id: string }> };

const MAX_ATTEMPTS = 3;

// POST /api/events/:id/extend — the educator who owns the event gives every
// team more time. Body: { minutes } (1-720). Moves the end time later (or
// reopens the board from now if the time already ran out); the event can
// never last more than 48 h from its start. Rules in planExtension
// (features/event/server/event.ts). 200 with { event }.
export async function POST(request: NextRequest, { params }: Context) {
  const { id } = await params;
  const loaded = await loadOwnedEvent(request, id);
  if ("error" in loaded) return loaded.error;

  const body = await readJsonObject(request);
  if (!body) return apiError("VALIDATION_ERROR");

  try {
    let event = loaded.event;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const plan = planExtension(event, body.minutes, new Date());
      if (!plan.ok) return apiError(plan.error, plan.fields);

      // Conditional on the end time and status we read: two clicks at once
      // each add their minutes instead of one overwriting the other.
      const { count } = await prisma.event.updateMany({
        where: { id: event.id, status: event.status, endsAt: event.endsAt },
        data: { endsAt: plan.endsAt },
      });
      if (count === 1) {
        await recordActivity({
          ...asStaff(loaded.staff, event.id),
          action: "EVENT_EXTENDED",
          details: {
            minutes: body.minutes as number,
            from: event.endsAt?.toISOString() ?? null,
            to: plan.endsAt.toISOString(),
          },
        });
        // Players reload the board (it reopens if the time had run out) and
        // the educator the overview.
        notifyEventChanged(event.id);
        const updated = await prisma.event.findUniqueOrThrow({
          where: { id: event.id },
        });
        return NextResponse.json({ event: toEventDTO(updated) });
      }
      // Someone changed the event meanwhile: read it again and retry.
      const fresh = await prisma.event.findFirst({
        where: { id: event.id, hostId: loaded.staff.id },
      });
      if (!fresh) return apiError("EVENT_NOT_FOUND");
      event = fresh;
    }
    return apiError("INTERNAL_ERROR");
  } catch (error) {
    console.error("Extend event failed:", error);
    return apiError("INTERNAL_ERROR");
  }
}
