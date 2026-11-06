/**
 * @jest-environment node
 */
import { SignJWT } from "jose";
import type { Event, Participant, Team } from "@tdoe/db";

import {
  buildBoard,
  checkPhaseCompletion,
  type CompletedPhase,
} from "@/features/event/server/board";
import {
  canJoinEvent,
  canPlay,
  nicknameError,
  normalizeCode,
  sameName,
  teamNameError,
} from "@/features/team/server/team";
import {
  createPlayerSession,
  createStaffSession,
  verifyPlayerSession,
  verifyStaffSession,
} from "@/lib/auth/session";

const now = new Date("2026-11-12T15:00:00Z");
const later = new Date("2026-11-13T15:00:00Z");
const earlier = new Date("2026-11-12T10:00:00Z");

describe("team and nickname rules", () => {
  it("validates names and nicknames", () => {
    expect(teamNameError("Los Innovadores")).toBeNull();
    expect(teamNameError("  ")).toBe("REQUIRED");
    expect(teamNameError("x".repeat(41))).toBe("TOO_LONG");
    expect(nicknameError("Ana")).toBeNull();
    expect(nicknameError(undefined)).toBe("REQUIRED");
    expect(nicknameError("x".repeat(31))).toBe("TOO_LONG");
  });

  it("normalizes codes and compares names without case", () => {
    expect(normalizeCode(" k7xm2q ")).toBe("K7XM2Q");
    expect(normalizeCode(null)).toBe("");
    expect(sameName(" Ana ", "ana")).toBe(true);
    expect(sameName("Ana", "Anna")).toBe(false);
  });

  it("lets teams form until the event is over", () => {
    expect(canJoinEvent({ status: "DRAFT", endsAt: null }, now)).toBe("ok");
    expect(canJoinEvent({ status: "PAUSED", endsAt: later }, now)).toBe("ok");
    expect(canJoinEvent({ status: "ACTIVE", endsAt: earlier }, now)).toBe(
      "EVENT_FINISHED",
    );
    expect(canJoinEvent({ status: "FINISHED", endsAt: null }, now)).toBe(
      "EVENT_FINISHED",
    );
  });

  it("only lets players act while ACTIVE with time left", () => {
    expect(canPlay({ status: "ACTIVE", endsAt: later }, now)).toBe("ok");
    expect(canPlay({ status: "DRAFT", endsAt: null }, now)).toBe(
      "EVENT_NOT_ACTIVE",
    );
    expect(canPlay({ status: "PAUSED", endsAt: later }, now)).toBe(
      "EVENT_NOT_ACTIVE",
    );
    expect(canPlay({ status: "ACTIVE", endsAt: earlier }, now)).toBe(
      "EVENT_FINISHED",
    );
  });
});

describe("checkPhaseCompletion", () => {
  const done = (
    key: "PROBLEMA" | "SOLUCAO",
    orders: number[],
  ): { key: "PROBLEMA" | "SOLUCAO"; order: number }[] =>
    orders.map((order) => ({ key, order }));

  it("only allows the next phase of the active key", () => {
    expect(checkPhaseCompletion([], "PROBLEMA", 1)).toBe("ok");
    expect(checkPhaseCompletion([], "PROBLEMA", 2)).toBe("PHASE_LOCKED");
    expect(checkPhaseCompletion([], "SOLUCAO", 1)).toBe("KEY_LOCKED");
    expect(checkPhaseCompletion(done("PROBLEMA", [1]), "PROBLEMA", 2)).toBe(
      "ok",
    );
  });

  it("opens the next key after the 3rd phase", () => {
    const problemaDone = done("PROBLEMA", [1, 2, 3]);
    expect(checkPhaseCompletion(problemaDone, "SOLUCAO", 1)).toBe("ok");
    expect(checkPhaseCompletion(problemaDone, "PARCERIAS" as never, 1)).toBe(
      "KEY_LOCKED",
    );
  });

  it("reports a phase that is already done", () => {
    expect(checkPhaseCompletion(done("PROBLEMA", [1]), "PROBLEMA", 1)).toBe(
      "ALREADY_DONE",
    );
  });
});

