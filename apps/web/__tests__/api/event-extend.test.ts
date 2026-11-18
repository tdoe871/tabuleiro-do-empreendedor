/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

import { STAFF_SESSION_COOKIE, createStaffSession } from "@/lib/auth/session";
import {
  DEFAULT_EVENT_DURATION_MINUTES,
  parseCreateEventBody,
  planExtension,
} from "@/features/event/server/event";

// POST /api/events/:id/extend against a small fake of Prisma, plus the pure
// rules: the event's length picked at creation (1-48 h, 24 by default) and
// extending a running event.

const SECRET = "test-secret-at-least-32-characters-long!!";
const HOUR = 3_600_000;

type FakeEvent = {
  id: string;
  hostId: string;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "FINISHED";
  startedAt: Date | null;
  endsAt: Date | null;
};
type Call = { op: string; args: unknown };
const mockCalls: Call[] = [];
const mockState: { event: FakeEvent; raceOnce: boolean } = {
  event: {} as FakeEvent,
  raceOnce: false,
};

jest.mock("@tdoe/db", () => {
  const actual = jest.requireActual("@tdoe/db");
  const full = () => ({
    ...mockState.event,
    code: "ABC123",
    name: "Hackathon",
    mode: "SCHOOL",
    scenario: null,
    maxTeams: 10,
    maxTeamSize: 5,
    mentorCode: null,
    timerMode: "GLOBAL",
    durationMinutes: 24 * 60,
    activityEndsAt: null,
    activitySeconds: null,
    activityVisible: false,
    challengeKey: null,
    challengeText: null,
    chatEnabled: true,
    submissionsEnabled: true,
    joinsEnabled: true,
    createdAt: new Date(0),
  });
  const prisma = {
    staff: {
      findUnique: async () => ({
        id: "staff-1",
        name: "Ana",
        email: "ana@test.dev",
        passwordChangedAt: null,
      }),
    },
    event: {
      findFirst: async ({
        where,
      }: {
        where: { id: string; hostId: string };
      }) =>
        where.id === mockState.event.id &&
        where.hostId === mockState.event.hostId
          ? full()
          : null,
      updateMany: async (args: {
        where: { id: string; status: string; endsAt: Date | null };
        data: { endsAt: Date };
      }) => {
        mockCalls.push({ op: "event.updateMany", args });
        if (mockState.raceOnce) {
          // Another click moved the end time first.
          mockState.raceOnce = false;
          mockState.event.endsAt = new Date(
            mockState.event.endsAt!.getTime() + 15 * 60_000,
          );
          return { count: 0 };
        }
        const e = mockState.event;
        const same =
          args.where.id === e.id &&
          args.where.status === e.status &&
          args.where.endsAt?.getTime() === e.endsAt?.getTime();
        if (!same) return { count: 0 };
        e.endsAt = args.data.endsAt;
        return { count: 1 };
      },
      findUniqueOrThrow: async () => full(),
    },
    activityLog: {
      createMany: async (args: unknown) => {
        mockCalls.push({ op: "activityLog.createMany", args });
        return { count: 1 };
      },
    },
  };
  return { ...actual, prisma };
});

