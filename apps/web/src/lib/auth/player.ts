import type { NextRequest, NextResponse } from "next/server";
import { prisma, type Event, type Participant, type Team } from "@tdoe/db";

import {
  PLAYER_SESSION_COOKIE,
  PLAYER_SESSION_DURATION_SECONDS,
  createPlayerSession,
  sessionCookieOptions,
  verifyPlayerSession,
} from "@/lib/auth/session";

export type Player = {
  participant: Participant;
  team: Team;
  event: Event;
};

// Authoritative check: besides the token signature, the participant must
// still exist and still belong to the team in the token.
export async function getPlayerFromToken(
  token: string | undefined,
): Promise<Player | null> {
  const session = await verifyPlayerSession(token);
  if (!session) return null;

  const participant = await prisma.participant.findUnique({
    where: { id: session.participantId },
    include: { team: { include: { event: true } } },
  });
  if (!participant || participant.teamId !== session.teamId) return null;

  const { team, ...rest } = participant;
  const { event, ...teamRest } = team;
  return { participant: rest, team: teamRest, event };
}

export function getPlayerFromRequest(
  request: NextRequest,
): Promise<Player | null> {
  return getPlayerFromToken(request.cookies.get(PLAYER_SESSION_COOKIE)?.value);
}

export async function setPlayerSessionCookie(
  response: NextResponse,
  participant: { id: string; teamId: string },
  eventId: string,
): Promise<void> {
  response.cookies.set(
    PLAYER_SESSION_COOKIE,
    await createPlayerSession({
      participantId: participant.id,
      teamId: participant.teamId,
      eventId,
    }),
    sessionCookieOptions(PLAYER_SESSION_DURATION_SECONDS),
  );
}
