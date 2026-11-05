import { BOARD_PHASES, prisma } from "../src";

// Seeds a demo event with the standard board (4 chaves × 3 phases) for local
// development and QA. Safe to run more than once: existing rows are kept.
// Run with `pnpm db:seed`; prisma.config.ts loads apps/web/.env first.
//
// The host is a placeholder Staff that cannot log in: "!" is never a valid
// password hash, so no known credentials end up in the event database. Real
// staff accounts come from POST /api/auth/register.

const SEED_STAFF_EMAIL = "seed@tabuleiro.local";
// Same alphabet as randomCode() in CreateSessionModal (no I, O, 0, 1).
const SEED_EVENT_CODE = process.env.SEED_EVENT_CODE ?? "QATEST";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set (expected in apps/web/.env)");
  }

  const host = await prisma.staff.upsert({
    where: { email: SEED_STAFF_EMAIL },
    update: {},
    create: {
      email: SEED_STAFF_EMAIL,
      name: "Seed (sin login)",
      hashedPassword: "!",
    },
  });

  const event = await prisma.event.upsert({
    where: { code: SEED_EVENT_CODE },
    update: {},
    create: {
      code: SEED_EVENT_CODE,
      name: "Evento de prueba (QA)",
      hostId: host.id,
      durationMinutes: 24 * 60,
    },
  });

  const { count } = await prisma.phase.createMany({
    data: BOARD_PHASES.map((phase) => ({ ...phase, eventId: event.id })),
    skipDuplicates: true,
  });

  console.log(
    `Seed: event ${event.code} with ${BOARD_PHASES.length} phases (${count} new).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
