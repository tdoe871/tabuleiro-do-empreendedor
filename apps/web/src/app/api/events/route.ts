import { NextResponse } from "next/server";

// POST /api/events — staff creates a new event (name, maxTeams, maxTeamSize, timerMode)
export async function POST() {
  return NextResponse.json({ error: "not_implemented" }, { status: 501 });
}
