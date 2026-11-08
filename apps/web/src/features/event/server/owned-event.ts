import type { NextRequest } from "next/server";
import { prisma, type Event } from "@tdoe/db";

import { apiError } from "@/lib/api/errors";
import { getStaffFromRequest } from "@/lib/auth/staff";
import { eventTopic, notify, staffTopic } from "@/lib/realtime/server";

// For the educator's event controls: the event behind :id if the session's
// educator owns it, or the error response to return. Another educator's
// event answers like a missing one.
export async function loadOwnedEvent(
  request: NextRequest,
  id: string,
): Promise<{ event: Event } | { error: Response }> {
  const staff = await getStaffFromRequest(request);
  if (!staff) return { error: apiError("UNAUTHORIZED") };
  const event = await prisma.event.findFirst({
    where: { id, hostId: staff.id },
  });
  if (!event) return { error: apiError("EVENT_NOT_FOUND") };
  return { event };
}

// Players refresh their board and the educator their overview.
export function notifyEventChanged(eventId: string): void {
  notify(
    { topic: eventTopic(eventId), signal: "event" },
    { topic: staffTopic(eventId), signal: "overview" },
  );
}
