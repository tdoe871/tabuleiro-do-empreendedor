import { NextResponse, type NextRequest } from "next/server";
import { INTERACTIVE_TX, Prisma, prisma } from "@tdoe/db";

import { loadOwnedEvent } from "@/features/event/server/owned-event";
import { asStaff, recordActivity } from "@/features/activity/server/record";
import { teamNameError, teamNameTakenBy } from "@/features/team/server/team";
import { ApiFailure, apiError, readJsonObject } from "@/lib/api/errors";
import { notify, staffTopic, teamTopic } from "@/lib/realtime/server";

type Context = { params: Promise<{ id: string; teamId: string }> };

// PATCH /api/events/:id/teams/:teamId — the educator renames a team (it used
// the product's name, or something offensive). Body: { name }. 200 with
// { team: { id, name } }.
//
// Only the educator can do it, not the team: a team renaming itself could
// take another team's name (the winner's, say) or change it right before the
// results. The same rules as creating a team apply: 1-40 characters and no
// other team of the event with the same name (ignoring case and spaces).
//
// The name is only stored on the team, so the board, the overview, the
// mentors' panel and the CSV reports show the new one on their next load;
// the team and the educator get a realtime signal to load it now.
export async function PATCH(request: NextRequest, { params }: Context) {
  const { id, teamId } = await params;
  const loaded = await loadOwnedEvent(request, id);
  if ("error" in loaded) return loaded.error;
  const eventId = loaded.event.id;

  const body = await readJsonObject(request);
  if (!body) return apiError("VALIDATION_ERROR");
  const nameError = teamNameError(body.name);
  if (nameError) return apiError("VALIDATION_ERROR", { name: nameError });
  const name = String(body.name).trim();

  try {
    const renamed = await prisma.$transaction(async (tx) => {
      // Same lock as team creation, so a new team cannot take this name
      // between the check and the update.
      await tx.$queryRaw`SELECT id FROM "Event" WHERE id = ${eventId} FOR UPDATE`;
      const teams = await tx.team.findMany({
        where: { eventId },
        select: { id: true, name: true },
      });
      const team = teams.find((t) => t.id === teamId);
      if (!team) throw new ApiFailure("TEAM_NOT_FOUND");
      if (teamNameTakenBy(teams, name, teamId)) {
        throw new ApiFailure("TEAM_NAME_TAKEN");
      }
      if (team.name === name) return { team, from: team.name, changed: false };
      const updated = await tx.team.update({
        where: { id: teamId },
        data: { name },
        select: { id: true, name: true },
      });
      return { team: updated, from: team.name, changed: true };
    }, INTERACTIVE_TX);

    if (renamed.changed) {
      notify(
        { topic: teamTopic(teamId), signal: "board" },
        { topic: staffTopic(eventId), signal: "overview" },
      );
      await recordActivity({
        ...asStaff(loaded.staff, eventId),
        team: renamed.team,
        action: "TEAM_RENAMED",
        details: { from: renamed.from, to: renamed.team.name },
      });
    }
    return NextResponse.json({ team: renamed.team });
  } catch (error) {
    if (error instanceof ApiFailure) return apiError(error.code);
    // @@unique([eventId, name]): another team got the exact name meanwhile.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return apiError("TEAM_NAME_TAKEN");
    }
    console.error("Rename team failed:", error);
    return apiError("INTERNAL_ERROR");
  }
}
