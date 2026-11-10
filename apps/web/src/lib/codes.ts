import { randomInt } from "node:crypto";

// Same alphabet as randomCode() in CreateSessionModal: no I, O, 0 or 1, so
// codes can be read aloud or copied from a projector without mix-ups.
export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 6;

// Short random code for events (and later team invites). Uniqueness is
// enforced by the database; callers retry on a collision.
export function generateCode(length: number = CODE_LENGTH): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}
