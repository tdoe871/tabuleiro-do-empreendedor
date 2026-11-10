import { NextResponse, type NextRequest } from "next/server";

import { loadBoard } from "@/features/event/server/load-board";
import { apiError } from "@/lib/api/errors";
import { getPlayerFromRequest } from "@/lib/auth/player";

// GET /api/board — the player's whole board in one call, in the same shape as
// PlayerBoard's local state (see docs/backend/api.md).
export async function GET(request: NextRequest) {
  const player = await getPlayerFromRequest(request);
  if (!player) return apiError("UNAUTHORIZED");

  try {
    return NextResponse.json(await loadBoard(player));
  } catch (error) {
    console.error("Load board failed:", error);
    return apiError("INTERNAL_ERROR");
  }
}
