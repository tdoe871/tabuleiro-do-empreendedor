/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

import { RUBRIC } from "@/features/mentor/server/rubric";
import {
  MENTOR_SESSION_COOKIE,
  PLAYER_SESSION_COOKIE,
  STAFF_SESSION_COOKIE,
  createMentorSession,
  createPlayerSession,
  createStaffSession,
} from "@/lib/auth/session";

// Authorization tests for every API route, against an in-memory fake of
// Prisma: who may call each endpoint, and that nobody reaches another
// educator's event, another event's team or another team's file. Business
// rules are covered in __tests__/features.

// ---------------------------------------------------------------------------
// Fake database
// ---------------------------------------------------------------------------

const event1 = { id: "event-1", hostId: "staff-1", status: "ACTIVE" };
const event2 = { id: "event-2", hostId: "staff-2", status: "ACTIVE" };
const team1 = { id: "team-1", eventId: "event-1", name: "Team 1" };
const team2 = { id: "team-2", eventId: "event-2", name: "Team 2" };

// Rows already carry the relations the auth helpers `include`.
const mockTables: Record<string, Record<string, unknown>[]> = {
  staff: [
    {
      id: "staff-1",
      name: "Ana",
      email: "ana@test.dev",
      passwordChangedAt: null,
    },
    {
      id: "staff-2",
      name: "Bia",
      email: "bia@test.dev",
      passwordChangedAt: null,
    },
    {
      id: "staff-revoked",
      name: "Caio",
      email: "caio@test.dev",
      // Far in the future: every token was issued before this change.
      passwordChangedAt: new Date("2100-01-01T00:00:00Z"),
    },
  ],
  event: [event1, event2],
  team: [
    { ...team1, event: event1 },
    { ...team2, event: event2 },
  ],
  participant: [
    { id: "player-1", teamId: "team-1", team: { ...team1, event: event1 } },
    // Moved to another team after their token was issued.
    { id: "player-moved", teamId: "team-2", team: { ...team2, event: event2 } },
  ],
  mentor: [{ id: "mentor-1", eventId: "event-1", event: event1 }],
  submissionFile: [
    {
      id: "file-2",
      teamId: "team-2",
      status: "READY",
      path: "team-2/file.pdf",
      fileName: "file.pdf",
      team: { eventId: "event-2", event: { hostId: "staff-2" } },
    },
  ],
};

const mockWrites: string[] = [];

jest.mock("@tdoe/db", () => {
  const READS = [
    "findFirst",
    "findUnique",
    "findFirstOrThrow",
    "findUniqueOrThrow",
  ];

  // Matches plain equality conditions; anything else ({ in: ... }, nested
  // filters) is treated as a match, so the fake errs towards finding rows.
  const matches = (row: Record<string, unknown>, where: unknown) =>
    Object.entries((where ?? {}) as Record<string, unknown>).every(
      ([key, value]) =>
        value === null || typeof value !== "object" ? row[key] === value : true,
    );

  const model = (name: string) =>
    new Proxy(
      {},
      {
        get:
          (_target, method: string) =>
          async (args: { where?: unknown } = {}) => {
            const rows = mockTables[name] ?? [];
            if (READS.includes(method)) {
              const row = rows.find((r) => matches(r, args.where)) ?? null;
              if (!row && method.endsWith("OrThrow"))
                throw new Error("not found");
              return row;
            }
            if (method === "findMany")
              return rows.filter((r) => matches(r, args.where));
            if (method === "count")
              return rows.filter((r) => matches(r, args.where)).length;
            // Conditional bulk writes ({ where: { id, hostId } }) are the safe
            // pattern: they only count as a write when a row matches.
            if (method === "updateMany" || method === "deleteMany") {
              const count = rows.filter((r) => matches(r, args.where)).length;
              if (count > 0) mockWrites.push(`${name}.${method}`);
              return { count };
            }
            mockWrites.push(`${name}.${method}`);
            return { count: 0 };
          },
      },
    );

  const prisma = new Proxy(
    {},
    {
      get: (_target, prop: string) => {
        if (prop.startsWith("$")) {
          return async () => {
            mockWrites.push(prop);
            throw new Error(`${prop} is not supported by the fake`);
          };
        }
        return model(prop);
      },
    },
  );

  return { ...jest.requireActual("@tdoe/db"), prisma };
});

