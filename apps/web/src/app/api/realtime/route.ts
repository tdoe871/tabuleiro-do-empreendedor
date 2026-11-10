import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@tdoe/db";

import { apiError } from "@/lib/api/errors";
import { getPlayerFromRequest } from "@/lib/auth/player";
import { getStaffFromRequest } from "@/lib/auth/staff";
import {
  eventTopic,
  realtimeConfig,
  staffTopic,
  teamTopic,
} from "@/lib/realtime/server";

// GET /api/realtime — how the browser listens for changes: the provider, its
// public settings and the topics this session may follow.
// Player: no query (their team and event). Educator: ?eventId=<id> of one of
// their events.
export async function GET(request: NextRequest) {
  const eventId = request.nextUrl.searchParams.get("eventId");

  try {
    if (eventId) {
      const staff = await getStaffFromRequest(request);
      if (!staff) return apiError("UNAUTHORIZED");
      const event = await prisma.event.findFirst({
        where: { id: eventId, hostId: staff.id },
        select: { id: true },
      });
      if (!event) return apiError("EVENT_NOT_FOUND");
      return NextResponse.json(
        realtimeConfig([staffTopic(event.id), eventTopic(event.id)]),
      );
    }

    const player = await getPlayerFromRequest(request);
    if (!player) return apiError("UNAUTHORIZED");
    return NextResponse.json(
      realtimeConfig([teamTopic(player.team.id), eventTopic(player.event.id)]),
    );
  } catch (error) {
    console.error("Realtime config failed:", error);
    return apiError("INTERNAL_ERROR");
  }
}
