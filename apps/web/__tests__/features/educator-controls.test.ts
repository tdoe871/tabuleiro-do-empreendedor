/**
 * @jest-environment node
 */
import {
  computeAlerts,
  NO_SUBMISSION_WARNING_MINUTES,
  STUCK_AFTER_MINUTES,
  type AlertTeam,
} from "@/features/event/server/alerts";
import {
  MAX_ACTIVITY_MINUTES,
  MAX_CHALLENGE_TEXT_LENGTH,
  parseActivityBody,
  parseChallengeBody,
  toActivityTimerDTO,
  toChallengeCardDTO,
} from "@/features/event/server/controls";
import { toCsv } from "@/lib/csv";

const minutes = (n: number) => n * 60_000;

describe("activity timer", () => {
  it("accepts whole minutes in range and an optional visibility", () => {
    expect(parseActivityBody({ minutes: 15 })).toEqual({
      ok: true,
      data: { minutes: 15, visible: null },
    });
    expect(parseActivityBody({ minutes: 5, visible: true })).toEqual({
      ok: true,
      data: { minutes: 5, visible: true },
    });
  });

  it("rejects bad minutes and visibility", () => {
    for (const bad of [0, MAX_ACTIVITY_MINUTES + 1, 2.5, "15", undefined]) {
      expect(parseActivityBody({ minutes: bad })).toEqual({
        ok: false,
        fields: { minutes: "INVALID" },
      });
    }
    expect(parseActivityBody({ minutes: 5, visible: "yes" })).toEqual({
      ok: false,
      fields: { visible: "INVALID" },
    });
  });

  it("builds the DTO only while it runs", () => {
    const endsAt = new Date("2026-11-12T15:15:00Z");
    expect(
      toActivityTimerDTO({
        activityEndsAt: endsAt,
        activitySeconds: 900,
        activityVisible: true,
      }),
    ).toEqual({ endsAt: endsAt.toISOString(), seconds: 900, visible: true });
    expect(
      toActivityTimerDTO({
        activityEndsAt: null,
        activitySeconds: null,
        activityVisible: true,
      }),
    ).toBe(null);
  });
});

describe("challenge card", () => {
  it("takes a key id and trims the text", () => {
    expect(
      parseChallengeBody({ key: "parcerias", text: "  ¿Con quién?  " }),
    ).toEqual({ ok: true, data: { key: "PARCERIAS", text: "¿Con quién?" } });
  });

  it("rejects unknown keys, empty and long text", () => {
    expect(parseChallengeBody({ key: "PARCERIAS", text: "x" })).toEqual({
      ok: false,
      fields: { key: "INVALID" },
    });
    expect(parseChallengeBody({ key: "problema", text: " " })).toEqual({
      ok: false,
      fields: { text: "REQUIRED" },
    });
    expect(
      parseChallengeBody({
        key: "problema",
        text: "a".repeat(MAX_CHALLENGE_TEXT_LENGTH + 1),
      }),
    ).toEqual({ ok: false, fields: { text: "TOO_LONG" } });
  });

  it("builds the DTO with the lowercase key", () => {
    const sentAt = new Date("2026-11-12T16:00:00Z");
    expect(
      toChallengeCardDTO({
        challengeKey: "SOLUCAO",
        challengeText: "Reto",
        challengeSentAt: sentAt,
      }),
    ).toEqual({ key: "solucao", text: "Reto", sentAt: sentAt.toISOString() });
    expect(
      toChallengeCardDTO({
        challengeKey: null,
        challengeText: null,
        challengeSentAt: null,
      }),
    ).toBe(null);
  });
});

