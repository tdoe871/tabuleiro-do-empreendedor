import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@tdoe/db";

import {
  loadOwnedEvent,
  notifyEventChanged,
} from "@/features/event/server/owned-event";
import {
  parseSwitchesBody,
  toSwitchesDTO,
} from "@/features/event/server/switches";
import { asStaff, recordActivity } from "@/features/activity/server/record";
import { apiError, readJsonObject } from "@/lib/api/errors";

type Context = { params: Promise<{ id: string }> };

// PATCH /api/events/:id/switches — emergency switches. Body: any of
// { chat, submissions, joins } as booleans (false turns it off). Works in
// any status and takes effect on the next request, without a deploy.
export async function PATCH(request: NextRequest, { params }: Context) {
  const loaded = await loadOwnedEvent(request, (await params).id);
  if ("error" in loaded) return loaded.error;

  const body = await readJsonObject(request);
  if (!body) return apiError("VALIDATION_ERROR");
  const parsed = parseSwitchesBody(body);
  if (!parsed.ok) return apiError("VALIDATION_ERROR", parsed.fields);

  try {
    const updated = await prisma.event.update({
      where: { id: loaded.event.id },
      data: parsed.data,
    });
    // Players refresh their board, which says what is turned off.
    notifyEventChanged(updated.id);
    await recordActivity({
      ...asStaff(loaded.staff, updated.id),
      action: "SWITCHES_CHANGED",
      // Only the ones this request changed, with their API names.
      details: body as Record<string, boolean>,
    });
    return NextResponse.json({ switches: toSwitchesDTO(updated) });
  } catch (error) {
    console.error("Update switches failed:", error);
    return apiError("INTERNAL_ERROR");
  }
}
