import { test, expect } from "@playwright/test";

type RegisterResponse = {
  userId?: string;
  emailVerified?: boolean;
  verificationSent?: boolean;
  message?: string | null;
  nextStep?: string | null;
  verificationToken?: string | null;
};

test.describe("auth flow: protected redirect -> login -> account -> logout", () => {
  let email = "";
  let password = "";

  test.beforeAll(async ({ request }) => {
    const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8080";

    email = `mk-e2e-${Date.now()}@example.com`;
    password = "Str0ngPass!123";

    // 1) Register via API (test setup; UI still goes through BFF)
    const reg = await request.post(`${API_BASE_URL}/api/auth/register`, {
      data: { email, password },
      headers: { "content-type": "application/json" },
    });

    if (!reg.ok()) {
      const body = await reg.text();
      throw new Error(`E2E setup failed: register returned ${reg.status()} ${body}`);
    }

    const regJson = (await reg.json()) as RegisterResponse;

    // 2) Verify email if backend provides a dev token
    const token = regJson.verificationToken;
    if (!token) {
      // If your backend doesn’t surface a token in this environment, we can’t reliably verify,
      // and login may be blocked by "email must be verified" rules.
      test.skip(true, "RegisterResponse.verificationToken not returned; cannot complete verify-email step in E2E.");
      return;
    }

    const verify = await request.post(`${API_BASE_URL}/api/auth/verify-email`, {
      data: { token },
      headers: { "content-type": "application/json" },
    });

    if (!verify.ok()) {
      const body = await verify.text();
      throw new Error(`E2E setup failed: verify-email returned ${verify.status()} ${body}`);
    }
  });

  test("auth flow: protected redirect -> login -> account -> logout", async ({ page }) => {
    await page.context().clearCookies();

    await page.goto("/account");
    await expect(page).toHaveURL(/\/login/);

    // Ensure login page rendered
    await expect(page.getByTestId("login-title")).toBeVisible();

    await page.getByTestId("login-email").fill(email);
    await page.getByTestId("login-password").fill(password);
    await page.getByTestId("login-submit").click();

    await expect(page).toHaveURL(/\/account/);
    await expect(page.getByText("Authenticated:")).toBeVisible();

    await page.getByRole("button", { name: /logout/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});