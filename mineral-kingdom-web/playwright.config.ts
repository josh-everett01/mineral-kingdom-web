import { defineConfig, devices } from "@playwright/test"

const reseedSerializedSpecs = [
  "**/admin-auctions.spec.ts",
  "**/cart-bridge.spec.ts",
  "**/checkout.spec.ts",
  "**/checkout-shipping-address.spec.ts",
]

const adminSerializedSpecs = [
  "**/admin-allow.spec.ts",
  "**/admin-analytics.spec.ts",
  "**/admin-cms.spec.ts",
  "**/admin-fulfillment.spec.ts",
  "**/admin-listings.spec.ts",
  "**/admin-minerals.spec.ts",
  "**/admin-orders.spec.ts",
  "**/admin-store-offers.spec.ts",
  "**/admin-support.spec.ts",
  "**/admin-system.spec.ts",
  "**/admin-users.spec.ts",
  "**/admin-visibility.spec.ts",
]

const authSerializedSpecs = [
  "**/admin-forbidden.spec.ts",
  "**/auth.spec.ts",
  "**/password-reset-confirm.spec.ts",
  "**/password-reset-request.spec.ts",
  "**/password-reset.spec.ts",
  "**/register.spec.ts",
  "**/register-verify-login.spec.ts",
  "**/resend-verification.spec.ts",
]

const miscSerializedSpecs = [
  "**/checkout-return-confirmation.spec.ts",
  "**/shipping-invoice-detail.spec.ts",
  "**/auction-detail.spec.ts",
  "**/order-detail.spec.ts",
  "**/dashboard.spec.ts",
  "**/open-box.spec.ts",
  "**/fulfillment.spec.ts",
]

const serializedSpecs = [
  ...reseedSerializedSpecs,
  ...adminSerializedSpecs,
  ...authSerializedSpecs,
  ...miscSerializedSpecs,
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
      name: "chromium-admin",
      testMatch: adminSerializedSpecs,
      fullyParallel: false,
      workers: 1,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium-auth",
      testMatch: authSerializedSpecs,
      fullyParallel: false,
      workers: 1,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium-reseed",
      testMatch: reseedSerializedSpecs,
      fullyParallel: false,
      workers: 1,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium-serialized",
      testMatch: miscSerializedSpecs,
      fullyParallel: false,
      workers: 1,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
})
