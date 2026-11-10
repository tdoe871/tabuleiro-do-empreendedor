import { BOARD_KEYS, type BoardKey, type Event } from "@tdoe/db";

import { toKeyId, type KeyId } from "./progress";

// Educator controls: activity timer and challenge card.
// Pure functions (no database access) so they can be unit-tested. The
// thresholds are defaults while the team decides; changing a constant is
// enough.

// ---------------------------------------------------------------------------
// Activity timer
// ---------------------------------------------------------------------------

export const MIN_ACTIVITY_MINUTES = 1;
export const MAX_ACTIVITY_MINUTES = 180;

export type ActivityTimerDTO = {
  endsAt: string;
  // Full length, to draw progress. Remaining time = endsAt - serverNow.
  seconds: number;
  // Whether players see it.
  visible: boolean;
};

// Body of PUT /api/events/:id/activity-timer: { minutes, visible? }.
export function parseActivityBody(
  body: Record<string, unknown>,
):
  | { ok: true; data: { minutes: number; visible: boolean | null } }
  | { ok: false; fields: Record<string, string> } {
  const fields: Record<string, string> = {};
  const minutes = body.minutes;
  const validMinutes =
    typeof minutes === "number" &&
    Number.isInteger(minutes) &&
    minutes >= MIN_ACTIVITY_MINUTES &&
    minutes <= MAX_ACTIVITY_MINUTES;
  if (!validMinutes) fields.minutes = "INVALID";
  if (body.visible !== undefined && typeof body.visible !== "boolean") {
    fields.visible = "INVALID";
  }
  if (!validMinutes || Object.keys(fields).length > 0) {
    return { ok: false, fields };
  }
  return {
    ok: true,
    data: {
      minutes: minutes as number,
      visible: typeof body.visible === "boolean" ? body.visible : null,
    },
  };
}

export function toActivityTimerDTO(
  event: Pick<Event, "activityEndsAt" | "activitySeconds" | "activityVisible">,
): ActivityTimerDTO | null {
  if (!event.activityEndsAt || !event.activitySeconds) return null;
  return {
    endsAt: event.activityEndsAt.toISOString(),
    seconds: event.activitySeconds,
    visible: event.activityVisible,
  };
}

// ---------------------------------------------------------------------------
// Challenge card
// ---------------------------------------------------------------------------

export const MAX_CHALLENGE_TEXT_LENGTH = 500;

export type ChallengeCardDTO = { key: KeyId; text: string; sentAt: string };

// Body of PUT /api/events/:id/challenge-card: { key, text }.
export function parseChallengeBody(
  body: Record<string, unknown>,
):
  | { ok: true; data: { key: BoardKey; text: string } }
  | { ok: false; fields: Record<string, string> } {
  const fields: Record<string, string> = {};
  const key = BOARD_KEYS.find((k) => toKeyId(k) === body.key);
  if (!key) fields.key = "INVALID";
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) fields.text = "REQUIRED";
  else if (text.length > MAX_CHALLENGE_TEXT_LENGTH) fields.text = "TOO_LONG";
  if (!key || Object.keys(fields).length > 0) return { ok: false, fields };
  return { ok: true, data: { key, text } };
}

export function toChallengeCardDTO(
  event: Pick<Event, "challengeKey" | "challengeText" | "challengeSentAt">,
): ChallengeCardDTO | null {
  if (!event.challengeKey || !event.challengeText || !event.challengeSentAt) {
    return null;
  }
  return {
    key: toKeyId(event.challengeKey),
    text: event.challengeText,
    sentAt: event.challengeSentAt.toISOString(),
  };
}
