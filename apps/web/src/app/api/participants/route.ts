import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@tdoe/db";

import {
  canJoinEvent,
  nicknameError,
  normalizeCode,
  sameName,
} from "@/features/team/server/team";
import { ApiFailure, apiError, readJsonObject } from "@/lib/api/errors";
import { setPlayerSessionCookie } from "@/lib/auth/player";
import { clientIp, createRateLimiter } from "@/lib/auth/rate-limit";
import { notify, staffTopic, teamTopic } from "@/lib/realtime/server";

// Generous on purpose: at the venue hundreds of people share one public IP.
const isRateLimited = createRateLimiter({ windowMs: 5 * 60 * 1000, max: 300 });

// POST /api/participants — join a team with the code (or invite link) the
// leader shared. Body: { teamJoinCode, nickname }. Sets the player session.
//
// Coming back with a nickname that is already in the team (another phone, a
// cleared browser) recovers that participant's session instead of failing:
// 200 with `recovered: true`. Only people with the team's code can do it.
export async function POST(request: NextRequest) {
  const body = await readJsonObject(request);
  if (!body) return apiError("VALIDATION_ERROR");

  const joinCode = normalizeCode(body.teamJoinCode);
  const fields: Record<string, string> = {};
  const nickError = nicknameError(body.nickname);
  if (!joinCode) fields.teamJoinCode = "REQUIRED";
  if (nickError) fields.nickname = nickError;
  if (Object.keys(fields).length > 0) {
    return apiError("VALIDATION_ERROR", fields);
  }
  const nickname = String(body.nickname).trim();

  if (isRateLimited(clientIp(request))) return apiError("RATE_LIMITED");

  try {
    const joined = await prisma.$transaction(async (tx) => {
      // Lock the team row so two people joining at once cannot both take
      // the last spot.
      await tx.$queryRaw`SELECT id FROM "Team" WHERE "joinCode" = ${joinCode} FOR UPDATE`;
      const team = await tx.team.findUnique({
        where: { joinCode },
        include: { event: true, participants: true },
      });
      if (!team) throw new ApiFailure("TEAM_NOT_FOUND");
      if (canJoinEvent(team.event, new Date()) !== "ok") {
        throw new ApiFailure("EVENT_FINISHED");
      }

      const existing = team.participants.find((p) =>
        sameName(p.nickname, nickname),
      );
      if (existing) return { team, participant: existing, recovered: true };

      if (team.participants.length >= team.event.maxTeamSize) {
        throw new ApiFailure("TEAM_FULL");
      }
      const participant = await tx.participant.create({
        data: { teamId: team.id, nickname, role: "MEMBER" },
      });
      return { team, participant, recovered: false };
    });

    const response = NextResponse.json(
      {
        team: { id: joined.team.id, name: joined.team.name },
        participant: {
          id: joined.participant.id,
          nickname: joined.participant.nickname,
          role: joined.participant.role,
        },
        ...(joined.recovered ? { recovered: true } : {}),
      },
      { status: joined.recovered ? 200 : 201 },
    );
    await setPlayerSessionCookie(
      response,
      joined.participant,
      joined.team.eventId,
    );
    if (!joined.recovered) {
      notify(
        { topic: teamTopic(joined.team.id), signal: "board" },
        { topic: staffTopic(joined.team.eventId), signal: "overview" },
      );
    }
    return response;
  } catch (error) {
    if (error instanceof ApiFailure) return apiError(error.code);
    console.error("Join team failed:", error);
    return apiError("INTERNAL_ERROR");
  }
}
