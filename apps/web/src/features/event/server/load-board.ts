import { prisma } from "@tdoe/db";

import type { Player } from "@/lib/auth/player";

import { buildBoard, type BoardDTO, type CompletedPhase } from "./board";

// The team's completed phases, in the shape the board rules use.
export async function loadCompletedPhases(
  teamId: string,
): Promise<CompletedPhase[]> {
  const rows = await prisma.teamPhase.findMany({
    where: { teamId, completedAt: { not: null } },
    select: {
      content: true,
      completedAt: true,
      phase: { select: { key: true, order: true } },
    },
  });
  return rows.map((row) => ({
    key: row.phase.key,
    order: row.phase.order,
    content: row.content,
    completedAt: row.completedAt ?? new Date(0),
  }));
}

// Everything GET /api/board returns for the player's team.
export async function loadBoard(player: Player): Promise<BoardDTO> {
  const [team, completed] = await Promise.all([
    prisma.team.findUniqueOrThrow({
      where: { id: player.team.id },
      include: {
        participants: { orderBy: { joinedAt: "asc" } },
        submission: true,
        files: { where: { status: "READY" }, orderBy: { createdAt: "asc" } },
      },
    }),
    loadCompletedPhases(player.team.id),
  ]);

  const { participants, submission, files, ...teamRow } = team;
  return buildBoard({
    event: player.event,
    team: teamRow,
    me: player.participant,
    members: participants,
    completed,
    submission,
    files,
    now: new Date(),
  });
}
