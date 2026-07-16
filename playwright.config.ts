import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

// Next.js auto-loads .env.local for the app server, but the Playwright test runner is
// a separate Node process and needs it loaded explicitly to reach Supabase directly
// (helpers.ts uses the service-role key for test setup — see tests/e2e/helpers.ts).
dotenv.config({ path: ".env.local" });

/**
 * E2E config. Runs against a real Next.js production server (not a mock) talking to
 * a real Supabase instance — locally, that's the Supabase CLI's local stack; in CI,
 * see .github/workflows/ci.yml, which spins up that same local stack (Postgres +
 * GoTrue + PostgREST) fresh on every run, applies our migrations, and tears it down
 * after. No test ever touches the production Supabase project.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  timeout: 30_000,
  use: {
    baseURL: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
