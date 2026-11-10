/**
 * @jest-environment node
 */
import { toMessageDTO } from "@/features/communication/server/dto";
import {
  MAX_MESSAGE_LENGTH,
  parseMessageBody,
  parseMessageQuery,
  visibleMessages,
} from "@/features/communication/server/rules";

const clientId = "6f1c2a9e-3b7d-4c1a-9e8f-2d4b6a8c0e1f";

describe("parseMessageBody", () => {
  it("accepts a team message and trims the text", () => {
    expect(
      parseMessageBody({ type: "TEAM", text: "  hola  ", clientId }),
    ).toEqual({
      ok: true,
      data: { type: "TEAM", text: "hola", recipientId: null, clientId },
    });
  });

  it("ignores a recipient on team messages", () => {
    const result = parseMessageBody({
      type: "TEAM",
      text: "hola",
      toParticipantId: "someone",
      clientId,
    });
    expect(result.ok && result.data.recipientId).toBe(null);
  });

  it("requires a recipient for private messages and nudges", () => {
    expect(
      parseMessageBody({ type: "PRIVATE", text: "hola", clientId }),
    ).toEqual({ ok: false, fields: { toParticipantId: "REQUIRED" } });
    expect(parseMessageBody({ type: "NUDGE", clientId })).toEqual({
      ok: false,
      fields: { toParticipantId: "REQUIRED" },
    });
  });

  it("drops the text of a nudge", () => {
    expect(
      parseMessageBody({
        type: "NUDGE",
        text: "ignored",
        toParticipantId: "p2",
        clientId,
      }),
    ).toEqual({
      ok: true,
      data: { type: "NUDGE", text: null, recipientId: "p2", clientId },
    });
  });

  it("rejects empty and too long text", () => {
    expect(parseMessageBody({ type: "TEAM", text: "   ", clientId })).toEqual({
      ok: false,
      fields: { text: "REQUIRED" },
    });
    expect(
      parseMessageBody({
        type: "TEAM",
        text: "a".repeat(MAX_MESSAGE_LENGTH + 1),
        clientId,
      }),
    ).toEqual({ ok: false, fields: { text: "TOO_LONG" } });
  });

  it("rejects unknown types and bad client ids", () => {
    expect(parseMessageBody({ type: "SHOUT", text: "x", clientId })).toEqual({
      ok: false,
      fields: { type: "INVALID" },
    });
    for (const bad of [
      undefined,
      "short",
      "has spaces in it",
      "x".repeat(65),
    ]) {
      expect(
        parseMessageBody({ type: "TEAM", text: "x", clientId: bad }),
      ).toEqual({ ok: false, fields: { clientId: "INVALID" } });
    }
  });
});

describe("parseMessageQuery", () => {
  const query = (search: string) =>
    parseMessageQuery(new URLSearchParams(search));

  it("reads the latest page, after and before", () => {
    expect(query("")).toEqual({ direction: "latest" });
    expect(query("after=0")).toEqual({ direction: "after", id: 0 });
    expect(query("after=42")).toEqual({ direction: "after", id: 42 });
    expect(query("before=7")).toEqual({ direction: "before", id: 7 });
  });

  it("rejects bad values and both at once", () => {
    for (const bad of [
      "after=-1",
      "after=abc",
      "after=1.5",
      "after=",
      "before=99999999999",
      "after=2147483648",
      "after=1&before=5",
    ]) {
      expect(query(bad)).toBe(null);
    }
  });
});

describe("visibleMessages", () => {
  it("shows team messages and the player's own private ones", () => {
    expect(visibleMessages({ teamId: "t1", participantId: "p1" })).toEqual({
      teamId: "t1",
      OR: [{ type: "TEAM" }, { senderId: "p1" }, { recipientId: "p1" }],
    });
  });
});

describe("toMessageDTO", () => {
  const message = {
    id: 3,
    teamId: "t1",
    type: "PRIVATE" as const,
    text: "hola",
    senderId: "p1",
    recipientId: "p2",
    clientId,
    createdAt: new Date("2026-11-12T15:00:00Z"),
    sender: { id: "p1", nickname: "Ana" },
    recipient: { id: "p2", nickname: "Bruno" },
  };

  it("marks the sender's own messages", () => {
    expect(toMessageDTO(message, "p1")).toEqual({
      id: 3,
      type: "PRIVATE",
      text: "hola",
      from: { id: "p1", nickname: "Ana" },
      to: { id: "p2", nickname: "Bruno" },
      mine: true,
      clientId,
      createdAt: "2026-11-12T15:00:00.000Z",
    });
    expect(toMessageDTO(message, "p2").mine).toBe(false);
  });
});
