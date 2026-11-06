import { NextResponse, type NextRequest } from "next/server";
import { Prisma, prisma } from "@tdoe/db";

import { apiError } from "@/lib/api/errors";
import { getPlayerFromRequest } from "@/lib/auth/player";
import { generateCode } from "@/lib/codes";

const MAX_CODE_ATTEMPTS = 5;

// POST /api/teams/me/join-code — the leader replaces the team's invite code;
// the old code and link stop working. Members already in keep their session.
export async function POST(request: NextRequest) {
  const player = await getPlayerFromRequest(request);
  if (!player) return apiError("UNAUTHORIZED");
  if (player.participant.role !== "LEADER") return apiError("FORBIDDEN");

  for (let attempt = 1; attempt <= MAX_CODE_ATTEMPTS; attempt++) {
    try {
      const team = await prisma.team.update({
        where: { id: player.team.id },
        data: { joinCode: generateCode() },
        select: { joinCode: true },
      });
      return NextResponse.json(team);
    } catch (error) {
      const collision =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002";
      if (collision && attempt < MAX_CODE_ATTEMPTS) continue;
      console.error("Regenerate join code failed:", error);
      return apiError("INTERNAL_ERROR");
    }
  }
  return apiError("INTERNAL_ERROR");
}
