import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@tdoe/db";

import {
  parseChallengeBody,
  toChallengeCardDTO,
} from "@/features/event/server/controls";
import {
  loadOwnedEvent,
  notifyEventChanged,
} from "@/features/event/server/owned-event";
import { apiError, readJsonObject } from "@/lib/api/errors";

type Context = { params: Promise<{ id: string }> };

// The educator's challenge card: one at a time, for every team. Players get
// it in GET /api/board as `cartaAtiva`.

// PUT /api/events/:id/challenge-card — send (or replace) the card.
// Body: { key: "problema" | "solucao" | "parcerias" | "oportunidades", text }.
export async function PUT(request: NextRequest, { params }: Context) {
  const loaded = await loadOwnedEvent(request, (await params).id);
  if ("error" in loaded) return loaded.error;
  const { event } = loaded;
  if (event.status === "FINISHED") return apiError("EVENT_FINISHED");

  const body = await readJsonObject(request);
  if (!body) return apiError("VALIDATION_ERROR");
  const parsed = parseChallengeBody(body);
  if (!parsed.ok) return apiError("VALIDATION_ERROR", parsed.fields);

  try {
    const updated = await prisma.event.update({
      where: { id: event.id },
      data: {
        challengeKey: parsed.data.key,
        challengeText: parsed.data.text,
        challengeSentAt: new Date(),
      },
    });
    notifyEventChanged(event.id);
    return NextResponse.json({ challengeCard: toChallengeCardDTO(updated) });
  } catch (error) {
    console.error("Send challenge card failed:", error);
    return apiError("INTERNAL_ERROR");
  }
}

// DELETE /api/events/:id/challenge-card — take the card back. 204.
export async function DELETE(request: NextRequest, { params }: Context) {
  const loaded = await loadOwnedEvent(request, (await params).id);
  if ("error" in loaded) return loaded.error;

  try {
    await prisma.event.update({
      where: { id: loaded.event.id },
      data: { challengeKey: null, challengeText: null, challengeSentAt: null },
    });
    notifyEventChanged(loaded.event.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Remove challenge card failed:", error);
    return apiError("INTERNAL_ERROR");
  }
}
