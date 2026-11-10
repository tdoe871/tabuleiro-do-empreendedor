/**
 * @jest-environment node
 */
import {
  parseSwitchesBody,
  switchGate,
  toSwitchesDTO,
} from "@/features/event/server/switches";

const allOn = {
  chatEnabled: true,
  submissionsEnabled: true,
  joinsEnabled: true,
};

describe("emergency switches", () => {
  it("lets everything through while on", () => {
    expect(switchGate(allOn, "chat")).toBe("ok");
    expect(switchGate(allOn, "submissions")).toBe("ok");
    expect(switchGate(allOn, "joins")).toBe("ok");
    expect(toSwitchesDTO(allOn)).toEqual({
      chat: true,
      submissions: true,
      joins: true,
    });
  });

  it("answers each switch's own code when off", () => {
    const off = {
      chatEnabled: false,
      submissionsEnabled: false,
      joinsEnabled: false,
    };
    expect(switchGate(off, "chat")).toBe("CHAT_DISABLED");
    expect(switchGate(off, "submissions")).toBe("SUBMISSIONS_DISABLED");
    expect(switchGate(off, "joins")).toBe("JOINS_DISABLED");
    expect(switchGate({ ...allOn, chatEnabled: false }, "joins")).toBe("ok");
  });

  it("parses a partial body into columns", () => {
    expect(parseSwitchesBody({ chat: false })).toEqual({
      ok: true,
      data: { chatEnabled: false },
    });
    expect(parseSwitchesBody({ submissions: true, joins: false })).toEqual({
      ok: true,
      data: { submissionsEnabled: true, joinsEnabled: false },
    });
  });

  it("rejects empty bodies, unknown switches and non-booleans", () => {
    expect(parseSwitchesBody({})).toEqual({
      ok: false,
      fields: { switches: "REQUIRED" },
    });
    expect(parseSwitchesBody({ chat: "off", uploads: false })).toEqual({
      ok: false,
      fields: { chat: "INVALID", uploads: "UNKNOWN" },
    });
  });
});
