import type { ActivityLog, ActorType } from "@tdoe/db";

// Activity record for the research: which actions exist, how they read in
// the CSV and how rows reach the API. Pure functions (no database access) so
// they can be unit-tested. Adding an action here needs no migration.

// Spanish labels for the CSV (the organizers' language). The API sends the
// key; the frontend translates it.
export const ACTION_LABEL = {
  // Educator
  EVENT_CREATED: "Creó la sesión",
  EVENT_STATUS_CHANGED: "Cambió el estado de la sesión",
  ACTIVITY_TIMER_STARTED: "Inició el timer de actividad",
  ACTIVITY_TIMER_VISIBILITY_CHANGED: "Mostró u ocultó el timer de actividad",
  ACTIVITY_TIMER_STOPPED: "Detuvo el timer de actividad",
  CHALLENGE_CARD_SENT: "Mandó una carta de reto",
  CHALLENGE_CARD_REMOVED: "Quitó la carta de reto",
  ANNOUNCEMENT_SENT: "Mandó un aviso general",
  ANNOUNCEMENT_DELETED: "Borró un aviso general",
  SWITCHES_CHANGED: "Cambió los interruptores de emergencia",
  MENTOR_CODE_CHANGED: "Creó o cambió el código de mentores",
  MENTOR_REMOVED: "Quitó a un mentor",
  TEAM_RENAMED: "Cambió el nombre de un equipo",
  // Players
  TEAM_CREATED: "Creó el equipo",
  PARTICIPANT_JOINED: "Entró al equipo",
  SESSION_RECOVERED: "Recuperó su sesión",
  JOIN_CODE_REGENERATED: "Cambió el código del equipo",
  RPG_ROLE_CHANGED: "Eligió su rol",
  PHASE_COMPLETED: "Concluyó una fase",
  SUBMISSION_SAVED: "Guardó la entrega",
  FILE_UPLOADED: "Subió un archivo",
  FILE_DELETED: "Borró un archivo",
  MESSAGE_SENT: "Mandó un mensaje",
  // Mentors
  MENTOR_JOINED: "Entró como mentor",
  MENTOR_RECOVERED: "Recuperó su sesión de mentor",
  EVALUATION_SAVED: "Calificó al equipo",
} as const;

export type ActivityAction = keyof typeof ACTION_LABEL;

const ACTOR_LABEL: Record<ActorType, string> = {
  PARTICIPANT: "Participante",
  MENTOR: "Mentor",
  STAFF: "Educador",
};

// Small facts about the action (a key and phase, a message type, a file
// name). Never content: no chat text, no answers.
export type ActivityDetails = Record<string, string | number | boolean | null>;

export type ActivityDTO = {
  id: number;
  createdAt: string;
  // Minutes since the educator started the session (negative before it,
  // null while it has not started).
  minutesFromStart: number | null;
  actor: { type: ActorType; id: string | null; name: string | null };
  team: { id: string; name: string | null } | null;
  action: string;
  details: ActivityDetails | null;
};

type Row = Pick<
  ActivityLog,
  | "id"
  | "createdAt"
  | "actorType"
  | "actorId"
  | "actorName"
  | "teamId"
  | "teamName"
  | "action"
  | "details"
>;

export function minutesFromStart(
  createdAt: Date,
  startedAt: Date | null,
): number | null {
  if (!startedAt) return null;
  return Math.floor((createdAt.getTime() - startedAt.getTime()) / 60_000);
}

function asDetails(value: unknown): ActivityDetails | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as ActivityDetails)
    : null;
}

// Each row keeps the team's name as it was then; the record shows the
// current one so a renamed team reads the same everywhere (TEAM_RENAMED
// keeps the old name in its details). A team that no longer exists keeps
// its stored name.
export function withCurrentTeamName<T extends Pick<Row, "teamId" | "teamName">>(
  row: T,
  currentNames: ReadonlyMap<string, string>,
): T {
  const current = row.teamId ? currentNames.get(row.teamId) : undefined;
  return current === undefined || current === row.teamName
    ? row
    : { ...row, teamName: current };
}

export function toActivityDTO(row: Row, startedAt: Date | null): ActivityDTO {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    minutesFromStart: minutesFromStart(row.createdAt, startedAt),
    actor: { type: row.actorType, id: row.actorId, name: row.actorName },
    team: row.teamId ? { id: row.teamId, name: row.teamName } : null,
    action: row.action,
    details: asDetails(row.details),
  };
}

// "key=problema; order=2" for the CSV.
export function formatDetails(details: unknown): string {
  const object = asDetails(details);
  if (!object) return "";
  return Object.entries(object)
    .map(([name, value]) => `${name}=${value ?? ""}`)
    .join("; ");
}

export const ACTIVITY_CSV_HEADER = [
  "#",
  "Fecha (UTC)",
  "Minutos desde el inicio",
  "Tipo de actor",
  "Id del actor",
  "Actor",
  "Id del equipo",
  "Equipo",
  "Acción",
  "Código de acción",
  "Detalle",
];

export function toActivityCsvRow(row: Row, startedAt: Date | null): unknown[] {
  return [
    row.id,
    row.createdAt,
    minutesFromStart(row.createdAt, startedAt),
    ACTOR_LABEL[row.actorType],
    row.actorId,
    row.actorName,
    row.teamId,
    row.teamName,
    ACTION_LABEL[row.action as ActivityAction] ?? row.action,
    row.action,
    formatDetails(row.details),
  ];
}

export const ACTIVITY_PAGE_SIZE = 100;

// Query of GET /api/events/:id/activity: ?before=<id> (older page) and
// ?teamId=<id> (one team).
export function parseActivityQuery(
  params: URLSearchParams,
):
  | { ok: true; data: { before: number | null; teamId: string | null } }
  | { ok: false; fields: Record<string, string> } {
  const rawBefore = params.get("before");
  const before = rawBefore === null ? null : Number(rawBefore);
  if (before !== null && (!Number.isInteger(before) || before < 1)) {
    return { ok: false, fields: { before: "INVALID" } };
  }
  const teamId = params.get("teamId")?.trim() || null;
  return { ok: true, data: { before, teamId } };
}
