import { request } from "@playwright/test"

export default async function globalSetup() {
  if (!process.env.E2E_BACKEND) {
    return
  }

  const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:8080"
  const ctx = await request.newContext()

  // Purge accumulated test data from prior runs before re-seeding clean fixtures.
  const resetRes = await ctx.post(`${apiBaseUrl}/api/testing/e2e/reset`, {
    timeout: 90_000,
  })

  if (!resetRes.ok()) {
    const body = await resetRes.text().catch(() => "")
    throw new Error(
      `Failed to reset E2E fixtures. Status=${resetRes.status()} Body=${body}`,
    )
  }

  const seedRes = await ctx.post(`${apiBaseUrl}/api/testing/e2e/seed`, {
    timeout: 15_000,
  })

  if (!seedRes.ok()) {
    const body = await seedRes.text().catch(() => "")
    throw new Error(
      `Failed to seed E2E fixtures. Status=${seedRes.status()} Body=${body}`,
    )
  }

  // Expose the fixture search-user email so admin-users tests can find a
  // deterministic USER-role account regardless of prior-run state.
  const seedData = (await seedRes.json()) as { adminSearchUserEmail?: string }
  if (seedData.adminSearchUserEmail && !process.env.E2E_EMAIL) {
    process.env.E2E_EMAIL = seedData.adminSearchUserEmail
  }

  await ctx.dispose()
}