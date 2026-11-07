"use client";

import { useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createSignalBatcher } from "./batcher";
import { isSignal, type RealtimeConfig, type RealtimeSignal } from "./signals";

// Calls onSignal when something the screen shows has changed, so it can
// fetch it again:
// - "messages": GET /api/messages?after=<cursor>
// - "board": GET /api/board
// - "event": the session changed (status, clock): board or overview
// - "overview": GET /api/events/:id/overview (educator)
// - "refresh": catch up with everything (polling, tab visible again,
//   connection back)
//
// Player: useRealtime(onSignal). Educator: useRealtime(onSignal, { eventId }).
// Works the same whatever the backend uses (Supabase Broadcast or only
// polling); `connected` says whether live signals are arriving.
export function useRealtime(
  onSignal: (signal: RealtimeSignal) => void,
  { eventId, enabled = true }: { eventId?: string; enabled?: boolean } = {},
): { connected: boolean } {
  const handler = useRef(onSignal);
  useEffect(() => {
    handler.current = onSignal;
  });
  const [config, setConfig] = useState<RealtimeConfig | null>(null);
  const [connected, setConnected] = useState(false);

  // 1. Ask the backend how to listen.
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const query = eventId ? `?eventId=${encodeURIComponent(eventId)}` : "";
    fetch(`/api/realtime${query}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((value: RealtimeConfig | null) => {
        if (!cancelled) setConfig(value ?? FALLBACK_CONFIG);
      })
      .catch(() => {
        if (!cancelled) setConfig(FALLBACK_CONFIG);
      });
    return () => {
      cancelled = true;
    };
  }, [eventId, enabled]);

  // 2. Listen, poll, and catch up when the tab comes back.
  useEffect(() => {
    if (!enabled || !config) return;

    const batcher = createSignalBatcher((signal) => handler.current(signal));
    let disposed = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let client: SupabaseClient | null = null;

    function poll(isConnected: boolean) {
      if (pollTimer) clearInterval(pollTimer);
      const every = isConnected
        ? config!.pollMs.connected
        : config!.pollMs.disconnected;
      pollTimer = setInterval(() => batcher.push("refresh"), every);
    }

    function setLive(isConnected: boolean) {
      if (disposed) return;
      setConnected(isConnected);
      poll(isConnected);
      // Anything sent while disconnected was lost: fetch it now.
      if (isConnected) batcher.push("refresh");
    }

    poll(false);

    if (config.provider === "supabase" && config.supabase) {
      const { url, key } = config.supabase;
      const subscribed = new Set<string>();
      import("@supabase/supabase-js").then(({ createClient }) => {
        if (disposed) return;
        client = createClient(url, key, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        });
        for (const topic of config.topics) {
          client
            .channel(topic)
            .on("broadcast", { event: "*" }, (message) => {
              if (isSignal(message.event)) batcher.push(message.event);
            })
            .subscribe((status) => {
              const wasLive = subscribed.size === config.topics.length;
              if (status === "SUBSCRIBED") subscribed.add(topic);
              else subscribed.delete(topic);
              const isLive = subscribed.size === config.topics.length;
              if (isLive !== wasLive) setLive(isLive);
            });
        }
      });
    }

    function onVisible() {
      if (document.visibilityState === "visible") batcher.push("refresh");
    }
    function onOnline() {
      batcher.push("refresh");
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);

    return () => {
      disposed = true;
      batcher.dispose();
      if (pollTimer) clearInterval(pollTimer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      if (client) void client.removeAllChannels();
      setConnected(false);
    };
  }, [config, enabled]);

  return { connected };
}

// If the backend cannot be asked, poll at the fast rate.
const FALLBACK_CONFIG: RealtimeConfig = {
  provider: "none",
  supabase: null,
  topics: [],
  pollMs: { connected: 60_000, disconnected: 5_000 },
};
