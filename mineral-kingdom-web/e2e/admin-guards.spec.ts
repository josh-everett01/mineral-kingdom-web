import { test, expect } from "@playwright/test"

test("anonymous visiting admin route is redirected to login", async ({ page }) => {
  await page.goto("/admin")
  await expect(page.getByTestId("login-title")).toBeVisible({ timeout: 15_000 })
  await expect(page).toHaveURL(/\/login\?(next|returnTo)=%2Fadmin/, { timeout: 15_000 })
})

test("anonymous visiting nested admin route is redirected to login", async ({ page }) => {
  await page.goto("/admin/store/offers")
  await expect(page.getByTestId("login-title")).toBeVisible({ timeout: 15_000 })
  await expect(page).toHaveURL(/\/login\?(next|returnTo)=%2Fadmin/, { timeout: 15_000 })
})

test("anonymous visiting dashboard route is redirected to login", async ({ page }) => {
  await page.goto("/dashboard")
  await expect(page.getByTestId("login-title")).toBeVisible({ timeout: 15_000 })
  await expect(page).toHaveURL(/\/login\?(next|returnTo)=%2Fdashboard/, { timeout: 15_000 })
})
