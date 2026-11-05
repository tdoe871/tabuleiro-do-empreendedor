/**
 * Mirrors packages/db/prisma/schema.prisma. Kept as plain types (not
 * re-exported Prisma types) so UI code can import this without pulling in
 * the Prisma client on the client bundle.
 */

export type EventStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "FINISHED";
export type TimerMode = "GLOBAL" | "PER_PHASE";
export type ParticipantRole = "LEADER" | "MEMBER";
export type BoardKey = "PROBLEMA" | "SOLUCAO" | "PARCERIAS" | "OPORTUNIDADES";
export type SubmissionType =
  "DEPLOY_LINK" | "REPO_LINK" | "FILE_OR_IMAGE" | "NONE";

export interface EventSummary {
  id: string;
  code: string;
  name: string;
  status: EventStatus;
  timerMode: TimerMode;
  durationMinutes: number | null;
  maxTeams: number;
  maxTeamSize: number;
  startedAt: string | null;
  endsAt: string | null;
}

export interface TeamSummary {
  id: string;
  eventId: string;
  name: string;
  joinCode: string;
  score: number;
  memberCount: number;
}

export interface ParticipantSummary {
  id: string;
  teamId: string;
  nickname: string;
  role: ParticipantRole;
}

export interface SubmissionInput {
  type: SubmissionType;
  url?: string;
  fileUrl?: string;
  description?: string;
}
