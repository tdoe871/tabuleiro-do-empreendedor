/**
 * @jest-environment node
 */
import {
  ACTION_LABEL,
  ACTIVITY_CSV_HEADER,
  formatDetails,
  minutesFromStart,
  parseActivityQuery,
  toActivityCsvRow,
  toActivityDTO,
} from "@/features/activity/server/actions";

const startedAt = new Date("2026-11-12T09:00:00Z");
const row = {
  id: 7,
  createdAt: new Date("2026-11-12T10:30:59Z"),
  actorType: "PARTICIPANT" as const,
  actorId: "p1",
  actorName: "Ana",
  teamId: "t1",
  teamName: "Los Innovadores",
  action: "PHASE_COMPLETED",
  details: { key: "problema", order: 2 },
};

describe("activity record", () => {
  it("counts whole minutes from the start", () => {
    expect(minutesFromStart(row.createdAt, startedAt)).toBe(90);
    expect(minutesFromStart(new Date("2026-11-12T08:58:00Z"), startedAt)).toBe(
      -2,
    );
    expect(minutesFromStart(row.createdAt, null)).toBeNull();
  });

  it("builds the DTO", () => {
    expect(toActivityDTO(row, startedAt)).toEqual({
      id: 7,
      createdAt: "2026-11-12T10:30:59.000Z",
      minutesFromStart: 90,
      actor: { type: "PARTICIPANT", id: "p1", name: "Ana" },
      team: { id: "t1", name: "Los Innovadores" },
      action: "PHASE_COMPLETED",
      details: { key: "problema", order: 2 },
    });
    expect(
      toActivityDTO(
        { ...row, actorType: "STAFF", teamId: null, details: null },
        startedAt,
      ),
    ).toMatchObject({ team: null, details: null });
  });

  it("formats details and the CSV row", () => {
    expect(formatDetails({ key: "problema", order: 2, to: null })).toBe(
      "key=problema; order=2; to=",
    );
    expect(formatDetails(null)).toBe("");
    expect(formatDetails(["x"])).toBe("");

    const csv = toActivityCsvRow(row, startedAt);
    expect(csv).toHaveLength(ACTIVITY_CSV_HEADER.length);
    expect(csv).toEqual([
      7,
      row.createdAt,
      90,
      "Participante",
      "p1",
      "Ana",
      "t1",
      "Los Innovadores",
      ACTION_LABEL.PHASE_COMPLETED,
      "PHASE_COMPLETED",
      "key=problema; order=2",
    ]);
    // An action that no longer exists still shows its code.
    expect(toActivityCsvRow({ ...row, action: "OLD" }, null)[8]).toBe("OLD");
  });

  it("parses the query", () => {
    expect(parseActivityQuery(new URLSearchParams(""))).toEqual({
      ok: true,
      data: { before: null, teamId: null },
    });
    expect(
      parseActivityQuery(new URLSearchParams("before=40&teamId=t1")),
    ).toEqual({ ok: true, data: { before: 40, teamId: "t1" } });
    for (const bad of ["0", "-1", "2.5", "abc"]) {
      expect(parseActivityQuery(new URLSearchParams(`before=${bad}`))).toEqual({
        ok: false,
        fields: { before: "INVALID" },
      });
    }
  });
});
