import { expect, type Page } from "@playwright/test"

async function waitForAuthMe(page: Page, email?: string) {
  await expect
    .poll(
      async () => {
        const origin = new URL(page.url()).origin
        const res = await page.request.get(`${origin}/api/bff/auth/me`, {
          failOnStatusCode: false,
        })

        if (!res.ok()) {
          return false
        }

        const body = (await res.json().catch(() => null)) as
          | {
              isAuthenticated?: boolean
              user?: { email?: string | null } | null
            }
          | null

        if (body?.isAuthenticated !== true) {
          return false
        }

        return email ? body.user?.email === email : true
      },
      {
        timeout: 15_000,
        message: email
          ? `Expected authenticated /api/bff/auth/me session for ${email}`
          : "Expected authenticated /api/bff/auth/me session",
      },
    )
    .toBe(true)
}

export async function waitForAuthenticatedSession(page: Page, email?: string) {
  await expect(page).toHaveURL(/\/account|\/admin|\/dashboard/, { timeout: 15_000 })
  await page.goto("/account", { waitUntil: "domcontentloaded" })

  const sessionCard = page.getByTestId("account-session-card")
  await expect(sessionCard).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId("account-authenticated-value")).toHaveText("Yes", {
    timeout: 15_000,
  })

  const emailValue = page.getByTestId("account-email-value")
  if (email && (await emailValue.count())) {
    await expect(emailValue).toHaveText(email, { timeout: 15_000 })
  }

  await waitForAuthMe(page, email)
}
