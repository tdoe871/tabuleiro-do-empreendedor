import { createHmac } from "node:crypto";
import { after } from "next/server";

import type { RealtimeConfig, RealtimeProvider, Signal } from "./signals";

// Server side of realtime. Routes call notify() after a change; the
// provider is picked with env vars, so moving between Supabase Broadcast,
// a self-hosted server or plain polling does not touch the routes.
//
// Env:
// - REALTIME_PROVIDER: "supabase" | "socketio" | "none". When unset,
//   "supabase" if the keys below exist, otherwise "none".
// - NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY (sending, server only),
//   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (listening, sent to the browser).

export const POLL_MS = { connected: 60_000, disconnected: 5_000 };
const SEND_TIMEOUT_MS = 3_000;

export function realtimeProvider(): RealtimeProvider {
  const configured = process.env.REALTIME_PROVIDER;
  if (
    configured === "supabase" ||
    configured === "socketio" ||
    configured === "none"
  ) {
    return configured;
  }
  return process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY
    ? "supabase"
    : "none";
}

// Topic names are signed with AUTH_SECRET: knowing a team or event id is not
// enough to guess them, and players never learn the educator's topic.
// Supabase public channels can be joined by anyone who knows the name, so
// this (plus signals without data) is what keeps them private enough.
function topic(kind: "team" | "event" | "staff", id: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  const digest = createHmac("sha256", secret)
    .update(`${kind}:${id}`)
    .digest("base64url")
    .slice(0, 32);
  return `tdoe:${kind}:${digest}`;
}

// Everyone on a team: chat and board changes.
export const teamTopic = (teamId: string) => topic("team", teamId);
// Everyone in an event (players and educator): status and clock changes.
export const eventTopic = (eventId: string) => topic("event", eventId);
// The educator of an event: anything that changes the overview.
export const staffTopic = (eventId: string) => topic("staff", eventId);

export type Notice = { topic: string; signal: Signal };

export function realtimeConfig(topics: string[]): RealtimeConfig {
  const provider = realtimeProvider();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const supabase = provider === "supabase" && url && key ? { url, key } : null;
  return {
    // Without the publishable key the browser cannot listen: poll instead.
    provider: provider === "supabase" && !supabase ? "none" : provider,
    supabase,
    topics,
    pollMs: POLL_MS,
  };
}

// Sends the notices. Never throws: a lost signal only delays the screen
// until the next poll.
export async function sendNotices(notices: Notice[]): Promise<void> {
  if (notices.length === 0 || realtimeProvider() !== "supabase") return;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return;

  try {
    const response = await fetch(
      `${url.replace(/\/$/, "")}/realtime/v1/api/broadcast`,
      {
        method: "POST",
        headers: { apikey: key, "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: notices.map((notice) => ({
            topic: notice.topic,
            event: notice.signal,
            payload: {},
          })),
        }),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
        cache: "no-store",
      },
    );
    if (!response.ok) {
      console.error(
        `Realtime broadcast failed: ${response.status} ${await response.text()}`,
      );
    }
  } catch (error) {
    console.error("Realtime broadcast failed:", error);
  }
}

// For route handlers: sends the notices after the response goes out, so the
// player never waits for them.
export function notify(...notices: Notice[]): void {
  after(() => sendNotices(notices));
}
