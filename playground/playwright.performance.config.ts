import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./performance",

  workers: 1,

  retries: 0,

  use: {
    baseURL: "http://localhost:4173",

    browserName: "chromium",

    viewport: {
      width: 1440,
      height: 900,
    },
  },

  webServer: {
    command: "pnpm build && pnpm preview",
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
});