describe("computeAlerts", () => {
  const now = new Date("2026-11-13T10:00:00Z");
  const startedAt = new Date(now.getTime() - minutes(600));
  const endsAt = new Date(now.getTime() + minutes(600));
  const team = (overrides: Partial<AlertTeam> = {}): AlertTeam => ({
    id: "t1",
    name: "Equipo",
    createdAt: startedAt,
    memberCount: 3,
    lastCompletedAt: new Date(now.getTime() - minutes(5)),
    allKeysDone: false,
    hasSubmission: false,
    ...overrides,
  });
  const active = { status: "ACTIVE" as const, startedAt, endsAt };

  it("is quiet for a healthy team", () => {
    expect(computeAlerts(active, [team()], now)).toEqual([]);
  });

  it("flags a team stuck for an hour, with the idle minutes", () => {
    const [alert] = computeAlerts(
      active,
      [team({ lastCompletedAt: new Date(now.getTime() - minutes(75)) })],
      now,
    );
    expect(alert).toMatchObject({
      id: "TEAM_STUCK:t1",
      type: "TEAM_STUCK",
      severity: "WARNING",
      team: { id: "t1", name: "Equipo" },
      minutes: 75,
    });
  });

  it("counts from the start (or team creation) when nothing is done yet", () => {
    const fresh = team({
      lastCompletedAt: null,
      createdAt: new Date(now.getTime() - minutes(STUCK_AFTER_MINUTES - 1)),
    });
    expect(computeAlerts(active, [fresh], now)).toEqual([]);
    expect(
      computeAlerts(active, [team({ lastCompletedAt: null })], now)[0]?.type,
    ).toBe("TEAM_STUCK");
  });

  it("does not flag finished teams or paused sessions as stuck", () => {
    const old = new Date(now.getTime() - minutes(300));
    expect(
      computeAlerts(
        active,
        [team({ lastCompletedAt: old, allKeysDone: true })],
        now,
      ),
    ).toEqual([]);
    expect(
      computeAlerts(
        { ...active, status: "PAUSED" },
        [team({ lastCompletedAt: old })],
        now,
      ),
    ).toEqual([]);
  });

  it("warns about missing deliveries near the end, critical at the end", () => {
    const soon = (left: number) => ({
      ...active,
      endsAt: new Date(now.getTime() + minutes(left)),
    });
    expect(
      computeAlerts(soon(NO_SUBMISSION_WARNING_MINUTES + 1), [team()], now),
    ).toEqual([]);
    expect(computeAlerts(soon(90), [team()], now)[0]).toMatchObject({
      type: "NO_SUBMISSION",
      severity: "WARNING",
      minutes: 90,
    });
    expect(computeAlerts(soon(20), [team()], now)[0]?.severity).toBe(
      "CRITICAL",
    );
    expect(
      computeAlerts(soon(20), [team({ hasSubmission: true })], now),
    ).toEqual([]);
  });

  it("flags teams below the minimum size, and sorts by severity", () => {
    const alerts = computeAlerts(
      { ...active, endsAt: new Date(now.getTime() + minutes(10)) },
      [team({ id: "a", name: "A", memberCount: 1 })],
      now,
    );
    expect(alerts.map((a) => [a.type, a.severity])).toEqual([
      ["NO_SUBMISSION", "CRITICAL"],
      ["TEAM_INCOMPLETE", "INFO"],
    ]);
  });

  it("is silent before the start and after the end", () => {
    const stuck = team({ lastCompletedAt: null, memberCount: 1 });
    expect(computeAlerts({ ...active, status: "DRAFT" }, [stuck], now)).toEqual(
      [],
    );
    expect(
      computeAlerts({ ...active, status: "FINISHED" }, [stuck], now),
    ).toEqual([]);
  });
});

describe("toCsv", () => {
  it("adds a BOM, quotes what needs it and neutralizes formulas", () => {
    const csv = toCsv([
      ["Equipo", "Nota"],
      ['Los "Innovadores", MX', "línea 1\nlínea 2"],
      ['=HYPERLINK("x")', null],
      [new Date("2026-11-13T10:00:00Z"), 4.5],
    ]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv.slice(1).split("\r\n")).toEqual([
      "Equipo,Nota",
      '"Los ""Innovadores"", MX","línea 1\nlínea 2"',
      '"\'=HYPERLINK(""x"")",',
      "2026-11-13T10:00:00.000Z,4.5",
    ]);
  });
});
