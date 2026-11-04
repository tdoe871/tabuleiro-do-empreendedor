import { NextResponse } from "next/server";

// POST /api/teams — participant creates a team (becomes LEADER), body: { eventCode, name, nickname }
export async function POST() {
  return NextResponse.json({ error: "not_implemented" }, { status: 501 });
}

// GET /api/teams?eventCode=... — list real team names for an event, so joiners
// pick a team by name instead of guessing a number (UX fix #2)
export async function GET() {
  return NextResponse.json({ error: "not_implemented" }, { status: 501 });
}
