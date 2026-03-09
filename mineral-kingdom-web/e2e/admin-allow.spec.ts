import { test, expect } from "@playwright/test";

const hasAdminFixture = !!process.env.E2E_ADMIN_EMAIL && !!process.env.E2E_ADMIN_PASSWORD;

test.skip(!process.env.E2E_BACKEND, "Requires backend running (set E2E_BACKEND=1).");
test.skip(!hasAdminFixture, "Requires seeded admin fixture (set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD).");

test("STAFF/OWNER can access admin route", async ({ page }) => {
  await page.context().setExtraHTTPHeaders({
    "X-Test-RateLimit-Key": `admin-allow-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  });

  const email = process.env.E2E_ADMIN_EMAIL!;
  const password = process.env.E2E_ADMIN_PASSWORD!;

  await page.goto("/login");
  await expect(page.getByTestId("login-title")).toBeVisible();

  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(password);

  const [loginResp] = await Promise.all([
    page.waitForResponse((resp) => {
      return resp.url().includes("/api/bff/auth/login") && resp.request().method() === "POST";
    }),
    page.getByTestId("login-submit").click(),
  ]);

  if (!loginResp.ok()) {
    const status = loginResp.status();
    const bodyText = await loginResp.text().catch(() => "<unable to read body>");
    throw new Error(`Login failed: HTTP ${status}\nBody:\n${bodyText}`);
  }

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
  await expect(page.getByTestId("admin-page-title")).toBeVisible();
  await expect(page.getByText("Restricted to STAFF and OWNER roles.")).toBeVisible();
});