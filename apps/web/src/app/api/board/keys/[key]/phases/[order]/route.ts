import { NextResponse, type NextRequest } from "next/server";
import { BOARD_KEYS, PHASES_PER_KEY, Prisma, prisma } from "@tdoe/db";

import {
  MAX_ANSWER_LENGTH,
  POINTS_PER_PHASE,
  checkPhaseCompletion,
} from "@/features/event/server/board";
import {
  loadBoard,
  loadCompletedPhases,
} from "@/features/event/server/load-board";
import { canPlay } from "@/features/team/server/team";
import { apiError, readJsonObject } from "@/lib/api/errors";
import { getPlayerFromRequest } from "@/lib/auth/player";

// PUT /api/board/keys/:key/phases/:order — save the team's answer and
// complete the phase. Unlocks the next phase, or the next key after phase 3.
// Body: { conteudo }. Answers with the whole board, like GET /api/board.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string; order: string }> },
) {
  const player = await getPlayerFromRequest(request);
  if (!player) return apiError("UNAUTHORIZED");

  const { key: keyParam, order: orderParam } = await params;
  const key = BOARD_KEYS.find((k) => k.toLowerCase() === keyParam);
  const order = Number(orderParam);
  const body = await readJsonObject(request);
  const conteudo =
    typeof body?.conteudo === "string" ? body.conteudo.trim() : "";

  const fields: Record<string, string> = {};
  if (!key) fields.key = "INVALID";
  if (!Number.isInteger(order) || order < 1 || order > PHASES_PER_KEY) {
    fields.order = "INVALID";
  }
  if (!conteudo) fields.conteudo = "REQUIRED";
  else if (conteudo.length > MAX_ANSWER_LENGTH) fields.conteudo = "TOO_LONG";
  if (!key || Object.keys(fields).length > 0) {
    return apiError("VALIDATION_ERROR", fields);
  }

  const gate = canPlay(player.event, new Date());
  if (gate !== "ok") return apiError(gate);

  try {
    const completed = await loadCompletedPhases(player.team.id);
    const check = checkPhaseCompletion(completed, key, order);
    if (check === "KEY_LOCKED" || check === "PHASE_LOCKED") {
      return apiError(check);
    }

    if (check === "ok") {
      const phase = await prisma.phase.findUniqueOrThrow({
        where: {
          eventId_key_order: { eventId: player.event.id, key, order },
        },
        select: { id: true },
      });
      try {
        await prisma.$transaction([
          prisma.teamPhase.create({
            data: {
              teamId: player.team.id,
              phaseId: phase.id,
              content: conteudo,
              completedAt: new Date(),
              completedById: player.participant.id,
              pointsAwarded: POINTS_PER_PHASE,
            },
          }),
          prisma.team.update({
            where: { id: player.team.id },
            data: { score: { increment: POINTS_PER_PHASE } },
          }),
        ]);
      } catch (error) {
        // Another member completed the same phase a moment earlier: not an
        // error, the board below already shows it done.
        const alreadyDone =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002";
        if (!alreadyDone) throw error;
      }
    }

    // ALREADY_DONE also lands here: answer with the current board.
    return NextResponse.json(await loadBoard(player));
  } catch (error) {
    console.error("Complete phase failed:", error);
    return apiError("INTERNAL_ERROR");
  }
}
