import { prisma, type ActorType } from "@tdoe/db";

import type { ActivityAction, ActivityDetails } from "./actions";

// Writes the activity record. Routes await recordActivity() after a change,
// before answering, so the rows keep the order in which things happened
// (writing after the response let two quick actions swap places). It never
// throws: a failed write never breaks the action, it only shows in the logs.

type Actor = { type: ActorType; id: string; name: string };
type Who = {
  eventId: string;
  actor: Actor;
  team?: { id: string; name: string } | null;
};

export type ActivityEntry = Who & {
  action: ActivityAction;
  details?: ActivityDetails;
};

export async function recordActivity(
  ...entries: ActivityEntry[]
): Promise<void> {
  if (entries.length === 0) return;
  try {
    await prisma.activityLog.createMany({
      data: entries.map((entry) => ({
        eventId: entry.eventId,
        actorType: entry.actor.type,
        actorId: entry.actor.id,
        actorName: entry.actor.name,
        teamId: entry.team?.id ?? null,
        teamName: entry.team?.name ?? null,
        action: entry.action,
        details: entry.details,
      })),
    });
  } catch (error) {
    console.error("Activity record failed:", error);
  }
}

// Who is acting, from each kind of session.

export function asPlayer(player: {
  participant: { id: string; nickname: string };
  team: { id: string; name: string };
  event: { id: string };
}): Who {
  return {
    eventId: player.event.id,
    actor: {
      type: "PARTICIPANT",
      id: player.participant.id,
      name: player.participant.nickname,
    },
    team: { id: player.team.id, name: player.team.name },
  };
}

export function asStaff(
  staff: { id: string; name: string },
  eventId: string,
): Who {
  return {
    eventId,
    actor: { type: "STAFF", id: staff.id, name: staff.name },
  };
}

export function asMentor(mentor: {
  id: string;
  name: string;
  eventId: string;
}): Who {
  return {
    eventId: mentor.eventId,
    actor: { type: "MENTOR", id: mentor.id, name: mentor.name },
  };
}
