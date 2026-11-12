import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@tdoe/db";

import {
  NEWEST_ANNOUNCEMENTS,
  toAnnouncementDTO,
} from "@/features/event/server/announcements";
import { computeAlerts } from "@/features/event/server/alerts";
import { toEventDTO } from "@/features/event/server/event";
import { computeKeyStatuses } from "@/features/event/server/progress";
import { summarizeEvaluations } from "@/features/mentor/server/rubric";
import { toFileDTO, toSubmissionDTO } from "@/features/submission/server/dto";
import { apiError } from "@/lib/api/errors";
import { getStaffFromRequest } from "@/lib/auth/staff";

// GET /api/events/:id/overview — metrics, teams and mediation alerts for the
// educator panel and the socialization wall. Alerts are computed from the
// teams' progress (features/event/server/alerts.ts) plus any open Alert rows. One Prisma query with nested
// relations (one SQL query per relation, not per team), so it does not grow
// with the number of teams.
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
      include: {
        teams: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            name: true,
            joinCode: true,
            score: true,
            createdAt: true,
            _count: { select: { participants: true } },
            phaseProgress: {
              where: { completedAt: { not: null } },
              select: {
                completedAt: true,
                phase: { select: { key: true, order: true } },
              },
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
              select: {
                id: true,
                fileName: true,
                contentType: true,
                size: true,
              },
            },
            evaluations: { select: { scores: true } },
          },
        },
        alerts: {
          where: { resolvedAt: null },
          orderBy: { createdAt: "desc" },
          select: { id: true, severity: true, message: true, createdAt: true },
        },
        announcements: NEWEST_ANNOUNCEMENTS,
      },
    });
    if (!event) return apiError("EVENT_NOT_FOUND");

    const teams = event.teams.map((team) => {
      const keys = computeKeyStatuses(
        team.phaseProgress.map(({ phase }) => phase),
      );
      return {
        id: team.id,
        name: team.name,
        joinCode: team.joinCode,
        memberCount: team._count.participants,
        score: team.score,
        keys,
        submission: team.submission?.submittedAt
          ? toSubmissionDTO(team.submission)
          : null,
        files: team.files.map(toFileDTO),
        // Mentors' grades: count and average (detail in GET .../evaluations).
        evaluation: (({ count, average }) => ({ count, average }))(
          summarizeEvaluations(team.evaluations),
        ),
      };
    });

    const metrics = {
      activeTeams: teams.filter((team) => team.memberCount > 0).length,
      participants: teams.reduce((sum, team) => sum + team.memberCount, 0),
      keysCompleted: teams.reduce(
        (sum, team) =>
          sum +
          Object.values(team.keys).filter((status) => status === "concluida")
            .length,
        0,
      ),
    };

    const now = new Date();
    const computed = computeAlerts(
      event,
      event.teams.map((team, index) => ({
        id: team.id,
        name: team.name,
        createdAt: team.createdAt,
        memberCount: team._count.participants,
        lastCompletedAt: team.phaseProgress.reduce<Date | null>(
          (last, { completedAt }) =>
            completedAt && (!last || completedAt > last) ? completedAt : last,
          null,
        ),
        allKeysDone: Object.values(teams[index]!.keys).every(
          (status) => status === "concluida",
        ),
        hasSubmission: teams[index]!.submission !== null,
      })),
      now,
    );
    // Alerts written by hand (Alert rows) come after the computed ones.
    const custom = event.alerts.map((alert) => ({
      id: alert.id,
      type: "CUSTOM" as const,
      severity: alert.severity,
      team: null,
      minutes: null,
      message: alert.message,
      createdAt: alert.createdAt.toISOString(),
    }));

    return NextResponse.json({
      serverNow: now.toISOString(),
      event: toEventDTO(event),
      metrics,
      teams,
      alerts: [...computed, ...custom],
      announcements: event.announcements.map(toAnnouncementDTO),
    });
  } catch (error) {
    console.error("Event overview failed:", error);
    return apiError("INTERNAL_ERROR");
  }
}
