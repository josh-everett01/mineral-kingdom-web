import { test, expect } from "@playwright/test";

test.skip(!process.env.E2E_BACKEND, "Requires backend running (set E2E_BACKEND=1).");

test("resend verification page submits email and shows generic success", async ({ page }) => {
  await page.context().setExtraHTTPHeaders({
    "X-Test-RateLimit-Key": `resend-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  });

  const email = `resend-${Date.now()}@example.com`;

  await page.goto("/resend-verification");

  await page.getByTestId("resend-verification-email").fill(email);

  const resendResponsePromise = page.waitForResponse((resp) => {
    return (
      resp.url().includes("/api/bff/auth/resend-verification") &&
      resp.request().method() === "POST"
    );
  });

  await page.getByTestId("resend-verification-submit").click();

  const resendResp = await resendResponsePromise;

  if (!resendResp.ok()) {
    const status = resendResp.status();
    const bodyText = await resendResp.text().catch(() => "<unable to read body>");
    throw new Error(`Resend verification failed: HTTP ${status}\nBody:\n${bodyText}`);
  }

  await expect(page.getByTestId("resend-verification-success")).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByText("Check your email", { exact: true })).toBeVisible({
    timeout: 10_000,
  });
  await expect(
    page.getByText("If an account exists and is unverified, we sent a new email.")
  ).toBeVisible({
    timeout: 10_000,
  });
});