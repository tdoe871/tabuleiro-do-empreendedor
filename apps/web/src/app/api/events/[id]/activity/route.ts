import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@tdoe/db";

import {
  ACTIVITY_PAGE_SIZE,
  parseActivityQuery,
  toActivityDTO,
  withCurrentTeamName,
} from "@/features/activity/server/actions";
import { loadOwnedEvent } from "@/features/event/server/owned-event";
import { apiError } from "@/lib/api/errors";

// GET /api/events/:id/activity — the activity record, newest first, 100 at
// a time. ?before=<id> for the next (older) page, ?teamId=<id> for one team.
// The whole record as CSV: GET /api/events/:id/export?type=activity.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const query = parseActivityQuery(request.nextUrl.searchParams);
  if (!query.ok) return apiError("VALIDATION_ERROR", query.fields);

  const loaded = await loadOwnedEvent(request, (await params).id);
  if ("error" in loaded) return loaded.error;
  const { event } = loaded;
  const { before, teamId } = query.data;

  try {
    const [rows, teams] = await Promise.all([
      prisma.activityLog.findMany({
        where: {
          eventId: event.id,
          ...(teamId ? { teamId } : {}),
          ...(before ? { id: { lt: before } } : {}),
        },
        orderBy: { id: "desc" },
        take: ACTIVITY_PAGE_SIZE + 1,
      }),
      prisma.team.findMany({
        where: { eventId: event.id },
        select: { id: true, name: true },
      }),
    ]);
    const currentNames = new Map(teams.map((t) => [t.id, t.name]));
    const page = rows.slice(0, ACTIVITY_PAGE_SIZE);
    const hasMore = rows.length > ACTIVITY_PAGE_SIZE;
    return NextResponse.json({
      serverNow: new Date().toISOString(),
      activity: page.map((row) =>
        toActivityDTO(withCurrentTeamName(row, currentNames), event.startedAt),
      ),
      hasMore,
      // Pass as ?before= for the next page.
      cursor: hasMore ? page[page.length - 1]!.id : null,
    });
  } catch (error) {
    console.error("Activity record failed:", error);
    return apiError("INTERNAL_ERROR");
  }
}
