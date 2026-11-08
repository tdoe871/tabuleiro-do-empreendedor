/**
 * @jest-environment node
 */
import type { Event } from "@tdoe/db";

import {
  DEFAULT_EVENT_DURATION_MINUTES,
  parseCreateEventBody,
  planStatusChange,
  toEventDTO,
} from "@/features/event/server/event";
import { computeKeyStatuses } from "@/features/event/server/progress";
import { CODE_ALPHABET, generateCode } from "@/lib/codes";

const validBody = {
  titulo: "Hackathon MTY",
  modo: "escolar",
  cenario: null,
  numEquipes: 60,
  integrantes: 5,
};

describe("parseCreateEventBody", () => {
  it("maps the frontend body to the event fields", () => {
    expect(parseCreateEventBody(validBody)).toEqual({
      ok: true,
      data: {
        name: "Hackathon MTY",
        mode: "SCHOOL",
        scenario: null,
        maxTeams: 60,
        maxTeamSize: 5,
        durationMinutes: DEFAULT_EVENT_DURATION_MINUTES,
      },
    });
  });

  it("requires a scenario only for custom sessions", () => {
    expect(
      parseCreateEventBody({ ...validBody, modo: "personalizado" }),
    ).toEqual({ ok: false, fields: { cenario: "REQUIRED" } });

    const custom = parseCreateEventBody({
      ...validBody,
      modo: "personalizado",
      cenario: "  Una comunidad rural  ",
    });
    expect(custom.ok && custom.data).toMatchObject({
      mode: "CUSTOM",
      scenario: "Una comunidad rural",
    });

    const school = parseCreateEventBody({ ...validBody, cenario: "ignorado" });
    expect(school.ok && school.data.scenario).toBeNull();
  });

  it("reports every invalid field at once", () => {
    expect(
      parseCreateEventBody({
        titulo: "   ",
        modo: "otro",
        numEquipes: 0,
        integrantes: 6,
      }),
    ).toEqual({
      ok: false,
      fields: {
        titulo: "REQUIRED",
        modo: "INVALID",
        numEquipes: "INVALID",
        integrantes: "INVALID",
      },
    });
  });

  it("accepts team sizes from 2 to 5 only, as integers", () => {
    for (const integrantes of [2, 3, 4, 5]) {
      expect(parseCreateEventBody({ ...validBody, integrantes }).ok).toBe(true);
    }
    for (const integrantes of [1, 6, 2.5, "4", undefined]) {
      expect(parseCreateEventBody({ ...validBody, integrantes }).ok).toBe(
        false,
      );
    }
  });
});

describe("planStatusChange", () => {
  const now = new Date("2026-11-12T15:00:00Z");
  const draft = {
    status: "DRAFT" as const,
    timerMode: "GLOBAL" as const,
    durationMinutes: 24 * 60,
    endsAt: null,
  };

  it("starts the global timer on the first start", () => {
    expect(planStatusChange(draft, "ACTIVE", now)).toEqual({
      ok: true,
      noop: false,
      data: {
        status: "ACTIVE",
        startedAt: now,
        endsAt: new Date("2026-11-13T15:00:00Z"),
      },
    });
  });

  it("pauses and resumes without moving the clock", () => {
    const active = {
      ...draft,
      status: "ACTIVE" as const,
      endsAt: new Date("2026-11-13T15:00:00Z"),
    };
    expect(planStatusChange(active, "PAUSED", now)).toEqual({
      ok: true,
      noop: false,
      data: { status: "PAUSED" },
    });
    expect(
      planStatusChange({ ...active, status: "PAUSED" }, "ACTIVE", now),
    ).toEqual({ ok: true, noop: false, data: { status: "ACTIVE" } });
  });

  it("finishing pulls endsAt in to now, but never later", () => {
    const active = {
      ...draft,
      status: "ACTIVE" as const,
      endsAt: new Date("2026-11-13T15:00:00Z"),
    };
    expect(planStatusChange(active, "FINISHED", now)).toEqual({
      ok: true,
      noop: false,
      data: { status: "FINISHED", endsAt: now },
    });

    const past = new Date("2026-11-12T10:00:00Z");
    expect(
      planStatusChange({ ...active, endsAt: past }, "FINISHED", now),
    ).toMatchObject({ data: { endsAt: past } });
  });

  it("treats the same status as a no-op and rejects the rest", () => {
    expect(planStatusChange(draft, "FINISHED", now).ok).toBe(true);
    expect(
      planStatusChange({ ...draft, status: "ACTIVE" }, "ACTIVE", now),
    ).toEqual({ ok: true, noop: true });
    expect(planStatusChange(draft, "PAUSED", now)).toEqual({ ok: false });
    for (const target of ["ACTIVE", "PAUSED"] as const) {
      expect(
        planStatusChange({ ...draft, status: "FINISHED" }, target, now),
      ).toEqual({ ok: false });
    }
  });
});

describe("toEventDTO", () => {
  it("uses the frontend's mode values and ISO dates", () => {
    const event = {
      id: "e1",
      code: "QATEST",
      mentorCode: null,
      activityEndsAt: null,
      activitySeconds: null,
      activityVisible: false,
      challengeKey: null,
      challengeText: null,
      challengeSentAt: null,
      name: "Prueba",
      mode: "CUSTOM",
      scenario: "Escenario",
      status: "ACTIVE",
      timerMode: "GLOBAL",
      durationMinutes: 1440,
      maxTeams: 60,
      maxTeamSize: 5,
      startedAt: new Date("2026-11-12T15:00:00Z"),
      endsAt: null,
      hostId: "s1",
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies Event;
    expect(toEventDTO(event)).toMatchObject({
      mode: "personalizado",
      startedAt: "2026-11-12T15:00:00.000Z",
      endsAt: null,
    });
    expect(toEventDTO(event)).not.toHaveProperty("hostId");
  });
});

describe("computeKeyStatuses", () => {
  const done = (key: "PROBLEMA" | "SOLUCAO", orders: number[]) =>
    orders.map((order) => ({ key, order }));

  it("starts with problema active and the rest locked", () => {
    expect(computeKeyStatuses([])).toEqual({
      problema: "ativa",
      solucao: "bloqueada",
      parcerias: "bloqueada",
      oportunidades: "bloqueada",
    });
  });

  it("moves to the next key once the 3 phases are done", () => {
    expect(computeKeyStatuses(done("PROBLEMA", [1, 2]))).toMatchObject({
      problema: "ativa",
      solucao: "bloqueada",
    });
    expect(
      computeKeyStatuses([
        ...done("PROBLEMA", [1, 2, 3]),
        ...done("SOLUCAO", [1]),
      ]),
    ).toEqual({
      problema: "concluida",
      solucao: "ativa",
      parcerias: "bloqueada",
      oportunidades: "bloqueada",
    });
  });

  it("ignores duplicated phase rows", () => {
    expect(computeKeyStatuses(done("PROBLEMA", [1, 1, 1])).problema).toBe(
      "ativa",
    );
  });
});

describe("generateCode", () => {
  it("uses 6 characters from the unambiguous alphabet", () => {
    for (let i = 0; i < 100; i++) {
      const code = generateCode();
      expect(code).toHaveLength(6);
      expect([...code].every((c) => CODE_ALPHABET.includes(c))).toBe(true);
    }
  });
});
