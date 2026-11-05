import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// The monorepo keeps a single env file in apps/web. Prisma 7 no longer loads
// .env on its own, so load it here when it exists (locally). In CI/Vercel the
// variables come from the environment and there is no file to load.
const envFile = new URL("../../apps/web/.env", import.meta.url);
if (existsSync(envFile)) process.loadEnvFile(envFile);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Used ONLY by the CLI (migrate, studio). The app connects through
    // DATABASE_URL (transaction pooler, port 6543) via @prisma/adapter-pg in
    // src/index.ts. Migrations need advisory locks, which the transaction
    // pooler does not support, so the CLI uses DIRECT_URL (session pooler,
    // port 5432). Left undefined when unset so `prisma generate` still runs in
    // CI without database secrets; migrate then fails with a clear error.
    url: process.env.DIRECT_URL,
  },
});
