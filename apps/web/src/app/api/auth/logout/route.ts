import { NextResponse } from "next/server";

import {
  MENTOR_SESSION_COOKIE,
  PLAYER_SESSION_COOKIE,
  STAFF_SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth/session";

// POST /api/auth/logout — clears the staff, player and mentor session cookies.
// Always 204, even without a session, so the client can call it
// unconditionally.
export async function POST() {
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(STAFF_SESSION_COOKIE, "", sessionCookieOptions(0));
  response.cookies.set(PLAYER_SESSION_COOKIE, "", sessionCookieOptions(0));
  response.cookies.set(MENTOR_SESSION_COOKIE, "", sessionCookieOptions(0));
  return response;
}
