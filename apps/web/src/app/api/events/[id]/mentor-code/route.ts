import { NextResponse, type NextRequest } from "next/server";
import { Prisma, prisma } from "@tdoe/db";

import { asStaff, recordActivity } from "@/features/activity/server/record";
import { apiError } from "@/lib/api/errors";
import { getStaffFromRequest } from "@/lib/auth/staff";
import { generateCode } from "@/lib/codes";

const MAX_CODE_ATTEMPTS = 5;

// POST /api/events/:id/mentor-code — the educator creates the code mentors
// use to enter, or replaces it (the old one stops working; mentors already
// in keep their session).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const staff = await getStaffFromRequest(request);
  if (!staff) return apiError("UNAUTHORIZED");

  const { id } = await params;
  for (let attempt = 1; attempt <= MAX_CODE_ATTEMPTS; attempt++) {
    try {
      const { count } = await prisma.event.updateMany({
        where: { id, hostId: staff.id },
        data: { mentorCode: generateCode() },
      });
      if (count === 0) return apiError("EVENT_NOT_FOUND");
      await recordActivity({
        ...asStaff(staff, id),
        action: "MENTOR_CODE_CHANGED",
      });
      const event = await prisma.event.findUniqueOrThrow({
        where: { id },
        select: { mentorCode: true },
      });
      return NextResponse.json(event);
    } catch (error) {
      const collision =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002";
      if (collision && attempt < MAX_CODE_ATTEMPTS) continue;
      console.error("Create mentor code failed:", error);
      return apiError("INTERNAL_ERROR");
    }
  }
  return apiError("INTERNAL_ERROR");
}
