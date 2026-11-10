import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@tdoe/db";

import { toEvaluationDTO } from "@/features/mentor/server/dto";
import {
  MAX_SCORE,
  MIN_SCORE,
  RUBRIC,
  summarizeEvaluations,
} from "@/features/mentor/server/rubric";
import { apiError } from "@/lib/api/errors";
import { getStaffFromRequest } from "@/lib/auth/staff";

// GET /api/events/:id/evaluations — the mentors' grades for the educator:
// every team with its summary (average and per criterion) and each mentor's
// evaluation, ranked by average (teams without grades last). Also the
// mentors of the event and how many teams each one graded.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const staff = await getStaffFromRequest(request);
  if (!staff) return apiError("UNAUTHORIZED");

  const { id } = await params;
  try {
    const event = await prisma.event.findFirst({
      where: { id, hostId: staff.id },
      select: {
        mentorCode: true,
        mentors: {
          orderBy: { joinedAt: "asc" },
          select: {
            id: true,
            name: true,
            _count: { select: { evaluations: true } },
          },
        },
        teams: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            name: true,
            evaluations: {
              orderBy: { updatedAt: "asc" },
              select: {
                teamId: true,
                scores: true,
                comment: true,
                updatedAt: true,
                mentor: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });
    if (!event) return apiError("EVENT_NOT_FOUND");

    const teams = event.teams
      .map((team) => ({
        id: team.id,
        name: team.name,
        summary: summarizeEvaluations(team.evaluations),
        evaluations: team.evaluations.map((evaluation) => ({
          mentor: evaluation.mentor,
          ...toEvaluationDTO(evaluation),
        })),
      }))
      .sort(
        (a, b) =>
          (b.summary.average ?? -1) - (a.summary.average ?? -1) ||
          b.summary.count - a.summary.count,
      );

    return NextResponse.json({
      rubric: { criteria: RUBRIC, min: MIN_SCORE, max: MAX_SCORE },
      mentorCode: event.mentorCode,
      mentors: event.mentors.map((mentor) => ({
        id: mentor.id,
        name: mentor.name,
        evaluated: mentor._count.evaluations,
      })),
      teams,
    });
  } catch (error) {
    console.error("Event evaluations failed:", error);
    return apiError("INTERNAL_ERROR");
  }
}
