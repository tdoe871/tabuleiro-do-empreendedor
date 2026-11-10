import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@tdoe/db";

import { toFileDTO } from "@/features/submission/server/dto";
import {
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE_BYTES,
  SIGNATURE_BYTES,
  canSubmit,
  matchesSignature,
  type FileExtension,
} from "@/features/submission/server/rules";
import { asPlayer, recordActivity } from "@/features/activity/server/record";
import { switchGate } from "@/features/event/server/switches";
import { canPlay } from "@/features/team/server/team";
import { apiError } from "@/lib/api/errors";
import { getPlayerFromRequest } from "@/lib/auth/player";
import { notify, staffTopic, teamTopic } from "@/lib/realtime/server";
import { readObjectStart, removeObjects } from "@/lib/storage/submissions";

// POST /api/submissions/files/:id/confirm — after the browser uploaded the
// file, check what actually arrived: its first bytes must match the declared
// format (PDF, Word, ...) and its real size must be within the limit. If not,
// the file is deleted. Confirming twice is fine.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const player = await getPlayerFromRequest(request);
  if (!player) return apiError("UNAUTHORIZED");

  const gate = canSubmit(canPlay(player.event, new Date()));
  if (gate !== "ok") return apiError(gate);
  const open = switchGate(player.event, "submissions");
  if (open !== "ok") return apiError(open);

  const { id } = await params;
  try {
    const file = await prisma.submissionFile.findFirst({
      where: { id, teamId: player.team.id },
    });
    if (!file) return apiError("FILE_NOT_FOUND");
    if (file.status === "READY") {
      return NextResponse.json({
        file: { ...toFileDTO(file), status: "READY" },
      });
    }

    const uploaded = await readObjectStart(file.path, SIGNATURE_BYTES);
    if (!uploaded) return apiError("FILE_NOT_UPLOADED");

    const ext = file.path.split(".").pop() as FileExtension;
    const problem =
      !(ext in ALLOWED_FILE_TYPES) || !matchesSignature(ext, uploaded.start)
        ? "FILE_TYPE_NOT_ALLOWED"
        : uploaded.size > MAX_FILE_SIZE_BYTES
          ? "FILE_TOO_LARGE"
          : null;
    if (problem) {
      await removeObjects([file.path]);
      await prisma.submissionFile.delete({ where: { id: file.id } });
      return apiError(problem);
    }

    const ready = await prisma.submissionFile.update({
      where: { id: file.id },
      data: { status: "READY", size: uploaded.size },
    });
    notify(
      { topic: teamTopic(player.team.id), signal: "board" },
      { topic: staffTopic(player.event.id), signal: "overview" },
    );
    await recordActivity({
      ...asPlayer(player),
      action: "FILE_UPLOADED",
      details: {
        fileId: ready.id,
        fileName: ready.fileName,
        contentType: ready.contentType,
        size: ready.size,
      },
    });
    return NextResponse.json({
      file: { ...toFileDTO(ready), status: "READY" },
    });
  } catch (error) {
    console.error("Confirm upload failed:", error);
    return apiError("INTERNAL_ERROR");
  }
}
