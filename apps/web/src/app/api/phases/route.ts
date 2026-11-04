import { NextResponse } from "next/server";

// GET /api/phases?eventId=... — phases + each team's progress/keys.
// When Event.timerMode = GLOBAL, the client derives the countdown from
// Event.startedAt/durationMinutes instead of per-phase durations (UX fix #3).
export async function GET() {
  return NextResponse.json({ error: "not_implemented" }, { status: 501 });
}
