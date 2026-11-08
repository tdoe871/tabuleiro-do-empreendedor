import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@tdoe/db";

import { canSubmit } from "@/features/submission/server/rules";
import { switchGate } from "@/features/event/server/switches";
import { canPlay } from "@/features/team/server/team";
import { apiError } from "@/lib/api/errors";
import { getMentorFromRequest } from "@/lib/auth/mentor";
import { getPlayerFromRequest } from "@/lib/auth/player";
import { getStaffFromRequest } from "@/lib/auth/staff";
import { notify, staffTopic, teamTopic } from "@/lib/realtime/server";
import {
  createSignedDownloadUrl,
  removeObjects,
} from "@/lib/storage/submissions";

type Context = { params: Promise<{ id: string }> };

// GET /api/submissions/files/:id — download. Redirects to a signed URL that
// expires in 60 s. Allowed for members of the team that uploaded it, the
// educator who owns the event and the event's mentors; anyone else gets
// FILE_NOT_FOUND.
export async function GET(request: NextRequest, { params }: Context) {
  const { id } = await params;
  try {
    const file = await prisma.submissionFile.findFirst({
      where: { id, status: "READY" },
      include: {
        team: {
          select: { eventId: true, event: { select: { hostId: true } } },
        },
      },
    });
    if (!file) return apiError("FILE_NOT_FOUND");

    const [player, staff, mentor] = await Promise.all([
      getPlayerFromRequest(request),
      getStaffFromRequest(request),
      getMentorFromRequest(request),
    ]);
    const allowed =
      player?.team.id === file.teamId ||
      staff?.id === file.team.event.hostId ||
      mentor?.event.id === file.team.eventId;
    if (!allowed) {
      // With any valid session it answers like a missing file, so ids
      // cannot be probed; without one, UNAUTHORIZED.
      return player || staff || mentor
        ? apiError("FILE_NOT_FOUND")
        : apiError("UNAUTHORIZED");
    }

    return NextResponse.redirect(
      await createSignedDownloadUrl(file.path, file.fileName),
    );
  } catch (error) {
    console.error("Download file failed:", error);
    return apiError("INTERNAL_ERROR");
  }
}

// DELETE /api/submissions/files/:id — a team member removes one of the
// team's files (only while deliveries are open).
export async function DELETE(request: NextRequest, { params }: Context) {
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

    await removeObjects([file.path]);
    await prisma.submissionFile.delete({ where: { id: file.id } });
    notify(
      { topic: teamTopic(player.team.id), signal: "board" },
      { topic: staffTopic(player.event.id), signal: "overview" },
    );
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Delete file failed:", error);
    return apiError("INTERNAL_ERROR");
  }
}
