import { defineConfig, devices } from "@playwright/test"

const serializedSpecs = [
  "**/checkout-return-confirmation.spec.ts",
  "**/shipping-invoice-detail.spec.ts",
  "**/auction-detail.spec.ts",
  "**/order-detail.spec.ts",
  "**/dashboard.spec.ts",
  "**/open-box.spec.ts",
  "**/fulfillment.spec.ts",
]

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
      testIgnore: serializedSpecs,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium-serialized",
      testMatch: serializedSpecs,
      fullyParallel: false,
      workers: 1,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
})