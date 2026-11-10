// Realtime signals, shared by the server (notify) and the browser
// (useRealtime). A signal carries no data: it only says "this changed, fetch
// it again" and the browser asks our API, which checks the session. So a
// signal that reaches the wrong place, or a fake one, leaks nothing.

export const SIGNALS = [
  "messages",
  "board",
  "event",
  "overview",
  "announcements",
] as const;
export type Signal = (typeof SIGNALS)[number];

// "refresh" is not sent by the server: the browser emits it when polling,
// when the tab becomes visible again and when the connection comes back, so
// the screen catches up with anything it missed.
export type RealtimeSignal = Signal | "refresh";

export function isSignal(value: unknown): value is Signal {
  return SIGNALS.includes(value as Signal);
}

// Which provider carries the signals. "none" means the browser only polls.
// "socketio" is reserved for the self-hosted plan (a VM running Next.js with
// a socket.io server in the same process); it is not implemented yet and
// behaves like "none".
export type RealtimeProvider = "supabase" | "socketio" | "none";

// What GET /api/realtime answers.
export type RealtimeConfig = {
  provider: RealtimeProvider;
  // Only for "supabase": the project URL and its publishable (public) key.
  supabase: { url: string; key: string } | null;
  topics: string[];
  // How often the browser polls: slowly while realtime works (a safety net
  // for missed signals) and quickly when it does not.
  pollMs: { connected: number; disconnected: number };
};
