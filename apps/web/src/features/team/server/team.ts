import type { Event } from "@tdoe/db";

// Server-side rules for teams and participants. Pure functions (no database
// access) so they can be unit-tested.

export const MAX_TEAM_NAME_LENGTH = 40;
export const MAX_NICKNAME_LENGTH = 30;

type FieldError = "REQUIRED" | "TOO_LONG";

function textError(value: unknown, max: number): FieldError | null {
  if (typeof value !== "string" || value.trim().length === 0) return "REQUIRED";
  if (value.trim().length > max) return "TOO_LONG";
  return null;
}

export function teamNameError(value: unknown) {
  return textError(value, MAX_TEAM_NAME_LENGTH);
}

export function nicknameError(value: unknown) {
  return textError(value, MAX_NICKNAME_LENGTH);
}

// Event and team codes are shown in uppercase; accept whatever the user typed.
export function normalizeCode(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

// Names are compared without case or surrounding spaces: "Ana" and " ana "
// are the same nickname, and "Los Innovadores" / "los innovadores" the same
// team.
export function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

// Whether another team of the event already uses `name` (renaming a team to
// its own name with different case is fine).
export function teamNameTakenBy(
  teams: { id: string; name: string }[],
  name: string,
  exceptTeamId: string,
): boolean {
  return teams.some((t) => t.id !== exceptTeamId && sameName(t.name, name));
}

function hasEnded(event: Pick<Event, "status" | "endsAt">, now: Date): boolean {
  return (
    event.status === "FINISHED" ||
    (event.endsAt !== null && now.getTime() >= event.endsAt.getTime())
  );
}

// Teams can be formed before the educator starts the session and while it
// runs or is paused, but not once it is over.
export function canJoinEvent(
  event: Pick<Event, "status" | "endsAt">,
  now: Date,
): "ok" | "EVENT_FINISHED" {
  return hasEnded(event, now) ? "EVENT_FINISHED" : "ok";
}

// The board only moves while the session is ACTIVE and the clock has time
// left. PAUSED keeps the clock running but blocks every player action.
export function canPlay(
  event: Pick<Event, "status" | "endsAt">,
  now: Date,
): "ok" | "EVENT_NOT_ACTIVE" | "EVENT_FINISHED" {
  if (hasEnded(event, now)) return "EVENT_FINISHED";
  if (event.status !== "ACTIVE") return "EVENT_NOT_ACTIVE";
  return "ok";
}
