import { defineConfig, devices } from "@playwright/test";

// E2E_BASE_URL points the suite at a deployed site (e.g. the Vercel URL, no
// locale suffix) instead of a local dev server. A deployment uses the real
// database, so only tests tagged @readonly run there; tests that create data
// stay local. Not read from .env on purpose: production must be opt-in.
const deployedUrl = process.env.E2E_BASE_URL?.replace(/\/+$/, "");

export default defineConfig({
  testDir: "./e2e-tests",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  grep: deployedUrl ? /@readonly/ : undefined,
  use: {
    baseURL: deployedUrl ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: deployedUrl
    ? undefined
    : {
        command: "pnpm dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
      },
});
