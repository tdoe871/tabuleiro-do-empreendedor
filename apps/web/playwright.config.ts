import { defineConfig, devices } from "@playwright/test";

// E2E_BASE_URL points the suite at a deployed site (e.g. the Vercel URL, no
// locale suffix) instead of a local dev server. A deployment uses the real
// database, so only tests tagged @readonly run there; tests that create data
// stay local. Not read from .env on purpose: production must be opt-in.
const deployedUrl = process.env.E2E_BASE_URL?.replace(/\/+$/, "");

// E2E_DB=1 also runs the tests tagged @db: full journeys that create real
// accounts, events and teams in the database of apps/web/.env, all marked
// E2E- / @e2e.test and deleted before and after the run
// (e2e-tests/support/cleanup.ts). Never against a deployed site.
const withDb = process.env.E2E_DB === "1" && !deployedUrl;

// E2E_PORT runs the local server on another port (default 3000), e.g. to
// leave a dev server you are using untouched.
const port = Number(process.env.E2E_PORT) || 3000;
const localUrl = `http://localhost:${port}`;

export default defineConfig({
  testDir: "./e2e-tests",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  grep: deployedUrl ? /@readonly/ : undefined,
  grepInvert: withDb || deployedUrl ? undefined : /@db/,
  globalSetup: withDb ? "./e2e-tests/support/cleanup.ts" : undefined,
  globalTeardown: withDb ? "./e2e-tests/support/cleanup.ts" : undefined,
  use: {
    baseURL: deployedUrl ?? localUrl,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: deployedUrl
    ? undefined
    : {
        command: `pnpm dev --port ${port}`,
        url: localUrl,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
