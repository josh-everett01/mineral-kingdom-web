import { test, expect, type Page, type Response } from "@playwright/test"

test.describe.configure({ mode: "serial" })

const hasOwnerFixture = !!process.env.E2E_ADMIN_EMAIL && !!process.env.E2E_ADMIN_PASSWORD
const hasStaffFixture = !!process.env.E2E_STAFF_EMAIL && !!process.env.E2E_STAFF_PASSWORD

const MARKETING_SLUG = process.env.E2E_ADMIN_CMS_MARKETING_SLUG ?? "about"
const POLICY_SLUG = process.env.E2E_ADMIN_CMS_POLICY_SLUG ?? "privacy"

test.skip(!process.env.E2E_BACKEND, "Requires backend running (set E2E_BACKEND=1).")
test.skip(!hasOwnerFixture, "Requires OWNER fixture (set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD).")

async function login(page: Page, email: string, password: string) {
  await page.goto("/login")
  await expect(page.getByTestId("login-title")).toBeVisible()

  await page.getByTestId("login-email").fill(email)
  await page.getByTestId("login-password").fill(password)

  const [loginResp] = await Promise.all([
    page.waitForResponse((resp: Response) => {
      return resp.url().includes("/api/bff/auth/login") && resp.request().method() === "POST"
    }),
    page.getByTestId("login-submit").click(),
  ])

  if (!loginResp.ok()) {
    const status = loginResp.status()
    const bodyText = await loginResp.text().catch(() => "<unable to read body>")
    throw new Error(`Login failed: HTTP ${status}\nBody:\n${bodyText}`)
  }

  await expect(page).toHaveURL(/\/account|\/admin|\/dashboard/, { timeout: 15_000 })
}

async function loginAsOwner(page: Page) {
  await page.context().setExtraHTTPHeaders({
    "X-Test-RateLimit-Key": `admin-cms-owner-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  })

  await login(page, process.env.E2E_ADMIN_EMAIL!, process.env.E2E_ADMIN_PASSWORD!)
}

async function loginAsStaff(page: Page) {
  await page.context().setExtraHTTPHeaders({
    "X-Test-RateLimit-Key": `admin-cms-staff-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  })

  await login(page, process.env.E2E_STAFF_EMAIL!, process.env.E2E_STAFF_PASSWORD!)
}

async function openCmsEditor(page: Page, slug: string) {
  await page.goto(`/admin/cms/${slug}`, { waitUntil: "domcontentloaded" })
  await expect(page.getByTestId("admin-cms-detail-page")).toBeVisible()
  await expect(page.getByTestId("admin-cms-markdown")).toBeVisible()
  await expect(page.getByTestId("admin-cms-revision-history")).toBeVisible()
}

test.describe("admin cms", () => {
  test("owner can open cms list and detail pages", async ({ page }) => {
    await loginAsOwner(page)

    await page.goto("/admin/cms", { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("admin-cms-page")).toBeVisible()
    await expect(page.getByTestId("admin-cms-row").first()).toBeVisible({ timeout: 15_000 })

    await openCmsEditor(page, MARKETING_SLUG)
    await expect(page).toHaveURL(new RegExp(`/admin/cms/${MARKETING_SLUG}$`))
  })

  test("owner can save markdown draft revision and revision history is visible", async ({ page }) => {
    await loginAsOwner(page)
    await openCmsEditor(page, MARKETING_SLUG)

    const markdown = page.getByTestId("admin-cms-markdown")
    const original = await markdown.inputValue()
    const marker = `\n\n## Playwright draft ${Date.now()}\n\nDraft-only change.\n`

    await markdown.fill(`${original}${marker}`)
    await page.getByTestId("admin-cms-change-summary").fill("Playwright draft save")
    await page.getByTestId("admin-cms-save-draft").click()

    await expect(page.getByText(/draft saved/i)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId("admin-cms-revision-history")).toContainText("Playwright draft save")
    await expect(page.getByTestId("admin-cms-preview")).toContainText("Playwright draft")
  })

  test("staff cannot publish policy page", async ({ page }) => {
    test.skip(!hasStaffFixture, "Requires STAFF fixture (set E2E_STAFF_EMAIL and E2E_STAFF_PASSWORD).")

    await loginAsStaff(page)
    await openCmsEditor(page, POLICY_SLUG)

    await expect(page.getByText(/only owner users can save drafts or publish revisions/i)).toBeVisible()
    await expect(page.getByTestId("admin-cms-publish")).toBeDisabled()
    await expect(page.getByTestId("admin-cms-save-draft")).toBeDisabled()
  })

  test("owner can publish policy page and public page only changes after publish", async ({ page, context }) => {
    await loginAsOwner(page)

    const publicPage = await context.newPage()
    await publicPage.goto(`/${POLICY_SLUG}`, { waitUntil: "domcontentloaded" })
    await expect(publicPage.getByTestId("public-page-content")).toBeVisible()

    const beforeText = await publicPage.getByTestId("public-page-content").innerText()
    const marker = `Playwright published revision ${Date.now()}`

    await openCmsEditor(page, POLICY_SLUG)

    const markdown = page.getByTestId("admin-cms-markdown")
    const original = await markdown.inputValue()
    await markdown.fill(`${original}\n\n## ${marker}\n\nPublished by Playwright.\n`)
    await page.getByTestId("admin-cms-change-summary").fill("Playwright policy publish")

    await page.getByTestId("admin-cms-save-draft").click()
    await expect(page.getByText(/draft saved/i)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId("admin-cms-revision-history")).toContainText("Playwright policy publish")

    await publicPage.reload({ waitUntil: "domcontentloaded" })
    await expect(publicPage.getByTestId("public-page-content")).toBeVisible()
    await expect(publicPage.getByTestId("public-page-content")).not.toContainText(marker)
    await expect(publicPage.getByTestId("public-page-content").innerText()).resolves.toContain(beforeText.slice(0, Math.min(beforeText.length, 40)))

    await page.getByTestId("admin-cms-publish").click()
    await expect(page.getByText(/revision published/i)).toBeVisible({ timeout: 15_000 })

    await publicPage.reload({ waitUntil: "domcontentloaded" })
    await expect(publicPage.getByTestId("public-page-content")).toContainText(marker)

    await publicPage.close()
  })
})