// Realtime and storage talk to Supabase; authorization never gets that far.
jest.mock("@/lib/realtime/server", () => ({
  ...jest.requireActual("@/lib/realtime/server"),
  notify: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-require-imports */
type Handler = (
  request: NextRequest,
  context: { params: Promise<Record<string, string>> },
) => Promise<Response>;

function handler(path: string, method: string): Handler {
  const mod = require(`@/app/api/${path}/route`);
  return mod[method];
}
/* eslint-enable @typescript-eslint/no-require-imports */

type Route = {
  name: string;
  path: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  params?: Record<string, string>;
  query?: string;
  // A valid body, for routes that validate it before checking ownership.
  body?: unknown;
};

const route = (
  method: Route["method"],
  path: string,
  params?: Record<string, string>,
  query?: string,
): Route => {
  const url = Object.entries(params ?? {}).reduce(
    (acc, [key, value]) => acc.replace(`[${key}]`, value),
    path,
  );
  return {
    name: `${method} /api/${url}${query ?? ""}`,
    path,
    method,
    params,
    query,
  };
};

const E1 = { id: "event-1" };

const STAFF_ROUTES: Route[] = [
  route("GET", "events"),
  route("POST", "events"),
  route("GET", "events/[id]/activity", E1),
  route("PUT", "events/[id]/activity-timer", E1),
  route("PATCH", "events/[id]/activity-timer", E1),
  route("DELETE", "events/[id]/activity-timer", E1),
  route("GET", "events/[id]/announcements", E1),
  route("POST", "events/[id]/announcements", E1),
  route("DELETE", "events/[id]/announcements/[announcementId]", {
    ...E1,
    announcementId: "a1",
  }),
  route("PUT", "events/[id]/challenge-card", E1),
  route("DELETE", "events/[id]/challenge-card", E1),
  route("GET", "events/[id]/evaluations", E1),
  route("GET", "events/[id]/export", E1),
  route("POST", "events/[id]/mentor-code", E1),
  route("GET", "events/[id]/overview", E1),
  { ...route("PATCH", "events/[id]/status", E1), body: { status: "PAUSED" } },
  route("PATCH", "events/[id]/switches", E1),
  route("GET", "realtime", undefined, "?eventId=event-1"),
];

// Staff routes scoped to one event (all but the event list/creation).
const STAFF_EVENT_ROUTES = STAFF_ROUTES.filter((r) => r.params || r.query);

const PLAYER_ROUTES: Route[] = [
  route("GET", "board"),
  route("PUT", "board/keys/[key]/phases/[order]", {
    key: "problema",
    order: "1",
  }),
  route("GET", "messages"),
  route("POST", "messages"),
  route("PUT", "participants/me/rpg-role"),
  route("GET", "realtime"),
  route("GET", "submissions"),
  route("PUT", "submissions"),
  route("POST", "submissions/files"),
  route("DELETE", "submissions/files/[id]", { id: "file-2" }),
  route("POST", "submissions/files/[id]/confirm", { id: "file-2" }),
  route("POST", "teams/me/join-code"),
];

const MENTOR_ROUTES: Route[] = [
  route("GET", "mentor"),
  route("PUT", "mentor/evaluations/[teamId]", { teamId: "team-1" }),
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SECRET = "test-secret-at-least-32-characters-long!!";

async function call(
  r: Route,
  { cookie, body }: { cookie?: string; body?: unknown } = {},
) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (cookie) headers.cookie = cookie;
  const request = new NextRequest(
    `http://localhost/api/${r.path}${r.query ?? ""}`,
    {
      method: r.method,
      headers,
      body:
        r.method === "GET" ? undefined : JSON.stringify(body ?? r.body ?? {}),
    },
  );
  const res = await handler(r.path, r.method)(request, {
    params: Promise.resolve(r.params ?? {}),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

const cookies = {
  staff: async (id = "staff-1") =>
    `${STAFF_SESSION_COOKIE}=${await createStaffSession(id)}`,
  player: async (
    participantId = "player-1",
    teamId = "team-1",
    eventId = "event-1",
  ) =>
    `${PLAYER_SESSION_COOKIE}=${await createPlayerSession({ participantId, teamId, eventId })}`,
  mentor: async (mentorId = "mentor-1", eventId = "event-1") =>
    `${MENTOR_SESSION_COOKIE}=${await createMentorSession({ mentorId, eventId })}`,
};

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
  mockWrites.length = 0;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("without a session", () => {
  it.each(
    [...STAFF_ROUTES, ...PLAYER_ROUTES, ...MENTOR_ROUTES].map((r) => [
      r.name,
      r,
    ]),
  )("%s → 401 and writes nothing", async (_name, r) => {
    const res = await call(r as Route);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "UNAUTHORIZED" });
    expect(mockWrites).toEqual([]);
  });

  it("GET /api/submissions/files/:id → 401", async () => {
    const res = await call(
      route("GET", "submissions/files/[id]", { id: "file-2" }),
    );
    expect(res.status).toBe(401);
  });
});

describe("with the wrong kind of session", () => {
  it.each(STAFF_ROUTES.map((r) => [r.name, r]))(
    "educator route %s rejects player and mentor sessions",
    async (_name, r) => {
      for (const cookie of [await cookies.player(), await cookies.mentor()]) {
        expect((await call(r as Route, { cookie })).status).toBe(401);
      }
      expect(mockWrites).toEqual([]);
    },
  );

  it.each(PLAYER_ROUTES.map((r) => [r.name, r]))(
    "player route %s rejects educator and mentor sessions",
    async (_name, r) => {
      for (const cookie of [await cookies.staff(), await cookies.mentor()]) {
        expect((await call(r as Route, { cookie })).status).toBe(401);
      }
      expect(mockWrites).toEqual([]);
    },
  );

  it.each(MENTOR_ROUTES.map((r) => [r.name, r]))(
    "mentor route %s rejects educator and player sessions",
    async (_name, r) => {
      for (const cookie of [await cookies.staff(), await cookies.player()]) {
        expect((await call(r as Route, { cookie })).status).toBe(401);
      }
      expect(mockWrites).toEqual([]);
    },
  );
});

describe("another educator's event", () => {
  it.each(STAFF_EVENT_ROUTES.map((r) => [r.name, r]))(
    "%s answers EVENT_NOT_FOUND to staff-2 and writes nothing",
    async (_name, r) => {
      const res = await call(r as Route, {
        cookie: await cookies.staff("staff-2"),
      });
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ error: "EVENT_NOT_FOUND" });
      expect(mockWrites).toEqual([]);
    },
  );
});

describe("another event's team", () => {
  it("a mentor cannot grade a team of another event", async () => {
    const res = await call(
      route("PUT", "mentor/evaluations/[teamId]", { teamId: "team-2" }),
      {
        cookie: await cookies.mentor(),
        body: { scores: Object.fromEntries(RUBRIC.map((id) => [id, 4])) },
      },
    );
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "TEAM_NOT_FOUND" });
    expect(mockWrites).toEqual([]);
  });
});

