import type { NextRequest, NextResponse } from "next/server";
import { prisma, type Event, type Mentor } from "@tdoe/db";

import {
  MENTOR_SESSION_COOKIE,
  MENTOR_SESSION_DURATION_SECONDS,
  createMentorSession,
  sessionCookieOptions,
  verifyMentorSession,
} from "@/lib/auth/session";

export type MentorUser = { mentor: Mentor; event: Event };

// Authoritative check: besides the token signature, the mentor must still
// exist and still belong to the event in the token.
export async function getMentorFromToken(
  token: string | undefined,
): Promise<MentorUser | null> {
  const session = await verifyMentorSession(token);
  if (!session) return null;

  const mentor = await prisma.mentor.findUnique({
    where: { id: session.mentorId },
    include: { event: true },
  });
  if (!mentor || mentor.eventId !== session.eventId) return null;

  const { event, ...rest } = mentor;
  return { mentor: rest, event };
}

export function getMentorFromRequest(
  request: NextRequest,
): Promise<MentorUser | null> {
  return getMentorFromToken(request.cookies.get(MENTOR_SESSION_COOKIE)?.value);
}

export async function setMentorSessionCookie(
  response: NextResponse,
  mentor: { id: string; eventId: string },
): Promise<void> {
  response.cookies.set(
    MENTOR_SESSION_COOKIE,
    await createMentorSession({ mentorId: mentor.id, eventId: mentor.eventId }),
    sessionCookieOptions(MENTOR_SESSION_DURATION_SECONDS),
  );
}
