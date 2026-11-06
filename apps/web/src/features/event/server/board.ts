import {
  BOARD_KEYS,
  PHASES_PER_KEY,
  type BoardKey,
  type Event,
  type Participant,
  type Submission,
  type Team,
} from "@tdoe/db";

import { canPlay } from "@/features/team/server/team";
import {
  computeKeyStatuses,
  toKeyId,
  type KeyId,
  type KeyStatus,
} from "./progress";

// Points a team earns per completed phase. 0 until the team decides the
// scoring; changing this number is enough to start awarding points.
export const POINTS_PER_PHASE = 0;

export const MAX_ANSWER_LENGTH = 5000;

// Matches the frontend's PhaseStatus.
export type PhaseStatus = "bloqueada" | "disponivel" | "concluida";

type PhaseState = {
  status: PhaseStatus;
  conteudo?: string;
  completedAt?: string;
};

export type BoardDTO = {
  serverNow: string;
  event: {
    code: string;
    name: string;
    status: Event["status"];
    timerMode: Event["timerMode"];
    startedAt: string | null;
    endsAt: string | null;
    // Whether players can act right now (ACTIVE and time left).
    playable: boolean;
  };
  team: { id: string; name: string; joinCode: string; score: number };
  me: MemberDTO;
  members: MemberDTO[];
  keys: Record<
    KeyId,
    { status: KeyStatus; phases: Record<string, PhaseState> }
  >;
  // The educator's challenge card. Not modeled yet (open decision), so
  // always null for now; the field is here so the frontend can wire it.
  cartaAtiva: { key: KeyId; text: string } | null;
  submission: {
    type: Submission["type"];
    url: string | null;
    description: string | null;
    submittedAt: string | null;
  } | null;
};

type MemberDTO = {
  id: string;
  nickname: string;
  role: Participant["role"];
  rpgRole: string | null;
};

export type CompletedPhase = {
  key: BoardKey;
  order: number;
  content: string | null;
  completedAt: Date;
};

function toMember(participant: Participant): MemberDTO {
  return {
    id: participant.id,
    nickname: participant.nickname,
    role: participant.role,
    rpgRole: participant.rpgRole,
  };
}

// Builds GET /api/board's body in the same shape as PlayerBoard's local
// state, so the frontend can replace its state without converting anything.
export function buildBoard(input: {
  event: Event;
  team: Team;
  me: Participant;
  members: Participant[];
  completed: CompletedPhase[];
  submission: Submission | null;
  now: Date;
}): BoardDTO {
  const { event, team, me, members, completed, submission, now } = input;
  const keyStatuses = computeKeyStatuses(completed);

  const keys = {} as BoardDTO["keys"];
  for (const key of BOARD_KEYS) {
    const keyId = toKeyId(key);
    const status = keyStatuses[keyId];
    const done = new Map(
      completed.filter((phase) => phase.key === key).map((p) => [p.order, p]),
    );

    const phases: Record<string, PhaseState> = {};
    let nextAssigned = false;
    for (let order = 1; order <= PHASES_PER_KEY; order++) {
      const phase = done.get(order);
      if (phase) {
        phases[order] = {
          status: "concluida",
          conteudo: phase.content ?? "",
          completedAt: phase.completedAt.toISOString(),
        };
      } else if (status === "ativa" && !nextAssigned) {
        phases[order] = { status: "disponivel" };
        nextAssigned = true;
      } else {
        phases[order] = { status: "bloqueada" };
      }
    }
    keys[keyId] = { status, phases };
  }

  return {
    serverNow: now.toISOString(),
    event: {
      code: event.code,
      name: event.name,
      status: event.status,
      timerMode: event.timerMode,
      startedAt: event.startedAt?.toISOString() ?? null,
      endsAt: event.endsAt?.toISOString() ?? null,
      playable: canPlay(event, now) === "ok",
    },
    team: {
      id: team.id,
      name: team.name,
      joinCode: team.joinCode,
      score: team.score,
    },
    me: toMember(me),
    members: members.filter((member) => member.id !== me.id).map(toMember),
    keys,
    cartaAtiva: null,
    submission: submission
      ? {
          type: submission.type,
          url: submission.url,
          description: submission.description,
          submittedAt: submission.submittedAt?.toISOString() ?? null,
        }
      : null,
  };
}

// Which phase the team may complete next in a key, or why not.
export function checkPhaseCompletion(
  completed: ReadonlyArray<{ key: BoardKey; order: number }>,
  key: BoardKey,
  order: number,
): "ok" | "ALREADY_DONE" | "KEY_LOCKED" | "PHASE_LOCKED" {
  if (completed.some((phase) => phase.key === key && phase.order === order)) {
    return "ALREADY_DONE";
  }
  if (computeKeyStatuses(completed)[toKeyId(key)] !== "ativa") {
    return "KEY_LOCKED";
  }
  const doneInKey = completed.filter((phase) => phase.key === key).length;
  return order === doneInKey + 1 ? "ok" : "PHASE_LOCKED";
}
