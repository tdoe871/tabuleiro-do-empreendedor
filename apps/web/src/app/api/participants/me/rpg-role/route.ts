import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@tdoe/db";

import { RPG_ROLE_IDS, type RpgRoleId } from "@/features/event/rpgRoles";
import { apiError, readJsonObject } from "@/lib/api/errors";
import { getPlayerFromRequest } from "@/lib/auth/player";

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
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Set RPG role failed:", error);
    return apiError("INTERNAL_ERROR");
  }
}
