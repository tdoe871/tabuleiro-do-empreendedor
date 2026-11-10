import type { Event } from "@tdoe/db";

// Emergency switches: the educator turns off the chat, deliveries or new
// entries of their event without a new deploy. Each route checks its switch.
// Pure functions (no database access) so they can be unit-tested.

export const SWITCHES = ["chat", "submissions", "joins"] as const;
export type SwitchName = (typeof SWITCHES)[number];

const COLUMN = {
  chat: "chatEnabled",
  submissions: "submissionsEnabled",
  joins: "joinsEnabled",
} as const satisfies Record<SwitchName, keyof Event>;

type SwitchColumn = (typeof COLUMN)[SwitchName];
type SwitchColumns = Pick<Event, SwitchColumn>;

// true = on (works as usual), false = turned off.
export type SwitchesDTO = Record<SwitchName, boolean>;

export function toSwitchesDTO(event: SwitchColumns): SwitchesDTO {
  return {
    chat: event.chatEnabled,
    submissions: event.submissionsEnabled,
    joins: event.joinsEnabled,
  };
}

const DISABLED = {
  chat: "CHAT_DISABLED",
  submissions: "SUBMISSIONS_DISABLED",
  joins: "JOINS_DISABLED",
} as const;

// What a route answers when its switch is off.
export function switchGate<Name extends SwitchName>(
  event: SwitchColumns,
  name: Name,
): "ok" | (typeof DISABLED)[Name] {
  return event[COLUMN[name]] ? "ok" : DISABLED[name];
}

// Body of PATCH /api/events/:id/switches: any of { chat, submissions, joins }
// as booleans; the ones left out keep their value.
export function parseSwitchesBody(
  body: Record<string, unknown>,
):
  | { ok: true; data: Partial<SwitchColumns> }
  | { ok: false; fields: Record<string, string> } {
  const fields: Record<string, string> = {};
  const data: Partial<SwitchColumns> = {};
  for (const [name, value] of Object.entries(body)) {
    if (!SWITCHES.includes(name as SwitchName)) fields[name] = "UNKNOWN";
    else if (typeof value !== "boolean") fields[name] = "INVALID";
    else data[COLUMN[name as SwitchName]] = value;
  }
  if (Object.keys(fields).length > 0) return { ok: false, fields };
  if (Object.keys(data).length === 0) {
    return { ok: false, fields: { switches: "REQUIRED" } };
  }
  return { ok: true, data };
}
