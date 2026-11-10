/**
 * @jest-environment node
 */
import { createSignalBatcher } from "@/lib/realtime/batcher";
import {
  eventTopic,
  realtimeConfig,
  realtimeProvider,
  sendNotices,
  staffTopic,
  teamTopic,
} from "@/lib/realtime/server";
import { isSignal } from "@/lib/realtime/signals";

const ENV_KEYS = [
  "AUTH_SECRET",
  "REALTIME_PROVIDER",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SECRET_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
] as const;
const savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

function setEnv(values: Partial<Record<(typeof ENV_KEYS)[number], string>>) {
  for (const key of ENV_KEYS) {
    if (values[key] === undefined) delete process.env[key];
    else process.env[key] = values[key];
  }
}

const SUPABASE_ENV = {
  AUTH_SECRET: "x".repeat(32),
  NEXT_PUBLIC_SUPABASE_URL: "https://demo.supabase.co/",
  SUPABASE_SECRET_KEY: "sb_secret_test",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
};

afterEach(() => {
  setEnv(savedEnv as Record<string, string>);
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe("createSignalBatcher", () => {
  beforeEach(() => jest.useFakeTimers());

  it("turns a burst into one signal of each kind", () => {
    const emit = jest.fn();
    const batcher = createSignalBatcher(emit);
    for (let i = 0; i < 10; i++) batcher.push("messages");
    batcher.push("board");
    expect(emit).not.toHaveBeenCalled();
    jest.advanceTimersByTime(250);
    expect(emit.mock.calls).toEqual([["messages"], ["board"]]);
  });

  it("emits the same kind at most once per second, without dropping it", () => {
    const emit = jest.fn();
    const batcher = createSignalBatcher(emit);
    batcher.push("messages");
    jest.advanceTimersByTime(250);
    batcher.push("messages");
    jest.advanceTimersByTime(250);
    expect(emit).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(750);
    expect(emit).toHaveBeenCalledTimes(2);
  });

  it("stops after dispose", () => {
    const emit = jest.fn();
    const batcher = createSignalBatcher(emit);
    batcher.push("board");
    batcher.dispose();
    jest.advanceTimersByTime(5000);
    expect(emit).not.toHaveBeenCalled();
  });
});

describe("isSignal", () => {
  it("accepts only the server signals", () => {
    expect(isSignal("messages")).toBe(true);
    expect(isSignal("overview")).toBe(true);
    expect(isSignal("announcements")).toBe(true);
    expect(isSignal("refresh")).toBe(false);
    expect(isSignal("anything")).toBe(false);
  });
});

describe("topics", () => {
  it("are stable, distinct per kind and do not expose the id", () => {
    setEnv(SUPABASE_ENV);
    const id = "4f8a2c1e-0000-4000-8000-000000000000";
    expect(teamTopic(id)).toBe(teamTopic(id));
    expect(teamTopic(id)).toMatch(/^tdoe:team:[\w-]{32}$/);
    expect(new Set([teamTopic(id), eventTopic(id), staffTopic(id)]).size).toBe(
      3,
    );
    expect(teamTopic(id)).not.toContain(id);
  });

  it("change with AUTH_SECRET", () => {
    setEnv(SUPABASE_ENV);
    const before = teamTopic("t1");
    setEnv({ ...SUPABASE_ENV, AUTH_SECRET: "y".repeat(32) });
    expect(teamTopic("t1")).not.toBe(before);
  });
});

describe("realtimeProvider and realtimeConfig", () => {
  it("uses Supabase when its keys exist, unless told otherwise", () => {
    setEnv(SUPABASE_ENV);
    expect(realtimeProvider()).toBe("supabase");
    setEnv({ ...SUPABASE_ENV, REALTIME_PROVIDER: "none" });
    expect(realtimeProvider()).toBe("none");
    setEnv({ AUTH_SECRET: SUPABASE_ENV.AUTH_SECRET });
    expect(realtimeProvider()).toBe("none");
  });

  it("gives the browser only public settings", () => {
    setEnv(SUPABASE_ENV);
    const config = realtimeConfig(["a", "b"]);
    expect(config).toEqual({
      provider: "supabase",
      supabase: {
        url: "https://demo.supabase.co/",
        key: "sb_publishable_test",
      },
      topics: ["a", "b"],
      pollMs: { connected: 60_000, disconnected: 5_000 },
    });
    expect(JSON.stringify(config)).not.toContain("sb_secret");
  });

  it("falls back to polling without the publishable key", () => {
    setEnv({
      ...SUPABASE_ENV,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined,
    });
    expect(realtimeConfig([])).toMatchObject({
      provider: "none",
      supabase: null,
    });
  });
});

describe("sendNotices", () => {
  it("broadcasts all notices in one request with the secret key", async () => {
    setEnv(SUPABASE_ENV);
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response(null, { status: 202 }));
    await sendNotices([
      { topic: "tdoe:team:a", signal: "messages" },
      { topic: "tdoe:staff:b", signal: "overview" },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://demo.supabase.co/realtime/v1/api/broadcast");
    expect((init?.headers as Record<string, string>).apikey).toBe(
      "sb_secret_test",
    );
    expect(JSON.parse(init?.body as string)).toEqual({
      messages: [
        { topic: "tdoe:team:a", event: "messages", payload: {} },
        { topic: "tdoe:staff:b", event: "overview", payload: {} },
      ],
    });
  });

  it("does nothing when polling only", async () => {
    setEnv({ ...SUPABASE_ENV, REALTIME_PROVIDER: "none" });
    const fetchMock = jest.spyOn(global, "fetch");
    await sendNotices([{ topic: "t", signal: "board" }]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never throws when Supabase fails", async () => {
    setEnv(SUPABASE_ENV);
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(global, "fetch").mockRejectedValue(new Error("network down"));
    await expect(
      sendNotices([{ topic: "t", signal: "board" }]),
    ).resolves.toBeUndefined();
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response("nope", { status: 500 }));
    await expect(
      sendNotices([{ topic: "t", signal: "board" }]),
    ).resolves.toBeUndefined();
  });
});
