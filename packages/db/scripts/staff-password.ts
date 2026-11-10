// Staff password script: gives an educator a new temporary password when the
// "forgot my password" email cannot be sent (no verified Resend domain).
//
//   pnpm staff:password --list                       # educator accounts
//   pnpm staff:password --email ana@ejemplo.com      # new password for Ana
//
// It writes to the database in DATABASE_URL (apps/web/.env), which is the
// production database. Same effect as resetting through the emailed link:
// the password changes, every open session of that educator stops working
// (passwordChangedAt) and pending reset links are deleted. The new password
// is printed once and never stored in plain text; pass it to the educator
// privately.

import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Env from apps/web/.env (if present) before the database client loads.
const ENV_FILE = resolve(__dirname, "../../../apps/web/.env");
if (!process.env.DATABASE_URL && existsSync(ENV_FILE)) {
  process.loadEnvFile(ENV_FILE);
}

type Db = typeof import("../src");
let db: Db;

type Options = { list: boolean; email: string | null };

const USAGE =
  "Usage: pnpm staff:password --list | pnpm staff:password --email <email>";

function parseArgs(argv: string[]): Options {
  const opts: Options = { list: false, email: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--list") opts.list = true;
    else if (arg === "--email") opts.email = argv[++i] ?? "";
    else if (arg !== "--") throw new Error(`Unknown option ${arg}\n${USAGE}`);
  }
  if (opts.list === (opts.email !== null)) throw new Error(USAGE);
  return opts;
}

async function listStaff() {
  const staff = await db.prisma.staff.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      email: true,
      name: true,
      hashedPassword: true,
      createdAt: true,
      _count: { select: { events: true } },
    },
  });
  if (staff.length === 0) {
    console.log("No educator accounts.");
    return;
  }
  for (const s of staff) {
    // The seed account stores "!" instead of a hash: it cannot log in.
    const login = s.hashedPassword.startsWith("scrypt$") ? "" : " (no login)";
    console.log(
      `${s.email}  ${s.name}  created ${s.createdAt.toISOString().slice(0, 10)}  ${s._count.events} event(s)${login}`,
    );
  }
}

async function resetPassword(rawEmail: string) {
  const { isValidEmail, normalizeEmail, passwordError } =
    await import("../../../apps/web/src/lib/auth/account");
  const { generatePassword, hashPassword } =
    await import("../../../apps/web/src/lib/auth/password");

  const email = normalizeEmail(rawEmail);
  if (!isValidEmail(email)) throw new Error(`Invalid email: "${rawEmail}"`);

  const password = generatePassword();
  if (passwordError(password)) throw new Error("Generated password is invalid");
  // Hash first (~200 ms) so the transaction stays short.
  const hashedPassword = await hashPassword(password);

  const result = await db.prisma.$transaction(async (tx) => {
    const staff = await tx.staff.findUnique({
      where: { email },
      select: { id: true, name: true },
    });
    if (!staff) return null;
    const { count: links } = await tx.passwordReset.deleteMany({
      where: { staffId: staff.id },
    });
    await tx.staff.update({
      where: { id: staff.id },
      data: { hashedPassword, passwordChangedAt: new Date() },
    });
    return { name: staff.name, links };
  }, db.INTERACTIVE_TX);

  if (!result) {
    throw new Error(
      `No educator with the email ${email}. See the accounts with --list.`,
    );
  }
  console.log(`Educator: ${result.name} <${email}>`);
  console.log(`New password: ${password}`);
  console.log(
    `Open sessions of this account were closed; ${result.links} pending reset link(s) deleted.`,
  );
  console.log("Send the password privately; the educator logs in with it.");
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set (apps/web/.env)");
  }
  db = await import("../src");
  if (opts.list) await listStaff();
  else await resetPassword(opts.email ?? "");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db?.prisma.$disconnect());
