import type { MessageType, Prisma } from "@tdoe/db";

// Rules for the team chat. Pure functions (no database access) so they can
// be unit-tested. The limits are defaults while the team decides; changing a
// constant is enough.

export const MAX_MESSAGE_LENGTH = 1000;
export const MESSAGE_PAGE_SIZE = 100;
// Minimum time between two nudges from the same sender to the same teammate.
export const NUDGE_COOLDOWN_MS = 30 * 1000;
// Polling only returns messages older than this. Sequential ids are taken
// before the row is committed, so a message that is still being saved can
// get a lower id than one already visible; waiting a moment means a poll
// with ?after=<id> never skips it.
export const MESSAGE_SETTLE_MS = 1000;

const MESSAGE_TYPES: readonly MessageType[] = ["TEAM", "PRIVATE", "NUDGE"];
// crypto.randomUUID() fits; anything short or with odd characters does not.
const CLIENT_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

export type MessageInput = {
  type: MessageType;
  text: string | null;
  recipientId: string | null;
  clientId: string;
};

// Body of POST /api/messages: { type, text?, toParticipantId?, clientId }.
// Whether the recipient is on the sender's team is checked by the route
// (needs the DB).
export function parseMessageBody(
  body: Record<string, unknown>,
):
  | { ok: true; data: MessageInput }
  | { ok: false; fields: Record<string, string> } {
  const fields: Record<string, string> = {};

  const type = MESSAGE_TYPES.includes(body.type as MessageType)
    ? (body.type as MessageType)
    : null;
  if (!type) fields.type = "INVALID";

  // A nudge carries no text; whatever comes is ignored.
  let text: string | null = null;
  if (type !== "NUDGE") {
    text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) fields.text = "REQUIRED";
    else if (text.length > MAX_MESSAGE_LENGTH) fields.text = "TOO_LONG";
  }

  let recipientId: string | null = null;
  if (type === "PRIVATE" || type === "NUDGE") {
    if (typeof body.toParticipantId === "string" && body.toParticipantId) {
      recipientId = body.toParticipantId;
    } else {
      fields.toParticipantId = "REQUIRED";
    }
  }

  const clientId =
    typeof body.clientId === "string" && CLIENT_ID_PATTERN.test(body.clientId)
      ? body.clientId
      : null;
  if (!clientId) fields.clientId = "INVALID";

  if (!type || !clientId || Object.keys(fields).length > 0) {
    return { ok: false, fields };
  }
  return { ok: true, data: { type, text, recipientId, clientId } };
}

export type MessageQuery =
  | { direction: "latest" }
  | { direction: "after"; id: number }
  | { direction: "before"; id: number };

// Query of GET /api/messages: nothing (the latest page), ?after=<id> (newer
// messages, for polling) or ?before=<id> (older history). null when invalid.
export function parseMessageQuery(
  params: URLSearchParams,
): MessageQuery | null {
  const after = params.get("after");
  const before = params.get("before");
  if (after !== null && before !== null) return null;
  if (after === null && before === null) return { direction: "latest" };

  const raw = (after ?? before) as string;
  if (!/^\d{1,10}$/.test(raw)) return null;
  const id = Number(raw);
  if (id > 2147483647) return null; // the column is a Postgres int4
  return after !== null
    ? { direction: "after", id }
    : { direction: "before", id };
}

// Who sees a message: TEAM is for the whole team; PRIVATE and NUDGE only
// for the sender and the recipient.
export function visibleMessages(player: {
  teamId: string;
  participantId: string;
}): Prisma.MessageWhereInput {
  return {
    teamId: player.teamId,
    OR: [
      { type: "TEAM" },
      { senderId: player.participantId },
      { recipientId: player.participantId },
    ],
  };
}
