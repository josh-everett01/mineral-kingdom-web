import { test, expect } from "@playwright/test"

test("anonymous visiting admin route is redirected to login", async ({ page }) => {
  await page.goto("/admin")
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin/)
  await expect(page.getByTestId("login-title")).toBeVisible()
})

test("anonymous visiting nested admin route is redirected to login", async ({ page }) => {
  await page.goto("/admin/store/offers")
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin/)
  await expect(page.getByTestId("login-title")).toBeVisible()
})

test("anonymous visiting dashboard route is redirected to login", async ({ page }) => {
  await page.goto("/dashboard")
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/)
  await expect(page.getByTestId("login-title")).toBeVisible()
})