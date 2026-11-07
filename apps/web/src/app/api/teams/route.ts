import { NextResponse, type NextRequest } from "next/server";
import { Prisma, prisma } from "@tdoe/db";

import {
  canJoinEvent,
  nicknameError,
  normalizeCode,
  sameName,
  teamNameError,
} from "@/features/team/server/team";
import { ApiFailure, apiError, readJsonObject } from "@/lib/api/errors";
import { setPlayerSessionCookie } from "@/lib/auth/player";
import { clientIp, createRateLimiter } from "@/lib/auth/rate-limit";
import { generateCode } from "@/lib/codes";
import { notify, staffTopic } from "@/lib/realtime/server";

const MAX_CODE_ATTEMPTS = 5;

// Generous on purpose: at the venue hundreds of people share one public IP.
const isRateLimited = createRateLimiter({ windowMs: 5 * 60 * 1000, max: 300 });

// POST /api/teams — a participant creates a team and becomes its LEADER.
// Body: { eventCode, name, nickname }. Sets the player session cookie.
export async function POST(request: NextRequest) {
  const body = await readJsonObject(request);
  if (!body) return apiError("VALIDATION_ERROR");

  const eventCode = normalizeCode(body.eventCode);
  const fields: Record<string, string> = {};
  const nameError = teamNameError(body.name);
  const nickError = nicknameError(body.nickname);
  if (!eventCode) fields.eventCode = "REQUIRED";
  if (nameError) fields.name = nameError;
  if (nickError) fields.nickname = nickError;
  if (Object.keys(fields).length > 0) {
    return apiError("VALIDATION_ERROR", fields);
  }
  const name = String(body.name).trim();
  const nickname = String(body.nickname).trim();

  if (isRateLimited(clientIp(request))) return apiError("RATE_LIMITED");

  for (let attempt = 1; attempt <= MAX_CODE_ATTEMPTS; attempt++) {
    try {
      const created = await prisma.$transaction(async (tx) => {
        // Lock the event row: team count and name checks below cannot race
        // with another team being created in the same event.
        await tx.$queryRaw`SELECT id FROM "Event" WHERE code = ${eventCode} FOR UPDATE`;
        const event = await tx.event.findUnique({
          where: { code: eventCode },
          include: { teams: { select: { name: true } } },
        });
        if (!event) throw new ApiFailure("EVENT_NOT_FOUND");
        if (canJoinEvent(event, new Date()) !== "ok") {
          throw new ApiFailure("EVENT_FINISHED");
        }
        if (event.teams.length >= event.maxTeams) {
          throw new ApiFailure("EVENT_FULL");
        }
        if (event.teams.some((team) => sameName(team.name, name))) {
          throw new ApiFailure("TEAM_NAME_TAKEN");
        }

        const team = await tx.team.create({
          data: { eventId: event.id, name, joinCode: generateCode() },
        });
        const participant = await tx.participant.create({
          data: { teamId: team.id, nickname, role: "LEADER" },
        });
        return { event, team, participant };
      });

      const response = NextResponse.json(
        {
          team: {
            id: created.team.id,
            name: created.team.name,
            joinCode: created.team.joinCode,
          },
          participant: {
            id: created.participant.id,
            nickname: created.participant.nickname,
            role: created.participant.role,
          },
        },
        { status: 201 },
      );
      await setPlayerSessionCookie(
        response,
        created.participant,
        created.event.id,
      );
      notify({ topic: staffTopic(created.event.id), signal: "overview" });
      return response;
    } catch (error) {
      if (error instanceof ApiFailure) return apiError(error.code);
      // joinCode collision (≈1e9 combinations): retry with a new code.
      const collision =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002";
      if (collision && attempt < MAX_CODE_ATTEMPTS) continue;
      console.error("Create team failed:", error);
      return apiError("INTERNAL_ERROR");
    }
  }
  return apiError("INTERNAL_ERROR");
}

// GET /api/teams?eventCode=... — real team names of an event, so whoever
// joins can see them. Never returns joinCode: joining needs the code the
// leader shares.
export async function GET(request: NextRequest) {
  const eventCode = normalizeCode(
    request.nextUrl.searchParams.get("eventCode"),
  );
  if (!eventCode)
    return apiError("VALIDATION_ERROR", { eventCode: "REQUIRED" });

  try {
    const event = await prisma.event.findUnique({
      where: { code: eventCode },
      select: {
        maxTeamSize: true,
        teams: {
          orderBy: { createdAt: "asc" },
          select: { name: true, _count: { select: { participants: true } } },
        },
      },
    });
    if (!event) return apiError("EVENT_NOT_FOUND");

    return NextResponse.json({
      teams: event.teams.map((team) => ({
        name: team.name,
        memberCount: team._count.participants,
        maxTeamSize: event.maxTeamSize,
      })),
    });
  } catch (error) {
    console.error("List teams failed:", error);
    return apiError("INTERNAL_ERROR");
  }
}