describe("buildBoard", () => {
  const event = {
    id: "e1",
    code: "QATEST",
    name: "Prueba",
    mode: "SCHOOL",
    scenario: null,
    status: "ACTIVE",
    timerMode: "GLOBAL",
    durationMinutes: 1440,
    maxTeams: 60,
    maxTeamSize: 5,
    startedAt: earlier,
    endsAt: later,
    hostId: "s1",
    createdAt: earlier,
    updatedAt: earlier,
  } satisfies Event;
  const team = {
    id: "t1",
    eventId: "e1",
    name: "Los Innovadores",
    joinCode: "K7XM2Q",
    score: 0,
    createdAt: earlier,
  } satisfies Team;
  const participant = (id: string, nickname: string): Participant => ({
    id,
    teamId: "t1",
    nickname,
    role: id === "p1" ? "LEADER" : "MEMBER",
    rpgRole: null,
    joinedAt: earlier,
  });
  const me = participant("p1", "Eddy");
  const ana = participant("p2", "Ana");
  const phase = (
    key: CompletedPhase["key"],
    order: number,
  ): CompletedPhase => ({ key, order, content: `r${order}`, completedAt: now });

  it("matches PlayerBoard's state shape for a new team", () => {
    const board = buildBoard({
      event,
      team,
      me,
      members: [me, ana],
      completed: [],
      submission: null,
      now,
    });
    expect(board.keys.problema).toEqual({
      status: "ativa",
      phases: {
        1: { status: "disponivel" },
        2: { status: "bloqueada" },
        3: { status: "bloqueada" },
      },
    });
    expect(board.keys.solucao.status).toBe("bloqueada");
    expect(board.me.nickname).toBe("Eddy");
    expect(board.members.map((m) => m.nickname)).toEqual(["Ana"]);
    expect(board.event.playable).toBe(true);
    expect(board.cartaAtiva).toBeNull();
  });

  it("carries answers and moves to the next key", () => {
    const board = buildBoard({
      event: { ...event, status: "PAUSED" },
      team,
      me,
      members: [me],
      completed: [
        phase("PROBLEMA", 1),
        phase("PROBLEMA", 2),
        phase("PROBLEMA", 3),
        phase("SOLUCAO", 1),
      ],
      submission: null,
      now,
    });
    expect(board.keys.problema.status).toBe("concluida");
    expect(board.keys.problema.phases[2]).toEqual({
      status: "concluida",
      conteudo: "r2",
      completedAt: now.toISOString(),
    });
    expect(board.keys.solucao.status).toBe("ativa");
    expect(board.keys.solucao.phases[2]?.status).toBe("disponivel");
    expect(board.keys.parcerias.phases[1]?.status).toBe("bloqueada");
    expect(board.event.playable).toBe(false);
  });
});

describe("player session", () => {
  const original = process.env.AUTH_SECRET;
  const secret = "test-secret-with-at-least-32-characters!!";
  beforeEach(() => {
    process.env.AUTH_SECRET = secret;
  });
  afterAll(() => {
    process.env.AUTH_SECRET = original;
  });

  it("round-trips participant, team and event", async () => {
    const session = { participantId: "p1", teamId: "t1", eventId: "e1" };
    const token = await createPlayerSession(session);
    await expect(verifyPlayerSession(token)).resolves.toEqual(session);
  });

  it("does not accept a staff token as a player session, or vice versa", async () => {
    const staffToken = await createStaffSession("s1");
    await expect(verifyPlayerSession(staffToken)).resolves.toBeNull();
    const playerToken = await createPlayerSession({
      participantId: "p1",
      teamId: "t1",
      eventId: "e1",
    });
    await expect(verifyStaffSession(playerToken)).resolves.toBeNull();
  });

  it("rejects a player token missing its team", async () => {
    const token = await new SignJWT({ kind: "player", eventId: "e1" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("p1")
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(secret));
    await expect(verifyPlayerSession(token)).resolves.toBeNull();
  });
});
