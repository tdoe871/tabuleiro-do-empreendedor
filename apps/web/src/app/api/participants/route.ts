import { NextResponse } from "next/server";

// POST /api/participants — joins a team via joinCode or invite link token,
// body: { teamJoinCode, nickname }
export async function POST() {
  return NextResponse.json({ error: "not_implemented" }, { status: 501 });
}
