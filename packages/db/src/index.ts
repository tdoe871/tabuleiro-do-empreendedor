import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Connections each server instance keeps open. Every Vercel instance has its
// own pool and the Supabase pooler caps client connections (about 200 on the
// small plans), so serverless wants a small number (3-5); one long-running
// server (a VM) can use more (10-20).
const DEFAULT_POOL_MAX = 5;

export function poolMax(value = process.env.DATABASE_POOL_MAX): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_POOL_MAX;
}

function createClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    max: poolMax(),
    // Release idle connections quickly so stopped instances do not hold them.
    idleTimeoutMillis: 10_000,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalThis.__prisma ?? createClient();

// For interactive transactions ($transaction(async (tx) => ...)). Prisma
// waits only 2 s for a free connection by default; when 300 people join at
// the start, the pool queues up and those joins failed in the load test.
// Waiting longer turns a burst into a short delay instead of an error.
export const INTERACTIVE_TX = { maxWait: 15_000, timeout: 15_000 } as const;

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}

export * from "@prisma/client";

export * from "./board";
