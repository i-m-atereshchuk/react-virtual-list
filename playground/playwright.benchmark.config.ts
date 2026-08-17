import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./src/e2e/benchmarks",

  timeout: 120_000,

  // Performance benchmarks shouldn't compete for CPU.
  fullyParallel: false,
  workers: 1,

  // Don't hide a performance regression with retries.
  retries: 0,

  use: {
    baseURL: "http://127.0.0.1:4173",

    headless: true,

    // Reduce additional work during measurements.
    trace: "off",
    screenshot: "off",
    video: "off",
  },

  webServer: {
    command: "pnpm preview --host 127.0.0.1",
    url: "http://127.0.0.1:4173",

    reuseExistingServer: !process.env.CI,
  },

  projects: [
    {
      name: "chromium",

      use: {
        browserName: "chromium",
      },
    },
  ],

  reporter: [["list"]],
});
