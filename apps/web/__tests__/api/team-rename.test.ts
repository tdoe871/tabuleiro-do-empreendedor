/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

import { STAFF_SESSION_COOKIE, createStaffSession } from "@/lib/auth/session";
import { teamNameTakenBy } from "@/features/team/server/team";
import { withCurrentTeamName } from "@/features/activity/server/actions";

// PATCH /api/events/:id/teams/:teamId against a small fake of Prisma: only
// the educator who owns the event renames a team, with the same name rules
// as creating one, and the team and the overview are told to reload.

const SECRET = "test-secret-at-least-32-characters-long!!";

type Call = { op: string; args: unknown };
const mockCalls: Call[] = [];
const mockState = {
  teams: [] as { id: string; name: string }[],
  // The database's own unique (eventId, name) fails the update.
  uniqueViolation: false,
};

jest.mock("@tdoe/db", () => {
  const actual = jest.requireActual("@tdoe/db");
  const tx = {
    $queryRaw: async () => {
      mockCalls.push({ op: "lock", args: null });
      return [];
    },
    team: {
      findMany: async (args: unknown) => {
        mockCalls.push({ op: "team.findMany", args });
        return mockState.teams.map((t) => ({ ...t }));
      },
      update: async (args: {
        where: { id: string };
        data: { name: string };
      }) => {
        mockCalls.push({ op: "team.update", args });
        if (mockState.uniqueViolation) {
          throw new actual.Prisma.PrismaClientKnownRequestError("taken", {
            code: "P2002",
            clientVersion: "test",
          });
        }
        return { id: args.where.id, name: args.data.name };
      },
    },
  };
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
        where.id === "event-1" && where.hostId === "staff-1"
          ? { id: "event-1", hostId: "staff-1" }
          : null,
    },
    activityLog: {
      createMany: async (args: unknown) => {
        mockCalls.push({ op: "activityLog.createMany", args });
        return { count: 1 };
      },
    },
    $transaction: async (fn: (client: typeof tx) => Promise<unknown>) => {
      mockCalls.push({ op: "$transaction", args: null });
      return fn(tx);
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
const { PATCH } = require("@/app/api/events/[id]/teams/[teamId]/route");

async function rename(
  name: unknown,
  { eventId = "event-1", teamId = "team-1", signedIn = true } = {},
) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (signedIn) {
    headers.cookie = `${STAFF_SESSION_COOKIE}=${await createStaffSession("staff-1")}`;
  }
  const request = new NextRequest(
    `http://localhost/api/events/${eventId}/teams/${teamId}`,
    { method: "PATCH", headers, body: JSON.stringify({ name }) },
  );
  const res: Response = await PATCH(request, {
    params: Promise.resolve({ id: eventId, teamId }),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

const ops = () => mockCalls.map((call) => call.op);
const logged = () =>
  mockCalls
    .filter((call) => call.op === "activityLog.createMany")
    .flatMap(
      (call) =>
        (
          call.args as {
            data: {
              action: string;
              teamId: string;
              teamName: string;
              details: unknown;
            }[];
          }
        ).data,
    );

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
  mockState.teams = [
    { id: "team-1", name: "AppVerde" },
    { id: "team-2", name: "Los Campeones" },
  ];
  mockState.uniqueViolation = false;
});

describe("PATCH /api/events/:id/teams/:teamId", () => {
  it("renames the team, logs the old and new name and tells everyone to reload", async () => {
    const res = await rename("  Equipo Verde  ");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ team: { id: "team-1", name: "Equipo Verde" } });

    // Locked the event, then checked names, then updated.
    expect(ops()).toEqual([
      "$transaction",
      "lock",
      "team.findMany",
      "team.update",
      "activityLog.createMany",
    ]);
    const findArgs = mockCalls[2]!.args as { where: unknown };
    expect(findArgs.where).toEqual({ eventId: "event-1" });

    expect(logged()).toEqual([
      expect.objectContaining({
        action: "TEAM_RENAMED",
        teamId: "team-1",
        teamName: "Equipo Verde",
        details: { from: "AppVerde", to: "Equipo Verde" },
      }),
    ]);
    // The team's board and the educator's overview.
    expect(mockNotify).toHaveBeenCalledTimes(1);
    expect(mockNotify.mock.calls[0]).toHaveLength(2);
    const signals = (mockNotify.mock.calls[0] as { signal: string }[]).map(
      (n) => n.signal,
    );
    expect(signals).toEqual(["board", "overview"]);
  });

  it("refuses another team's name, ignoring case and spaces", async () => {
    const res = await rename(" los campeones ");
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "TEAM_NAME_TAKEN" });
    expect(ops()).not.toContain("team.update");
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it("lets a team keep its own name with different case", async () => {
    const res = await rename("APPVERDE");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ team: { id: "team-1", name: "APPVERDE" } });
  });

  it("does nothing when the name is the same", async () => {
    const res = await rename("AppVerde");
    expect(res.status).toBe(200);
    expect(ops()).not.toContain("team.update");
    expect(ops()).not.toContain("activityLog.createMany");
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it("answers TEAM_NAME_TAKEN when the database's unique name catches a race", async () => {
    mockState.uniqueViolation = true;
    const res = await rename("Nuevo");
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "TEAM_NAME_TAKEN" });
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it("validates the name like team creation (required, 40 characters)", async () => {
    for (const name of ["", "   ", null, 7]) {
      const res = await rename(name);
      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: "VALIDATION_ERROR",
        fields: { name: "REQUIRED" },
      });
    }
    const long = await rename("x".repeat(41));
    expect(long.status).toBe(400);
    expect(long.body).toEqual({
      error: "VALIDATION_ERROR",
      fields: { name: "TOO_LONG" },
    });
    expect(mockCalls).toEqual([]);
  });

  it("answers TEAM_NOT_FOUND for a team of another event", async () => {
    const res = await rename("Nuevo", { teamId: "team-other" });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "TEAM_NOT_FOUND" });
    expect(ops()).not.toContain("team.update");
  });

  it("does not touch another educator's event", async () => {
    const res = await rename("Nuevo", { eventId: "event-2" });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "EVENT_NOT_FOUND" });
    expect(mockCalls).toEqual([]);
  });

  it("needs an educator session (players cannot rename)", async () => {
    const res = await rename("Nuevo", { signedIn: false });
    expect(res.status).toBe(401);
    expect(mockCalls).toEqual([]);
  });
});

describe("teamNameTakenBy", () => {
  const teams = [
    { id: "a", name: "Alfa" },
    { id: "b", name: "Beta" },
  ];
  it("is true for another team's name in any case", () => {
    expect(teamNameTakenBy(teams, " beta ", "a")).toBe(true);
  });
  it("ignores the team being renamed", () => {
    expect(teamNameTakenBy(teams, "ALFA", "a")).toBe(false);
  });
  it("is false for a free name", () => {
    expect(teamNameTakenBy(teams, "Gamma", "a")).toBe(false);
  });
});

describe("withCurrentTeamName", () => {
  const names = new Map([["t1", "Nombre Nuevo"]]);
  it("shows the team's current name on old activity rows", () => {
    expect(
      withCurrentTeamName({ teamId: "t1", teamName: "Nombre Viejo" }, names),
    ).toEqual({ teamId: "t1", teamName: "Nombre Nuevo" });
  });
  it("keeps rows without a team or of a team that no longer exists", () => {
    const noTeam = { teamId: null, teamName: null };
    const gone = { teamId: "t9", teamName: "Borrado" };
    expect(withCurrentTeamName(noTeam, names)).toBe(noTeam);
    expect(withCurrentTeamName(gone, names)).toBe(gone);
  });
});
