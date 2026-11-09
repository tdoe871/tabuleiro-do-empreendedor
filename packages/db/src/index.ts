import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalThis.__prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}

export {
  Prisma,
  PrismaClient,
  EventStatus,
  EventMode,
  TimerMode,
  BoardKey,
  ParticipantRole,
  SubmissionType,
  AlertSeverity,
} from "@prisma/client";

export type * from "@prisma/client";

export * from "./board";
