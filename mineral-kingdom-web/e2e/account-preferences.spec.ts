import { expect, test, type Page } from "@playwright/test"

const PREFERENCES_URL = "/account/preferences"

function buildAuthenticatedMe() {
  return {
    isAuthenticated: true,
    emailVerified: true,
    user: {
      id: "41c039fe-1257-4e29-9ad7-f8cd09a2f261",
      email: "prefs@example.com",
    },
    roles: ["USER"],
    accessTokenExpiresAtEpochSeconds: Math.floor(Date.now() / 1000) + 60 * 10,
  }
}

function buildUnauthenticatedMe() {
  return {
    isAuthenticated: false,
    user: null,
    roles: [],
    accessTokenExpiresAtEpochSeconds: null,
    code: "AUTH_EXPIRED",
    message: "Your session expired. Please sign in again.",
  }
}

function buildPreferences() {
  return {
    outbidEmailEnabled: true,
    bidAcceptedEmailEnabled: false,
    auctionPaymentRemindersEnabled: true,
    shippingInvoiceRemindersEnabled: true,
    updatedAt: "2026-04-06T16:10:00.000000+00:00",
  }
}

function buildUpdatedPreferences() {
  return {
    outbidEmailEnabled: false,
    bidAcceptedEmailEnabled: true,
    auctionPaymentRemindersEnabled: false,
    shippingInvoiceRemindersEnabled: true,
    updatedAt: "2026-04-06T16:20:00.000000+00:00",
  }
}

async function mockAuthenticatedSession(page: Page) {
  await page.route("**/api/bff/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(buildAuthenticatedMe()),
    })
  })
}

async function mockUnauthenticatedSession(page: Page) {
  await page.route("**/api/bff/auth/me", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify(buildUnauthenticatedMe()),
    })
  })
}

async function mockPreferencesGet(
  page: Page,
  body: unknown,
  status = 200,
) {
  await page.route("**/api/bff/me/notification-preferences", async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback()
      return
    }

    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    })
  })
}

async function mockPreferencesPut(
  page: Page,
  options?: {
    status?: number
    body?: unknown
  },
) {
  await page.route("**/api/bff/me/notification-preferences", async (route) => {
    if (route.request().method() !== "PUT") {
      await route.fallback()
      return
    }

    await route.fulfill({
      status: options?.status ?? 204,
      contentType: "application/json",
      body:
        options?.status && options.status >= 400
          ? JSON.stringify(
            options?.body ?? {
              status: options.status,
              code: "SAVE_FAILED",
              message: "Unable to save notification preferences.",
            },
          )
          : "",
    })
  })
}

test.describe("account preferences", () => {
  test("initial load renders toggles and transactional email copy", async ({ page }) => {
    await mockAuthenticatedSession(page)
    await mockPreferencesGet(page, buildPreferences())

    await page.goto(PREFERENCES_URL, { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("notification-preferences-page")).toBeVisible()
    await expect(page.getByTestId("notification-preferences-transactional-note")).toContainText(
      /cannot be disabled/i,
    )

    await expect(page.getByTestId("notification-preferences-toggle-outbid")).toBeChecked()
    await expect(
      page.getByTestId("notification-preferences-toggle-payment-reminders"),
    ).toBeChecked()
    await expect(
      page.getByTestId("notification-preferences-toggle-shipping-reminders"),
    ).toBeChecked()
    await expect(
      page.getByTestId("notification-preferences-toggle-bid-accepted"),
    ).not.toBeChecked()
  })

  test("successful update saves preferences and shows success feedback", async ({ page }) => {
    let getCount = 0

    await mockAuthenticatedSession(page)

    await page.route("**/api/bff/me/notification-preferences", async (route) => {
      if (route.request().method() === "GET") {
        getCount += 1

        const payload = getCount === 1 ? buildPreferences() : buildUpdatedPreferences()

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(payload),
        })
        return
      }

      if (route.request().method() === "PUT") {
        const requestBody = route.request().postDataJSON() as Record<string, unknown>

        expect(requestBody).toEqual({
          outbidEmailEnabled: false,
          auctionPaymentRemindersEnabled: false,
          shippingInvoiceRemindersEnabled: true,
          bidAcceptedEmailEnabled: true,
        })

        await route.fulfill({
          status: 204,
          contentType: "application/json",
          body: "",
        })
        return
      }

      await route.fallback()
    })

    await page.goto(PREFERENCES_URL, { waitUntil: "domcontentloaded" })

    await page.getByTestId("notification-preferences-toggle-outbid").uncheck()
    await page.getByTestId("notification-preferences-toggle-payment-reminders").uncheck()
    await page.getByTestId("notification-preferences-toggle-bid-accepted").check()

    await page.getByTestId("notification-preferences-save-button").click()

    await expect(page.getByTestId("notification-preferences-success")).toContainText(
      /have been updated/i,
    )

    await expect(page.getByTestId("notification-preferences-toggle-outbid")).not.toBeChecked()
    await expect(
      page.getByTestId("notification-preferences-toggle-payment-reminders"),
    ).not.toBeChecked()
    await expect(
      page.getByTestId("notification-preferences-toggle-shipping-reminders"),
    ).toBeChecked()
    await expect(
      page.getByTestId("notification-preferences-toggle-bid-accepted"),
    ).toBeChecked()
  })

  test("restore defaults resets draft values before save", async ({ page }) => {
    await mockAuthenticatedSession(page)
    await mockPreferencesGet(page, buildUpdatedPreferences())
    await mockPreferencesPut(page)

    await page.goto(PREFERENCES_URL, { waitUntil: "domcontentloaded" })

    await page.getByTestId("notification-preferences-restore-defaults").click()

    await expect(page.getByTestId("notification-preferences-toggle-outbid")).toBeChecked()
    await expect(
      page.getByTestId("notification-preferences-toggle-payment-reminders"),
    ).toBeChecked()
    await expect(
      page.getByTestId("notification-preferences-toggle-shipping-reminders"),
    ).toBeChecked()
    await expect(
      page.getByTestId("notification-preferences-toggle-bid-accepted"),
    ).not.toBeChecked()
  })

  test("backend save error is shown and form remains usable", async ({ page }) => {
    await mockAuthenticatedSession(page)
    await mockPreferencesGet(page, buildPreferences())
    await mockPreferencesPut(page, {
      status: 500,
      body: {
        status: 500,
        code: "UPSTREAM_UNAVAILABLE",
        message: "Unable to save notification preferences.",
      },
    })

    await page.goto(PREFERENCES_URL, { waitUntil: "domcontentloaded" })

    await page.getByTestId("notification-preferences-toggle-outbid").uncheck()
    await page.getByTestId("notification-preferences-save-button").click()

    await expect(page.getByTestId("notification-preferences-save-error")).toContainText(
      /unable to save notification preferences/i,
    )

    await expect(page.getByTestId("notification-preferences-toggle-outbid")).not.toBeChecked()
    await expect(page.getByTestId("notification-preferences-save-button")).toBeEnabled()
  })

  test("unauthenticated member is prompted to sign in again", async ({ page }) => {
    await mockUnauthenticatedSession(page)
    await mockPreferencesGet(
      page,
      {
        status: 401,
        code: "AUTH_EXPIRED",
        message: "Your session expired. Please sign in again.",
      },
      401,
    )

    await page.goto(PREFERENCES_URL, { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("notification-preferences-error")).toBeVisible()
    await expect(page.getByTestId("notification-preferences-sign-in-again")).toBeVisible()
  })
})