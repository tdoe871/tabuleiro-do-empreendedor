// In-memory per-IP rate limit (same as Maestro-virtual). It counts per
// server instance: it stops simple brute force from one IP, but it is not a
// replacement for a dedicated service.
export function createRateLimiter({
  windowMs,
  max,
}: {
  windowMs: number;
  max: number;
}) {
  const hits = new Map<string, number[]>();

  return function isRateLimited(key: string): boolean {
    const now = Date.now();
    const cutoff = now - windowMs;
    const recent = (hits.get(key) ?? []).filter((time) => time > cutoff);

    if (recent.length >= max) {
      hits.set(key, recent);
      return true;
    }

    recent.push(now);
    hits.set(key, recent);

    if (hits.size > 1000) {
      for (const [entry, times] of hits) {
        if (times.every((time) => time <= cutoff)) hits.delete(entry);
      }
    }

    return false;
  };
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first;
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
