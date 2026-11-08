import { NextResponse, type NextRequest } from "next/server";
import { Prisma, prisma } from "@tdoe/db";

import {
  MAX_MENTORS_PER_EVENT,
  mentorNameError,
} from "@/features/mentor/server/rubric";
import { normalizeCode, sameName } from "@/features/team/server/team";
import { ApiFailure, apiError, readJsonObject } from "@/lib/api/errors";
import { setMentorSessionCookie } from "@/lib/auth/mentor";
import { clientIp, createRateLimiter } from "@/lib/auth/rate-limit";

const isRateLimited = createRateLimiter({ windowMs: 5 * 60 * 1000, max: 60 });

// POST /api/mentors — a mentor enters an event with the code the educator
// shared. Body: { mentorCode, name }. Sets the mentor session.
//
// Coming back with a name already in the event recovers that mentor's
// session (200 with `recovered: true`), like players do. Mentors can enter
// at any status, also after the event ends, to finish grading.
export async function POST(request: NextRequest) {
  const body = await readJsonObject(request);
  if (!body) return apiError("VALIDATION_ERROR");

  const mentorCode = normalizeCode(body.mentorCode);
  const fields: Record<string, string> = {};
  const nameError = mentorNameError(body.name);
  if (!mentorCode) fields.mentorCode = "REQUIRED";
  if (nameError) fields.name = nameError;
  if (Object.keys(fields).length > 0) {
    return apiError("VALIDATION_ERROR", fields);
  }
  const name = String(body.name).trim();

  if (isRateLimited(clientIp(request))) return apiError("RATE_LIMITED");

  try {
    let joined;
    try {
      joined = await enter(mentorCode, name);
    } catch (error) {
      // Same name entered twice at the same moment: the unique index stops
      // the second insert, and trying again recovers the saved mentor.
      const race =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002";
      if (!race) throw error;
      joined = await enter(mentorCode, name);
    }

    const response = NextResponse.json(
      {
        mentor: { id: joined.mentor.id, name: joined.mentor.name },
        event: { name: joined.event.name, status: joined.event.status },
        ...(joined.recovered ? { recovered: true } : {}),
      },
      { status: joined.recovered ? 200 : 201 },
    );
    await setMentorSessionCookie(response, joined.mentor);
    return response;
  } catch (error) {
    if (error instanceof ApiFailure) return apiError(error.code);
    console.error("Mentor join failed:", error);
    return apiError("INTERNAL_ERROR");
  }
}

function enter(mentorCode: string, name: string) {
  return prisma.$transaction(async (tx) => {
    // Lock the event row so the mentor limit cannot be passed by two people
    // entering at once.
    await tx.$queryRaw`SELECT id FROM "Event" WHERE "mentorCode" = ${mentorCode} FOR UPDATE`;
    const event = await tx.event.findUnique({
      where: { mentorCode },
      include: { mentors: true },
    });
    if (!event) throw new ApiFailure("EVENT_NOT_FOUND");

    const existing = event.mentors.find((m) => sameName(m.name, name));
    if (existing) return { mentor: existing, event, recovered: true };

    if (event.mentors.length >= MAX_MENTORS_PER_EVENT) {
      throw new ApiFailure("TOO_MANY_MENTORS");
    }
    const mentor = await tx.mentor.create({
      data: { eventId: event.id, name },
    });
    return { mentor, event, recovered: false };
  });
}
