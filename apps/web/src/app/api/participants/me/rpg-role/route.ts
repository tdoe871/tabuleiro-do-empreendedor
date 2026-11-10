import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@tdoe/db";

import { asPlayer, recordActivity } from "@/features/activity/server/record";
import { RPG_ROLE_IDS, type RpgRoleId } from "@/features/event/rpgRoles";
import { apiError, readJsonObject } from "@/lib/api/errors";
import { getPlayerFromRequest } from "@/lib/auth/player";
import { notify, teamTopic } from "@/lib/realtime/server";

// PUT /api/participants/me/rpg-role — pick, change or clear (null) the
// player's role. Body: { rpgRole }. Teammates may pick the same role.
export async function PUT(request: NextRequest) {
  const player = await getPlayerFromRequest(request);
  if (!player) return apiError("UNAUTHORIZED");

  const body = await readJsonObject(request);
  const rpgRole = body?.rpgRole;
  const valid = rpgRole === null || RPG_ROLE_IDS.includes(rpgRole as RpgRoleId);
  if (!valid) return apiError("VALIDATION_ERROR", { rpgRole: "INVALID" });

  try {
    const updated = await prisma.participant.update({
      where: { id: player.participant.id },
      data: { rpgRole: rpgRole as RpgRoleId | null },
      select: { rpgRole: true },
    });
    notify({ topic: teamTopic(player.team.id), signal: "board" });
    await recordActivity({
      ...asPlayer(player),
      action: "RPG_ROLE_CHANGED",
      details: { rpgRole: updated.rpgRole },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Set RPG role failed:", error);
    return apiError("INTERNAL_ERROR");
  }
}
