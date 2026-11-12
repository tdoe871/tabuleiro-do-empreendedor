import { existsSync } from "node:fs";
import path from "node:path";

// Deletes everything the @db tests created in the database configured in
// apps/web/.env: every staff account whose email ends in E2E_EMAIL_DOMAIN,
// their events (teams, players, answers, messages, mentors, evaluations,
// announcements and activity go with them, by cascade) and the files their
// teams uploaded to Storage. Runs before the suite (leftovers of a run that
// was killed) and after it.

export const E2E_EMAIL_DOMAIN = "@e2e.test";

export default async function cleanup(): Promise<void> {
  const envFile = path.resolve(__dirname, "../../.env");
  if (existsSync(envFile)) process.loadEnvFile(envFile);

  const { prisma } = await import("@tdoe/db");
  // Dynamic relative import: this script runs outside Next's bundler, which
  // is the only thing that resolves the app's "@/..." tsconfig path alias
  // that lib/storage/submissions.ts itself imports internally. If that one
  // fails to resolve here, storage cleanup is skipped but the (more
  // important) database cleanup below still runs.
  const removeObjects = await import("../../src/lib/storage/submissions")
    .then((m) => m.removeObjects)
    .catch((error) => {
      console.warn(
        "[e2e cleanup] could not load storage helper, skipping Storage file cleanup:",
        error,
      );
      return null;
    });

  const staff = await prisma.staff.findMany({
    where: { email: { endsWith: E2E_EMAIL_DOMAIN } },
    select: { id: true },
  });
  if (staff.length === 0) return;
  const hostIds = staff.map((s) => s.id);

  const files = await prisma.submissionFile.findMany({
    where: { team: { event: { hostId: { in: hostIds } } } },
    select: { path: true },
  });
  if (files.length > 0 && removeObjects) {
    await removeObjects(files.map((f) => f.path)).catch((error) =>
      console.warn("[e2e cleanup] could not remove storage files:", error),
    );
  }

  const events = await prisma.event.deleteMany({
    where: { hostId: { in: hostIds } },
  });
  const accounts = await prisma.staff.deleteMany({
    where: { id: { in: hostIds } },
  });
  console.log(
    `[e2e cleanup] removed ${accounts.count} test account(s), ${events.count} event(s), ${files.length} file(s)`,
  );
  await prisma.$disconnect();
}