describe("another team's file", () => {
  const download = route("GET", "submissions/files/[id]", { id: "file-2" });

  it.each([
    ["a player of another team", () => cookies.player()],
    ["the educator of another event", () => cookies.staff("staff-1")],
    ["a mentor of another event", () => cookies.mentor()],
  ])("%s gets FILE_NOT_FOUND, like a missing file", async (_who, cookie) => {
    const res = await call(download, { cookie: await cookie() });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "FILE_NOT_FOUND" });
  });
});

describe("revoked sessions", () => {
  it("a player moved to another team loses their old session", async () => {
    // Token says team-1, the database says team-2.
    const cookie = await cookies.player("player-moved", "team-1", "event-1");
    expect((await call(route("GET", "board"), { cookie })).status).toBe(401);
  });

  it("a player whose participant was deleted loses their session", async () => {
    const cookie = await cookies.player("player-deleted");
    expect((await call(route("GET", "board"), { cookie })).status).toBe(401);
  });

  it("an educator session issued before a password change is rejected", async () => {
    const cookie = await cookies.staff("staff-revoked");
    expect((await call(route("GET", "events"), { cookie })).status).toBe(401);
  });

  it("an educator whose account was deleted loses their session", async () => {
    const cookie = await cookies.staff("staff-deleted");
    expect((await call(route("GET", "events"), { cookie })).status).toBe(401);
  });

  it("a mentor moved to another event loses their session", async () => {
    const cookie = await cookies.mentor("mentor-1", "event-2");
    expect((await call(route("GET", "mentor"), { cookie })).status).toBe(401);
  });
});

describe("brute force on staff login", () => {
  it("blocks the 11th attempt from the same IP within 15 minutes", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const attempt = () =>
      POST(
        new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-forwarded-for": "203.0.113.7",
          },
          body: JSON.stringify({
            email: "nobody@test.dev",
            senha: "wrong-password",
          }),
        }),
      );

    for (let i = 0; i < 10; i++) {
      expect((await attempt()).status).toBe(401);
    }
    const blocked = await attempt();
    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toEqual({ error: "RATE_LIMITED" });
  }, 30_000);
});
