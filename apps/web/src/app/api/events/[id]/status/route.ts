import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@tdoe/db";

import {
  isStatusTarget,
  planStatusChange,
  toEventDTO,
} from "@/features/event/server/event";
import { apiError, readJsonObject } from "@/lib/api/errors";
import { getStaffFromRequest } from "@/lib/auth/staff";

// PATCH /api/events/:id/status — start, pause, resume or finish a session.
// Body: { status: "ACTIVE" | "PAUSED" | "FINISHED" }. Rules in
// planStatusChange (features/event/server/event.ts).
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const staff = await getStaffFromRequest(request);
  if (!staff) return apiError("UNAUTHORIZED");

  const body = await readJsonObject(request);
  if (!body || !isStatusTarget(body.status)) {
    return apiError("VALIDATION_ERROR", { status: "INVALID" });
  }

  const { id } = await params;
  try {
    // Another educator's event answers like a missing one, so ids cannot be
    // probed.
    const event = await prisma.event.findFirst({
      where: { id, hostId: staff.id },
    });
    if (!event) return apiError("EVENT_NOT_FOUND");

    const change = planStatusChange(event, body.status, new Date());
    if (!change.ok) return apiError("INVALID_STATUS_TRANSITION");
    if (change.noop) return NextResponse.json({ event: toEventDTO(event) });

    // Conditional on the status we read, so two clicks racing cannot apply
    // two transitions from the same starting point.
    const { count } = await prisma.event.updateMany({
      where: { id, status: event.status },
      data: change.data,
    });
    if (count === 0) return apiError("INVALID_STATUS_TRANSITION");

    const updated = await prisma.event.findUniqueOrThrow({ where: { id } });
    return NextResponse.json({ event: toEventDTO(updated) });
  } catch (error) {
    console.error("Change event status failed:", error);
    return apiError("INTERNAL_ERROR");
  }
}
