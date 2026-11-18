// The educator's activity timer as the screens count it down. The API sends
// `endsAt` and its own `serverNow`; the time left comes from those two, so a
// device with a wrong clock still shows the right countdown. `seconds` in
// the DTO is the timer's full length (for a progress bar), not what is left.

export function activityTimerSecondsLeft(
  timer: { endsAt: string } | null | undefined,
  serverNow: string,
): number | null {
  if (!timer) return null;
  const ms = Date.parse(timer.endsAt) - Date.parse(serverNow);
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.ceil(ms / 1000));
}
