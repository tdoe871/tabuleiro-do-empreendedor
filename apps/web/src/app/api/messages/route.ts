import { NextResponse, type NextRequest } from "next/server";
import { Prisma, prisma } from "@tdoe/db";

import {
  MESSAGE_PEOPLE,
  toMessageDTO,
  type MessageWithPeople,
} from "@/features/communication/server/dto";
import {
  MESSAGE_PAGE_SIZE,
  MESSAGE_SETTLE_MS,
  NUDGE_COOLDOWN_MS,
  parseMessageBody,
  parseMessageQuery,
  visibleMessages,
} from "@/features/communication/server/rules";
import { switchGate } from "@/features/event/server/switches";
import { canPlay } from "@/features/team/server/team";
import { apiError, readJsonObject } from "@/lib/api/errors";
import { getPlayerFromRequest } from "@/lib/auth/player";
import { createRateLimiter } from "@/lib/auth/rate-limit";
import { notify, teamTopic } from "@/lib/realtime/server";

// Per participant: enough for a fast conversation, not for flooding the team.
const isRateLimited = createRateLimiter({ windowMs: 60 * 1000, max: 30 });

// GET /api/messages — the chat messages the player can see, oldest first.
// No query: the latest page. ?after=<id>: newer messages (polling).
// ?before=<id>: older history. `cursor` is the value for the next ?after=.
export async function GET(request: NextRequest) {
  const player = await getPlayerFromRequest(request);
  if (!player) return apiError("UNAUTHORIZED");

  const query = parseMessageQuery(request.nextUrl.searchParams);
  if (!query) return apiError("VALIDATION_ERROR", { query: "INVALID" });

  const me = player.participant.id;
  const now = new Date();
  const where: Prisma.MessageWhereInput = {
    ...visibleMessages({ teamId: player.team.id, participantId: me }),
    createdAt: { lte: new Date(now.getTime() - MESSAGE_SETTLE_MS) },
  };
  if (query.direction === "after") where.id = { gt: query.id };
  if (query.direction === "before") where.id = { lt: query.id };

  try {
    const rows = await prisma.message.findMany({
      where,
      include: MESSAGE_PEOPLE,
      orderBy: { id: query.direction === "after" ? "asc" : "desc" },
      take: MESSAGE_PAGE_SIZE + 1,
    });
    const hasMore = rows.length > MESSAGE_PAGE_SIZE;
    const page = rows.slice(0, MESSAGE_PAGE_SIZE);
    if (query.direction !== "after") page.reverse();

    const lastId =
      page.at(-1)?.id ?? (query.direction === "after" ? query.id : 0);

    return NextResponse.json({
      serverNow: now.toISOString(),
      messages: page.map((message) => toMessageDTO(message, me)),
      // For ?after= there are newer ones to fetch right away; otherwise,
      // older ones for ?before=<first id>.
      hasMore,
      // Only meaningful for the latest page and ?after=.
      cursor: query.direction === "before" ? null : lastId,
    });
  } catch (error) {
    console.error("Load messages failed:", error);
    return apiError("INTERNAL_ERROR");
  }
}

// POST /api/messages — sends a message. Body:
// { type: "TEAM" | "PRIVATE" | "NUDGE", text?, toParticipantId?, clientId }.
// Repeating a clientId returns the message already saved (200) instead of
// creating it again (201). Sending follows the board: the session has to be
// ACTIVE with time left.
export async function POST(request: NextRequest) {
  const player = await getPlayerFromRequest(request);
  if (!player) return apiError("UNAUTHORIZED");

  const body = await readJsonObject(request);
  if (!body) return apiError("VALIDATION_ERROR");
  const parsed = parseMessageBody(body);
  if (!parsed.ok) return apiError("VALIDATION_ERROR", parsed.fields);
  const input = parsed.data;
  const me = player.participant.id;

  const gate = canPlay(player.event, new Date());
  if (gate !== "ok") return apiError(gate);
  const chat = switchGate(player.event, "chat");
  if (chat !== "ok") return apiError(chat);

  try {
    const existing = await findByClientId(me, input.clientId);
    if (existing) {
      return NextResponse.json({ message: toMessageDTO(existing, me) });
    }

    if (isRateLimited(me)) return apiError("RATE_LIMITED");

    if (input.recipientId) {
      const recipient = await prisma.participant.findUnique({
        where: { id: input.recipientId },
        select: { teamId: true },
      });
      if (
        !recipient ||
        recipient.teamId !== player.team.id ||
        input.recipientId === me
      ) {
        return apiError("VALIDATION_ERROR", { toParticipantId: "INVALID" });
      }
    }

    if (input.type === "NUDGE") {
      const recent = await prisma.message.findFirst({
        where: {
          type: "NUDGE",
          senderId: me,
          recipientId: input.recipientId,
          createdAt: { gt: new Date(Date.now() - NUDGE_COOLDOWN_MS) },
        },
        select: { id: true },
      });
      if (recent) return apiError("RATE_LIMITED");
    }

    const message = await prisma.message.create({
      data: {
        teamId: player.team.id,
        type: input.type,
        text: input.text,
        senderId: me,
        recipientId: input.recipientId,
        clientId: input.clientId,
      },
      include: MESSAGE_PEOPLE,
    });
    notify({ topic: teamTopic(player.team.id), signal: "messages" });
    return NextResponse.json(
      { message: toMessageDTO(message, me) },
      { status: 201 },
    );
  } catch (error) {
    // The same clientId sent twice at the same time: the second insert hits
    // the unique index, so answer with the one that was saved.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const saved = await findByClientId(me, input.clientId).catch(() => null);
      if (saved) return NextResponse.json({ message: toMessageDTO(saved, me) });
    }
    console.error("Send message failed:", error);
    return apiError("INTERNAL_ERROR");
  }
}

function findByClientId(
  senderId: string,
  clientId: string,
): Promise<MessageWithPeople | null> {
  return prisma.message.findUnique({
    where: { senderId_clientId: { senderId, clientId } },
    include: MESSAGE_PEOPLE,
  });
}
