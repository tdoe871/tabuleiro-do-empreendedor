import type { Event, EventMode, EventStatus } from "@tdoe/db";

// Server-side rules for events. Pure functions (no database access) so they
// can be unit-tested; the route handlers in src/app/api/events use them.

export const DEFAULT_EVENT_DURATION_MINUTES = 24 * 60;
export const MIN_TEAM_SIZE = 2;
export const MAX_TEAM_SIZE = 5;
export const MAX_TEAMS = 200;
const MAX_TITLE_LENGTH = 120;
const MAX_SCENARIO_LENGTH = 2000;

// The API keeps the values the frontend already uses; the database uses
// English enum values.
const MODE_TO_DB = { escolar: "SCHOOL", personalizado: "CUSTOM" } as const;
type ApiMode = keyof typeof MODE_TO_DB;
const MODE_FROM_DB: Record<EventMode, ApiMode> = {
  SCHOOL: "escolar",
  CUSTOM: "personalizado",
};

export type EventDTO = {
  id: string;
  code: string;
  name: string;
  mode: ApiMode;
  scenario: string | null;
  status: EventStatus;
  timerMode: Event["timerMode"];
  durationMinutes: number | null;
  maxTeams: number;
  maxTeamSize: number;
  startedAt: string | null;
  endsAt: string | null;
};

export function toEventDTO(event: Event): EventDTO {
  return {
    id: event.id,
    code: event.code,
    name: event.name,
    mode: MODE_FROM_DB[event.mode],
    scenario: event.scenario,
    status: event.status,
    timerMode: event.timerMode,
    durationMinutes: event.durationMinutes,
    maxTeams: event.maxTeams,
    maxTeamSize: event.maxTeamSize,
    startedAt: event.startedAt?.toISOString() ?? null,
    endsAt: event.endsAt?.toISOString() ?? null,
  };
}

export type CreateEventInput = {
  name: string;
  mode: EventMode;
  scenario: string | null;
  maxTeams: number;
  maxTeamSize: number;
  durationMinutes: number;
};

type Parsed<T> =
  { ok: true; data: T } | { ok: false; fields: Record<string, string> };

function isIntInRange(value: unknown, min: number, max: number) {
  return (
    Number.isInteger(value) && Number(value) >= min && Number(value) <= max
  );
}

// Body of POST /api/events, as CreateSessionModal sends it:
// { titulo, modo, cenario, numEquipes, integrantes }.
export function parseCreateEventBody(
  body: Record<string, unknown>,
): Parsed<CreateEventInput> {
  const fields: Record<string, string> = {};

  const name = typeof body.titulo === "string" ? body.titulo.trim() : "";
  if (!name) fields.titulo = "REQUIRED";
  else if (name.length > MAX_TITLE_LENGTH) fields.titulo = "TOO_LONG";

  const modo = body.modo ?? "escolar";
  const mode =
    typeof modo === "string" && modo in MODE_TO_DB
      ? MODE_TO_DB[modo as ApiMode]
      : null;
  if (!mode) fields.modo = "INVALID";

  // The scenario only matters for custom sessions; it is dropped otherwise.
  let scenario: string | null = null;
  if (mode === "CUSTOM") {
    scenario = typeof body.cenario === "string" ? body.cenario.trim() : "";
    if (!scenario) fields.cenario = "REQUIRED";
    else if (scenario.length > MAX_SCENARIO_LENGTH) fields.cenario = "TOO_LONG";
  }

  if (body.numEquipes === undefined) fields.numEquipes = "REQUIRED";
  else if (!isIntInRange(body.numEquipes, 1, MAX_TEAMS))
    fields.numEquipes = "INVALID";

  if (body.integrantes === undefined) fields.integrantes = "REQUIRED";
  else if (!isIntInRange(body.integrantes, MIN_TEAM_SIZE, MAX_TEAM_SIZE))
    fields.integrantes = "INVALID";

  if (Object.keys(fields).length > 0 || !mode) return { ok: false, fields };
  return {
    ok: true,
    data: {
      name,
      mode,
      scenario,
      maxTeams: body.numEquipes as number,
      maxTeamSize: body.integrantes as number,
      durationMinutes: DEFAULT_EVENT_DURATION_MINUTES,
    },
  };
}

export const STATUS_TARGETS = ["ACTIVE", "PAUSED", "FINISHED"] as const;
export type StatusTarget = (typeof STATUS_TARGETS)[number];

export function isStatusTarget(value: unknown): value is StatusTarget {
  return STATUS_TARGETS.includes(value as StatusTarget);
}

type StatusChange =
  | { ok: true; noop: true }
  | {
      ok: true;
      noop: false;
      data: { status: EventStatus; startedAt?: Date; endsAt?: Date | null };
    }
  | { ok: false };

// Allowed transitions:
//   DRAFT  -> ACTIVE   first start: sets startedAt and, with the GLOBAL timer,
//                      endsAt = startedAt + durationMinutes
//   ACTIVE -> PAUSED   the clock keeps running (endsAt does not move);
//                      participants just cannot act while paused
//   PAUSED -> ACTIVE   resumes with the same endsAt
//   any    -> FINISHED ends the event; endsAt is pulled in to now
// Asking for the current status again is a no-op, so a double click is safe.
export function planStatusChange(
  event: Pick<Event, "status" | "timerMode" | "durationMinutes" | "endsAt">,
  target: StatusTarget,
  now: Date,
): StatusChange {
  if (event.status === target) return { ok: true, noop: true };
  if (event.status === "FINISHED") return { ok: false };

  if (target === "FINISHED") {
    const endsAt =
      event.endsAt && event.endsAt.getTime() <= now.getTime()
        ? event.endsAt
        : now;
    return { ok: true, noop: false, data: { status: "FINISHED", endsAt } };
  }

  if (target === "ACTIVE" && event.status === "DRAFT") {
    const endsAt =
      event.timerMode === "GLOBAL" && event.durationMinutes
        ? new Date(now.getTime() + event.durationMinutes * 60_000)
        : null;
    return {
      ok: true,
      noop: false,
      data: { status: "ACTIVE", startedAt: now, endsAt },
    };
  }

  if (target === "ACTIVE" && event.status === "PAUSED") {
    return { ok: true, noop: false, data: { status: "ACTIVE" } };
  }

  if (target === "PAUSED" && event.status === "ACTIVE") {
    return { ok: true, noop: false, data: { status: "PAUSED" } };
  }

  return { ok: false };
}
