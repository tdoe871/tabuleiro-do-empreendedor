/**
 * @jest-environment node
 */
import { GET as healthGET } from "@/app/api/health/route";
import { POST as eventsPOST } from "@/app/api/events/route";
import { POST as participantsPOST } from "@/app/api/participants/route";
import { GET as phasesGET } from "@/app/api/phases/route";
import { PUT as submissionsPUT } from "@/app/api/submissions/route";
import { GET as teamsGET, POST as teamsPOST } from "@/app/api/teams/route";

describe("GET /api/health", () => {
  it("returns 200 with status ok and an ISO timestamp", async () => {
    const res = await healthGET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });
});

// Contract tests: these endpoints are still stubs. When one gets implemented,
// this test will fail — move it out of here and write real tests for it.
describe("not-yet-implemented endpoints", () => {
  const stubs: [string, () => Promise<Response>][] = [
    ["POST /api/events", eventsPOST],
    ["POST /api/participants", participantsPOST],
    ["GET /api/phases", phasesGET],
    ["PUT /api/submissions", submissionsPUT],
    ["GET /api/teams", teamsGET],
    ["POST /api/teams", teamsPOST],
  ];

  it.each(stubs)("%s returns 501 not_implemented", async (_name, handler) => {
    const res = await handler();
    expect(res.status).toBe(501);
    expect(await res.json()).toEqual({ error: "not_implemented" });
  });
});
