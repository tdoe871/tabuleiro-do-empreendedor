import { NextResponse, type NextRequest } from "next/server";
import { BOARD_PHASES, Prisma, prisma } from "@tdoe/db";

import {
  parseCreateEventBody,
  toEventDTO,
} from "@/features/event/server/event";
import { asStaff, recordActivity } from "@/features/activity/server/record";
import { apiError, readJsonObject } from "@/lib/api/errors";
import { getStaffFromRequest } from "@/lib/auth/staff";
import { generateCode } from "@/lib/codes";

const MAX_CODE_ATTEMPTS = 5;

// POST /api/events — the educator creates a session. The backend generates
// the join code and creates the standard board (4 keys × 3 phases).
// Body: { titulo, modo, cenario, numEquipes, integrantes }. See docs/backend/api.md.
export async function POST(request: NextRequest) {
  const staff = await getStaffFromRequest(request);
  if (!staff) return apiError("UNAUTHORIZED");

  const body = await readJsonObject(request);
  if (!body) return apiError("VALIDATION_ERROR");
  const parsed = parseCreateEventBody(body);
  if (!parsed.ok) return apiError("VALIDATION_ERROR", parsed.fields);

  for (let attempt = 1; attempt <= MAX_CODE_ATTEMPTS; attempt++) {
    try {
      const event = await prisma.event.create({
        data: {
          ...parsed.data,
          code: generateCode(),
          hostId: staff.id,
          phases: { createMany: { data: BOARD_PHASES } },
        },
      });
      await recordActivity({
        ...asStaff(staff, event.id),
        action: "EVENT_CREATED",
        details: {
          mode: toEventDTO(event).mode,
          maxTeams: event.maxTeams,
          maxTeamSize: event.maxTeamSize,
          durationMinutes: event.durationMinutes,
        },
      });
      return NextResponse.json({ event: toEventDTO(event) }, { status: 201 });
    } catch (error) {
      // Code collision (32^6 ≈ 1e9 combinations, so very rare): try another.
      const collision =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002";
      if (collision && attempt < MAX_CODE_ATTEMPTS) continue;
      console.error("Create event failed:", error);
      return apiError("INTERNAL_ERROR");
    }
  }
  return apiError("INTERNAL_ERROR");
}

// GET /api/events — the educator's own sessions, newest first.
export async function GET(request: NextRequest) {
  const staff = await getStaffFromRequest(request);
  if (!staff) return apiError("UNAUTHORIZED");

  try {
    const events = await prisma.event.findMany({
      where: { hostId: staff.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ events: events.map(toEventDTO) });
  } catch (error) {
    console.error("List events failed:", error);
    return apiError("INTERNAL_ERROR");
  }
}
