import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/tests",

  /* Run E2E tests in parallel */
  fullyParallel: true,

  /* Fail CI if test.only was accidentally committed */
  forbidOnly: !!process.env.CI,

  /* Retry failed E2E tests only on CI */
  retries: process.env.CI ? 2 : 0,

  /* Use a single worker on CI for better stability */
  workers: process.env.CI ? 1 : undefined,

  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : [["list"]],

  use: {
    baseURL: "http://127.0.0.1:5173",

    trace: "on-first-retry",

    screenshot: "only-on-failure",

    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],

  webServer: {
    command: "pnpm dev -- --host 127.0.0.1",
    url: "http://127.0.0.1:5173",

    reuseExistingServer: !process.env.CI,
  },
});