const mockNotify = jest.fn();
jest.mock("@/lib/realtime/server", () => ({
  ...jest.requireActual("@/lib/realtime/server"),
  notify: (...args: unknown[]) => mockNotify(...args),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { POST } = require("@/app/api/events/[id]/extend/route");

async function extend(
  minutes: unknown,
  { eventId = "event-1", signedIn = true } = {},
) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (signedIn) {
    headers.cookie = `${STAFF_SESSION_COOKIE}=${await createStaffSession("staff-1")}`;
  }
  const request = new NextRequest(
    `http://localhost/api/events/${eventId}/extend`,
    { method: "POST", headers, body: JSON.stringify({ minutes }) },
  );
  const res: Response = await POST(request, {
    params: Promise.resolve({ id: eventId }),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

const ops = () => mockCalls.map((call) => call.op);

const originalSecret = process.env.AUTH_SECRET;
beforeAll(() => {
  process.env.AUTH_SECRET = SECRET;
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterAll(() => {
  process.env.AUTH_SECRET = originalSecret;
  jest.restoreAllMocks();
});
beforeEach(() => {
  mockCalls.length = 0;
  mockNotify.mockClear();
  mockState.raceOnce = false;
  // Started 2 h ago, 24 h long: 22 h left.
  const startedAt = new Date(Date.now() - 2 * HOUR);
  mockState.event = {
    id: "event-1",
    hostId: "staff-1",
    status: "ACTIVE",
    startedAt,
    endsAt: new Date(startedAt.getTime() + 24 * HOUR),
  };
});

describe("POST /api/events/:id/extend", () => {
  it("moves the end time later, logs it and tells everyone to reload", async () => {
    const before = mockState.event.endsAt!.getTime();
    const res = await extend(30);
    expect(res.status).toBe(200);
    expect(Date.parse(res.body.event.endsAt)).toBe(before + 30 * 60_000);
    expect(ops()).toEqual(["event.updateMany", "activityLog.createMany"]);

    const log = (
      mockCalls[1]!.args as {
        data: { action: string; details: Record<string, unknown> }[];
      }
    ).data[0]!;
    expect(log.action).toBe("EVENT_EXTENDED");
    expect(log.details).toEqual({
      minutes: 30,
      from: new Date(before).toISOString(),
      to: new Date(before + 30 * 60_000).toISOString(),
    });
    // Players (event) and the educator (overview).
    const signals = (mockNotify.mock.calls[0] as { signal: string }[]).map(
      (n) => n.signal,
    );
    expect(signals).toEqual(["event", "overview"]);
  });

  it("also works while paused", async () => {
    mockState.event.status = "PAUSED";
    const res = await extend(60);
    expect(res.status).toBe(200);
  });

  it("reopens the board from now when the time already ran out", async () => {
    mockState.event.startedAt = new Date(Date.now() - 25 * HOUR);
    mockState.event.endsAt = new Date(Date.now() - HOUR);
    const res = await extend(60);
    expect(res.status).toBe(200);
    const left = Date.parse(res.body.event.endsAt) - Date.now();
    expect(left).toBeGreaterThan(59 * 60_000);
    expect(left).toBeLessThanOrEqual(60 * 60_000);
  });

  it("keeps both extensions when two clicks race", async () => {
    const before = mockState.event.endsAt!.getTime();
    mockState.raceOnce = true;
    const res = await extend(30);
    expect(res.status).toBe(200);
    // 15 min from the other click + this 30.
    expect(Date.parse(res.body.event.endsAt)).toBe(before + 45 * 60_000);
    expect(ops().filter((op) => op === "event.updateMany")).toHaveLength(2);
  });

  it("refuses a finished event", async () => {
    mockState.event.status = "FINISHED";
    const res = await extend(30);
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "EVENT_FINISHED" });
    expect(ops()).toEqual([]);
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it("refuses an event that has not started", async () => {
    mockState.event = {
      ...mockState.event,
      status: "DRAFT",
      startedAt: null,
      endsAt: null,
    };
    const res = await extend(30);
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "EVENT_NOT_ACTIVE" });
  });

  it("never lets the event pass 48 h from its start", async () => {
    // 24 h event: +12 h is fine, then another +12 h passes 48.
    mockState.event.endsAt = new Date(
      mockState.event.startedAt!.getTime() + 40 * HOUR,
    );
    const res = await extend(12 * 60);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "VALIDATION_ERROR",
      fields: { minutes: "TOO_LONG" },
    });
    expect(ops()).toEqual([]);
  });

  it("validates minutes", async () => {
    for (const minutes of [0, -5, 1.5, "30", null, 12 * 60 + 1]) {
      const res = await extend(minutes);
      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: "VALIDATION_ERROR",
        fields: { minutes: "INVALID" },
      });
    }
    expect(ops()).toEqual([]);
  });

  it("does not touch another educator's event", async () => {
    const res = await extend(30, { eventId: "event-2" });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "EVENT_NOT_FOUND" });
    expect(ops()).toEqual([]);
  });

  it("needs an educator session (players and mentors cannot extend)", async () => {
    const res = await extend(30, { signedIn: false });
    expect(res.status).toBe(401);
    expect(ops()).toEqual([]);
  });
});

describe("planExtension", () => {
  const now = new Date("2026-11-13T09:00:00Z");
  const startedAt = new Date("2026-11-12T09:00:00Z");
  it("adds to the end time while there is time left", () => {
    const plan = planExtension(
      { status: "ACTIVE", startedAt, endsAt: new Date("2026-11-13T10:00:00Z") },
      30,
      now,
    );
    expect(plan).toEqual({
      ok: true,
      endsAt: new Date("2026-11-13T10:30:00Z"),
    });
  });
  it("adds from now once the time ran out", () => {
    const plan = planExtension(
      { status: "ACTIVE", startedAt, endsAt: new Date("2026-11-13T08:00:00Z") },
      60,
      now,
    );
    expect(plan).toEqual({
      ok: true,
      endsAt: new Date("2026-11-13T10:00:00Z"),
    });
  });
  it("allows exactly 48 h in total", () => {
    const plan = planExtension(
      { status: "ACTIVE", startedAt, endsAt: new Date("2026-11-14T08:00:00Z") },
      60,
      now,
    );
    expect(plan).toEqual({
      ok: true,
      endsAt: new Date("2026-11-14T09:00:00Z"),
    });
  });
  it("refuses an event without the global clock", () => {
    const plan = planExtension(
      { status: "ACTIVE", startedAt, endsAt: null },
      30,
      now,
    );
    expect(plan).toEqual({
      ok: false,
      error: "VALIDATION_ERROR",
      fields: { timerMode: "NO_GLOBAL_CLOCK" },
    });
  });
});

describe("parseCreateEventBody: event length", () => {
  const base = {
    titulo: "Hackathon",
    modo: "escolar",
    numEquipes: 10,
    integrantes: 4,
  };
  it("defaults to 24 h when the client does not send it", () => {
    const parsed = parseCreateEventBody(base);
    expect(parsed.ok && parsed.data.durationMinutes).toBe(
      DEFAULT_EVENT_DURATION_MINUTES,
    );
  });
  it("takes 1 to 48 whole hours", () => {
    for (const [hours, minutes] of [
      [1, 60],
      [8, 480],
      [48, 2880],
    ] as const) {
      const parsed = parseCreateEventBody({ ...base, duracaoHoras: hours });
      expect(parsed.ok && parsed.data.durationMinutes).toBe(minutes);
    }
  });
  it("rejects anything else", () => {
    for (const hours of [0, 49, 2.5, "24", null]) {
      const parsed = parseCreateEventBody({ ...base, duracaoHoras: hours });
      expect(parsed).toEqual({
        ok: false,
        fields: { duracaoHoras: "INVALID" },
      });
    }
  });
});
