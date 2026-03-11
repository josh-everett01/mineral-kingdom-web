import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  globalSetup: "./playwright.global-setup.ts",

  use: {
    baseURL: "http://localhost:3005",
    trace: "on-first-retry",
  },

  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3005",
    url: "http://127.0.0.1:3005",
    reuseExistingServer: !process.env.CI,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});