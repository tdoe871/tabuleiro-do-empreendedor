import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@tdoe/db";

import {
  parseActivityBody,
  toActivityTimerDTO,
} from "@/features/event/server/controls";
import {
  loadOwnedEvent,
  notifyEventChanged,
} from "@/features/event/server/owned-event";
import { asStaff, recordActivity } from "@/features/activity/server/record";
import { apiError, readJsonObject } from "@/lib/api/errors";

type Context = { params: Promise<{ id: string }> };

// The educator's activity timer: a short countdown on top of the event
// clock (presets 5/15/20/30 min in the panel). Players see it in
// GET /api/board while it is visible. Not available once the event ends.

// PUT /api/events/:id/activity-timer — start (or restart) it.
// Body: { minutes: 1-180, visible? }. `visible` keeps its value if omitted.
export async function PUT(request: NextRequest, { params }: Context) {
  const loaded = await loadOwnedEvent(request, (await params).id);
  if ("error" in loaded) return loaded.error;
  const { event, staff } = loaded;
  if (event.status === "FINISHED") return apiError("EVENT_FINISHED");

  const body = await readJsonObject(request);
  if (!body) return apiError("VALIDATION_ERROR");
  const parsed = parseActivityBody(body);
  if (!parsed.ok) return apiError("VALIDATION_ERROR", parsed.fields);

  try {
    const seconds = parsed.data.minutes * 60;
    const updated = await prisma.event.update({
      where: { id: event.id },
      data: {
        activityEndsAt: new Date(Date.now() + seconds * 1000),
        activitySeconds: seconds,
        ...(parsed.data.visible !== null
          ? { activityVisible: parsed.data.visible }
          : {}),
      },
    });
    notifyEventChanged(event.id);
    await recordActivity({
      ...asStaff(staff, event.id),
      action: "ACTIVITY_TIMER_STARTED",
      details: {
        minutes: parsed.data.minutes,
        visible: updated.activityVisible,
      },
    });
    return NextResponse.json({
      serverNow: new Date().toISOString(),
      activityTimer: toActivityTimerDTO(updated),
    });
  } catch (error) {
    console.error("Start activity timer failed:", error);
    return apiError("INTERNAL_ERROR");
  }
}

// PATCH /api/events/:id/activity-timer — show or hide it for players.
// Body: { visible }. Works with the timer stopped too (the choice is kept).
export async function PATCH(request: NextRequest, { params }: Context) {
  const loaded = await loadOwnedEvent(request, (await params).id);
  if ("error" in loaded) return loaded.error;
  const { event, staff } = loaded;

  const body = await readJsonObject(request);
  if (!body || typeof body.visible !== "boolean") {
    return apiError("VALIDATION_ERROR", { visible: "INVALID" });
  }

  try {
    const updated = await prisma.event.update({
      where: { id: event.id },
      data: { activityVisible: body.visible },
    });
    notifyEventChanged(event.id);
    await recordActivity({
      ...asStaff(staff, event.id),
      action: "ACTIVITY_TIMER_VISIBILITY_CHANGED",
      details: { visible: updated.activityVisible },
    });
    return NextResponse.json({
      serverNow: new Date().toISOString(),
      activityTimer: toActivityTimerDTO(updated),
      visible: updated.activityVisible,
    });
  } catch (error) {
    console.error("Toggle activity timer failed:", error);
    return apiError("INTERNAL_ERROR");
  }
}

// DELETE /api/events/:id/activity-timer — stop it. 204.
export async function DELETE(request: NextRequest, { params }: Context) {
  const loaded = await loadOwnedEvent(request, (await params).id);
  if ("error" in loaded) return loaded.error;

  try {
    await prisma.event.update({
      where: { id: loaded.event.id },
      data: { activityEndsAt: null, activitySeconds: null },
    });
    notifyEventChanged(loaded.event.id);
    await recordActivity({
      ...asStaff(loaded.staff, loaded.event.id),
      action: "ACTIVITY_TIMER_STOPPED",
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Stop activity timer failed:", error);
    return apiError("INTERNAL_ERROR");
  }
}
