/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

import { CODE_ALPHABET, CODE_LENGTH } from "@/lib/codes";
import { STAFF_SESSION_COOKIE, createStaffSession } from "@/lib/auth/session";

// DELETE /api/events/:id/mentors/:mentorId against a small fake of Prisma:
// removing a mentor also replaces the event's mentor code, in the same
// transaction, so the removed mentor cannot come back in with the old one.

const SECRET = "test-secret-at-least-32-characters-long!!";

type Call = { op: string; args: unknown };
const mockCalls: Call[] = [];
const mockState = {
  mentorExists: true,
  // How many times event.update fails with a unique-code collision.
  collisions: 0,
};

jest.mock("@tdoe/db", () => {
  const actual = jest.requireActual("@tdoe/db");
  const tx = {
    mentor: {
      deleteMany: async (args: unknown) => {
        mockCalls.push({ op: "mentor.deleteMany", args });
        return { count: mockState.mentorExists ? 1 : 0 };
      },
    },
    event: {
      update: async (args: unknown) => {
        mockCalls.push({ op: "event.update", args });
        if (mockState.collisions > 0) {
          mockState.collisions--;
          throw new actual.Prisma.PrismaClientKnownRequestError("taken", {
            code: "P2002",
            clientVersion: "test",
          });
        }
        return {};
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
          ? { id: "event-1", hostId: "staff-1", mentorCode: "OLDCOD" }
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
const { DELETE } = require("@/app/api/events/[id]/mentors/[mentorId]/route");

async function removeMentor(eventId = "event-1", mentorId = "mentor-1") {
  const request = new NextRequest(
    `http://localhost/api/events/${eventId}/mentors/${mentorId}`,
    {
      method: "DELETE",
      headers: {
        cookie: `${STAFF_SESSION_COOKIE}=${await createStaffSession("staff-1")}`,
      },
    },
  );
  const res: Response = await DELETE(request, {
    params: Promise.resolve({ id: eventId, mentorId }),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

const ops = () => mockCalls.map((call) => call.op);
const newCodes = () =>
  mockCalls
    .filter((call) => call.op === "event.update")
    .map(
      (call) => (call.args as { data: { mentorCode: string } }).data.mentorCode,
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
  mockState.mentorExists = true;
  mockState.collisions = 0;
});

describe("DELETE /api/events/:id/mentors/:mentorId", () => {
  it("removes the mentor and replaces the mentor code in one transaction", async () => {
    const res = await removeMentor();
    expect(res.status).toBe(204);
    expect(ops()).toEqual([
      "$transaction",
      "mentor.deleteMany",
      "event.update",
      "activityLog.createMany",
    ]);

    const deleted = mockCalls[1]!.args as { where: unknown };
    expect(deleted.where).toEqual({ id: "mentor-1", eventId: "event-1" });

    const [code] = newCodes();
    expect(code).toHaveLength(CODE_LENGTH);
    expect([...code!].every((c) => CODE_ALPHABET.includes(c))).toBe(true);
    expect(code).not.toBe("OLDCOD");
    expect((mockCalls[2]!.args as { where: unknown }).where).toEqual({
      id: "event-1",
    });

    // Both actions land in the activity record, and the panel refreshes.
    const logged = (
      mockCalls[3]!.args as { data: { action: string }[] }
    ).data.map((row) => row.action);
    expect(logged).toEqual(["MENTOR_REMOVED", "MENTOR_CODE_CHANGED"]);
    expect(mockNotify).toHaveBeenCalledTimes(1);
  });

  it("changes nothing when the mentor is not in the event", async () => {
    mockState.mentorExists = false;
    const res = await removeMentor();
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "MENTOR_NOT_FOUND" });
    expect(ops()).toEqual(["$transaction", "mentor.deleteMany"]);
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it("tries another code when the new one is already taken", async () => {
    mockState.collisions = 1;
    const res = await removeMentor();
    expect(res.status).toBe(204);
    expect(newCodes()).toHaveLength(2);
  });

  it("gives up with INTERNAL_ERROR after repeated collisions", async () => {
    mockState.collisions = 99;
    const res = await removeMentor();
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "INTERNAL_ERROR" });
    expect(ops()).not.toContain("activityLog.createMany");
  });

  it("does not touch another educator's event", async () => {
    const res = await removeMentor("event-2");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "EVENT_NOT_FOUND" });
    expect(mockCalls).toEqual([]);
  });
});
