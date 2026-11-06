import { NextResponse } from "next/server";

import { STAFF_SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";

// POST /api/auth/logout — clears the session cookie. Always 204, even
// without a session, so the client can call it unconditionally.
export async function POST() {
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(STAFF_SESSION_COOKIE, "", sessionCookieOptions(0));
  return response;
}
