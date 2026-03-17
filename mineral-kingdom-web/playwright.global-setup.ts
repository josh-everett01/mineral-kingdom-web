import { request } from "@playwright/test";

export default async function globalSetup() {
  if (!process.env.E2E_BACKEND) {
    return;
  }

  const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:8080";
  const ctx = await request.newContext();

  const res = await ctx.post(`${apiBaseUrl}/api/testing/e2e/seed`, {
    timeout: 15_000,
  });

  if (!res.ok()) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Failed to seed E2E fixtures. Status=${res.status()} Body=${body}`,
    );
  }

  await ctx.dispose();
}