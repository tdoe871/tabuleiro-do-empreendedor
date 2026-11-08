import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { INTERACTIVE_TX, prisma } from "@tdoe/db";

import { toFileDTO } from "@/features/submission/server/dto";
import {
  MAX_FILES_PER_TEAM,
  canSubmit,
  parseUploadRequest,
} from "@/features/submission/server/rules";
import { canPlay } from "@/features/team/server/team";
import { ApiFailure, apiError, readJsonObject } from "@/lib/api/errors";
import { getPlayerFromRequest } from "@/lib/auth/player";
import {
  createSignedUploadUrl,
  removeObjects,
} from "@/lib/storage/submissions";

// An upload URL that was never confirmed within this time is discarded.
const PENDING_TTL_MS = 60 * 60 * 1000;

// POST /api/submissions/files — start an upload.
// Body: { fileName, contentType, size }. Answers 201 with the file (PENDING)
// and a one-time `uploadUrl`. Then:
//   1. PUT the file to uploadUrl with header Content-Type = contentType;
//   2. POST /api/submissions/files/:id/confirm.
export async function POST(request: NextRequest) {
  const player = await getPlayerFromRequest(request);
  if (!player) return apiError("UNAUTHORIZED");

  const body = await readJsonObject(request);
  if (!body) return apiError("VALIDATION_ERROR");
  const upload = parseUploadRequest(body);
  if (!upload.ok) {
    return upload.error === "VALIDATION_ERROR"
      ? apiError("VALIDATION_ERROR", upload.fields)
      : apiError(upload.error);
  }

  const gate = canSubmit(canPlay(player.event, new Date()));
  if (gate !== "ok") return apiError(gate);

  const teamId = player.team.id;
  try {
    // Drop this team's uploads that were started but never confirmed.
    const staleBefore = new Date(Date.now() - PENDING_TTL_MS);
    const stale = await prisma.submissionFile.findMany({
      where: { teamId, status: "PENDING", createdAt: { lt: staleBefore } },
      select: { id: true, path: true },
    });
    if (stale.length > 0) {
      await removeObjects(stale.map((file) => file.path)).catch(() => {});
      await prisma.submissionFile.deleteMany({
        where: { id: { in: stale.map((file) => file.id) } },
      });
    }

    // Locked on the team so two uploads at once cannot pass the limit.
    const file = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Team" WHERE id = ${teamId} FOR UPDATE`;
      const count = await tx.submissionFile.count({ where: { teamId } });
      if (count >= MAX_FILES_PER_TEAM) throw new ApiFailure("TOO_MANY_FILES");
      return tx.submissionFile.create({
        data: {
          teamId,
          // Never built from the user's file name.
          path: `${player.event.id}/${teamId}/${randomUUID()}.${upload.ext}`,
          fileName: upload.fileName,
          contentType: upload.contentType,
          size: upload.size,
          uploadedById: player.participant.id,
        },
      });
    }, INTERACTIVE_TX);

    let uploadUrl: string;
    try {
      uploadUrl = await createSignedUploadUrl(file.path);
    } catch (error) {
      await prisma.submissionFile.delete({ where: { id: file.id } });
      throw error;
    }

    return NextResponse.json(
      { file: { ...toFileDTO(file), status: file.status }, uploadUrl },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ApiFailure) return apiError(error.code);
    console.error("Start upload failed:", error);
    return apiError("INTERNAL_ERROR");
  }
}
