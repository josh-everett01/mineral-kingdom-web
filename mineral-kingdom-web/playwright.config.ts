import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  globalSetup: "./playwright.global-setup.ts",

  use: {
    baseURL: "http://127.0.0.1:3005",
    trace: "on-first-retry",
  },

  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3005",
    url: "http://127.0.0.1:3005",
    reuseExistingServer: !process.env.CI,
    env: {
      API_BASE_URL: "http://127.0.0.1:8080",
      E2E_BACKEND: "1",
    },
  },

  projects: [
    {
      name: "chromium",
      testIgnore: ["**/checkout-return-confirmation.spec.ts"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium-backend-serialized",
      testMatch: ["**/checkout-return-confirmation.spec.ts"],
      fullyParallel: false,
      workers: 1,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
})