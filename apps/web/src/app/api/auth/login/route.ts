import { NextResponse } from "next/server";

// POST /api/auth/login — staff (maestro) email+password login
export async function POST() {
  return NextResponse.json({ error: "not_implemented" }, { status: 501 });
}
