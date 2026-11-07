import type { RealtimeSignal } from "./signals";

// Groups signals that arrive close together and emits each kind at most once
// per `minIntervalMs`. Ten chat messages in a burst (or someone spamming a
// public channel) end up as one fetch, not ten.
export function createSignalBatcher(
  emit: (signal: RealtimeSignal) => void,
  { waitMs = 250, minIntervalMs = 1000 } = {},
) {
  const pending = new Set<RealtimeSignal>();
  const lastEmit = new Map<RealtimeSignal, number>();
  let timer: ReturnType<typeof setTimeout> | null = null;

  function flush() {
    timer = null;
    const now = Date.now();
    let nextIn: number | null = null;
    for (const signal of [...pending]) {
      const wait = (lastEmit.get(signal) ?? -Infinity) + minIntervalMs - now;
      if (wait > 0) {
        nextIn = nextIn === null ? wait : Math.min(nextIn, wait);
        continue;
      }
      pending.delete(signal);
      lastEmit.set(signal, now);
      emit(signal);
    }
    if (nextIn !== null) timer = setTimeout(flush, nextIn);
  }

  return {
    push(signal: RealtimeSignal) {
      pending.add(signal);
      timer ??= setTimeout(flush, waitMs);
    },
    dispose() {
      if (timer) clearTimeout(timer);
      timer = null;
      pending.clear();
    },
  };
}
