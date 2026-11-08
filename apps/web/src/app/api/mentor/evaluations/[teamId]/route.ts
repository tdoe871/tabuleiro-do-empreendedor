import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@tdoe/db";

import { toEvaluationDTO } from "@/features/mentor/server/dto";
import { parseEvaluationBody } from "@/features/mentor/server/rubric";
import { apiError, readJsonObject } from "@/lib/api/errors";
import { getMentorFromRequest } from "@/lib/auth/mentor";
import { notify, staffTopic } from "@/lib/realtime/server";

// PUT /api/mentor/evaluations/:teamId — the mentor saves (or edits) their
// grade for a team of their event. Body: { scores: { <criterion>: 1-5 },
// comment? }. Every criterion is required. Mentors can grade at any status,
// also after the event ends.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> },
) {
  const session = await getMentorFromRequest(request);
  if (!session) return apiError("UNAUTHORIZED");

  const body = await readJsonObject(request);
  if (!body) return apiError("VALIDATION_ERROR");
  const parsed = parseEvaluationBody(body);
  if (!parsed.ok) return apiError("VALIDATION_ERROR", parsed.fields);

  const { teamId } = await params;
  try {
    // A team of another event answers like a missing one.
    const team = await prisma.team.findFirst({
      where: { id: teamId, eventId: session.event.id },
      select: { id: true },
    });
    if (!team) return apiError("TEAM_NOT_FOUND");

    const data = { scores: parsed.data.scores, comment: parsed.data.comment };
    const evaluation = await prisma.evaluation.upsert({
      where: { mentorId_teamId: { mentorId: session.mentor.id, teamId } },
      create: { mentorId: session.mentor.id, teamId, ...data },
      update: data,
    });
    notify({ topic: staffTopic(session.event.id), signal: "overview" });
    return NextResponse.json({ evaluation: toEvaluationDTO(evaluation) });
  } catch (error) {
    console.error("Save evaluation failed:", error);
    return apiError("INTERNAL_ERROR");
  }
}
