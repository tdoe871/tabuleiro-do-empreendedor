import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@tdoe/db";

import { toFileDTO, toSubmissionDTO } from "@/features/submission/server/dto";
import {
  canSubmit,
  parseSubmissionBody,
} from "@/features/submission/server/rules";
import { canPlay } from "@/features/team/server/team";
import { apiError, readJsonObject } from "@/lib/api/errors";
import { getPlayerFromRequest } from "@/lib/auth/player";
import { notify, staffTopic, teamTopic } from "@/lib/realtime/server";

async function loadDelivery(teamId: string) {
  const [submission, files] = await Promise.all([
    prisma.submission.findUnique({ where: { teamId } }),
    prisma.submissionFile.findMany({
      where: { teamId, status: "READY" },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  return {
    submission: submission ? toSubmissionDTO(submission) : null,
    files: files.map(toFileDTO),
  };
}

// GET /api/submissions — the player's team delivery and its uploaded files.
export async function GET(request: NextRequest) {
  const player = await getPlayerFromRequest(request);
  if (!player) return apiError("UNAUTHORIZED");

  try {
    return NextResponse.json(await loadDelivery(player.team.id));
  } catch (error) {
    console.error("Load submission failed:", error);
    return apiError("INTERNAL_ERROR");
  }
}

// PUT /api/submissions — the team saves its delivery (one per team; each PUT
// replaces it). Body: { type, url?, links?, description? }. Files are
// uploaded separately (POST /api/submissions/files) and stay attached to
// the team. Any member can deliver while the session is ACTIVE with time
// left.
export async function PUT(request: NextRequest) {
  const player = await getPlayerFromRequest(request);
  if (!player) return apiError("UNAUTHORIZED");

  const body = await readJsonObject(request);
  if (!body) return apiError("VALIDATION_ERROR");
  const parsed = parseSubmissionBody(body);
  if (!parsed.ok) return apiError("VALIDATION_ERROR", parsed.fields);

  const gate = canSubmit(canPlay(player.event, new Date()));
  if (gate !== "ok") return apiError(gate);

  try {
    if (parsed.data.type === "FILE_OR_IMAGE") {
      const ready = await prisma.submissionFile.count({
        where: { teamId: player.team.id, status: "READY" },
      });
      if (ready === 0)
        return apiError("VALIDATION_ERROR", { files: "REQUIRED" });
    }

    const data = { ...parsed.data, submittedAt: new Date() };
    await prisma.submission.upsert({
      where: { teamId: player.team.id },
      create: { teamId: player.team.id, ...data },
      update: data,
    });
    notify(
      { topic: teamTopic(player.team.id), signal: "board" },
      { topic: staffTopic(player.event.id), signal: "overview" },
    );
    return NextResponse.json(await loadDelivery(player.team.id));
  } catch (error) {
    console.error("Save submission failed:", error);
    return apiError("INTERNAL_ERROR");
  }
}
