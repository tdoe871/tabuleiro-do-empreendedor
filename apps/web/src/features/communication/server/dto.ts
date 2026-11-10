import type { Message, Participant } from "@tdoe/db";

// Response shape for chat messages, shared by GET and POST /api/messages.

type Person = { id: string; nickname: string };

export type MessageDTO = {
  id: number;
  type: Message["type"];
  text: string | null;
  // null if the participant no longer exists.
  from: Person | null;
  // PRIVATE and NUDGE only.
  to: Person | null;
  // True when the player asking sent it.
  mine: boolean;
  clientId: string;
  createdAt: string;
};

export type MessageWithPeople = Message & {
  sender: Pick<Participant, "id" | "nickname"> | null;
  recipient: Pick<Participant, "id" | "nickname"> | null;
};

export const MESSAGE_PEOPLE = {
  sender: { select: { id: true, nickname: true } },
  recipient: { select: { id: true, nickname: true } },
} as const;

export function toMessageDTO(
  message: MessageWithPeople,
  participantId: string,
): MessageDTO {
  return {
    id: message.id,
    type: message.type,
    text: message.text,
    from: message.sender,
    to: message.recipient,
    mine: message.senderId === participantId,
    clientId: message.clientId,
    createdAt: message.createdAt.toISOString(),
  };
}
