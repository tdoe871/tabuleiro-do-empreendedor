import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@tdoe/db";

import {
  NEWEST_ANNOUNCEMENTS,
  toAnnouncementDTO,
} from "@/features/event/server/announcements";
import { computeKeyStatuses } from "@/features/event/server/progress";
import { toEvaluationDTO } from "@/features/mentor/server/dto";
import { MAX_SCORE, MIN_SCORE, RUBRIC } from "@/features/mentor/server/rubric";
import { toFileDTO, toSubmissionDTO } from "@/features/submission/server/dto";
import { apiError } from "@/lib/api/errors";
import { getMentorFromRequest } from "@/lib/auth/mentor";

// GET /api/mentor — everything the mentor's screen needs: the event, the
// rubric, and every team with its progress, delivery, files and the
// mentor's own evaluation (null until they grade it). One query with nested
// relations, so it does not grow with the number of teams.
export async function GET(request: NextRequest) {
  const session = await getMentorFromRequest(request);
  if (!session) return apiError("UNAUTHORIZED");
  const { mentor, event } = session;

  try {
    const announcements = prisma.announcement.findMany({
      where: { eventId: event.id },
      ...NEWEST_ANNOUNCEMENTS,
    });
    const teams = prisma.team.findMany({
      where: { eventId: event.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        _count: { select: { participants: true } },
        phaseProgress: {
          where: { completedAt: { not: null } },
          select: { phase: { select: { key: true, order: true } } },
        },
        submission: {
          select: {
            type: true,
            url: true,
            links: true,
            description: true,
            submittedAt: true,
          },
        },
        files: {
          where: { status: "READY" },
          orderBy: { createdAt: "asc" },
          select: { id: true, fileName: true, contentType: true, size: true },
        },
        evaluations: {
          where: { mentorId: mentor.id },
          select: {
            teamId: true,
            scores: true,
            comment: true,
            updatedAt: true,
          },
        },
      },
    });

    const [teamRows, announcementRows] = await Promise.all([
      teams,
      announcements,
    ]);

    return NextResponse.json({
      serverNow: new Date().toISOString(),
      event: {
        name: event.name,
        status: event.status,
        startedAt: event.startedAt?.toISOString() ?? null,
        endsAt: event.endsAt?.toISOString() ?? null,
      },
      mentor: { id: mentor.id, name: mentor.name },
      rubric: { criteria: RUBRIC, min: MIN_SCORE, max: MAX_SCORE },
      teams: teamRows.map((team) => ({
        id: team.id,
        name: team.name,
        memberCount: team._count.participants,
        keys: computeKeyStatuses(team.phaseProgress.map(({ phase }) => phase)),
        submission: team.submission?.submittedAt
          ? toSubmissionDTO(team.submission)
          : null,
        files: team.files.map(toFileDTO),
        myEvaluation: team.evaluations[0]
          ? toEvaluationDTO(team.evaluations[0])
          : null,
      })),
      // The educator's newest announcements, newest first.
      announcements: announcementRows.map(toAnnouncementDTO),
    });
  } catch (error) {
    console.error("Mentor overview failed:", error);
    return apiError("INTERNAL_ERROR");
  }
}
