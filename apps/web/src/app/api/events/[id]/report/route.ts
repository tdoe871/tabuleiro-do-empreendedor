import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@tdoe/db";

import { loadOwnedEvent } from "@/features/event/server/owned-event";
import { buildReport, resolveTimeZone } from "@/features/report/server/model";
import { renderReportPdf } from "@/features/report/server/pdf";
import { apiError } from "@/lib/api/errors";

// GET /api/events/:id/report?team=<teamId>|all&tz=<IANA zone> — the PDF
// team report for the educator who owns the event: one team, or every team
// in one file (cover with the event, summary and ranking, then a section
// per team: members, progress, answers to each phase, delivery and the
// mentors' grades). Dates in `tz` (the browser's zone), Mexico City if
// missing or unknown. Works at any status, also after the event ends.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const loaded = await loadOwnedEvent(request, (await params).id);
  if ("error" in loaded) return loaded.error;
  const { event, staff } = loaded;

  const teamParam = request.nextUrl.searchParams.get("team");
  const onlyTeamId = teamParam && teamParam !== "all" ? teamParam : null;
  const timeZone = resolveTimeZone(request.nextUrl.searchParams.get("tz"));

  try {
    const allTeams = await prisma.team.findMany({
      where: { eventId: event.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        createdAt: true,
        score: true,
        participants: {
          orderBy: { joinedAt: "asc" },
          select: { nickname: true, role: true, rpgRole: true, joinedAt: true },
        },
        phaseProgress: {
          where: { completedAt: { not: null } },
          select: {
            content: true,
            completedAt: true,
            completedBy: { select: { nickname: true } },
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
          select: { fileName: true, size: true },
        },
        evaluations: {
          select: {
            scores: true,
            comment: true,
            updatedAt: true,
            mentor: { select: { name: true } },
          },
        },
      },
    });
    if (onlyTeamId && !allTeams.some((t) => t.id === onlyTeamId)) {
      return apiError("TEAM_NOT_FOUND");
    }

    const report = buildReport({
      event,
      hostName: staff.name,
      allTeams,
      onlyTeamId,
      generatedAt: new Date(),
      timeZone,
    });
    const pdf = await renderReportPdf(report);
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${report.fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Team report failed:", error);
    return apiError("INTERNAL_ERROR");
  }
}
