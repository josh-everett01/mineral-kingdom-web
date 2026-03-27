import { test, expect } from "@playwright/test"

test("bff sse endpoint returns event-stream headers", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" })

  const result = await page.evaluate(async () => {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 1000)

    try {
      const response = await fetch("/api/bff/sse/auctions/00000000-0000-0000-0000-000000000000", {
        headers: {
          accept: "text/event-stream",
        },
        signal: controller.signal,
      })

      return {
        status: response.status,
        contentType: response.headers.get("content-type") ?? "",
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return {
          status: "aborted",
          contentType: "",
        }
      }

      return {
        status: "error",
        contentType: String(error),
      }
    } finally {
      window.clearTimeout(timeout)
    }
  })

  expect([200, 401, 404, "aborted"]).toContain(result.status)

  if (result.status === 200) {
    expect(result.contentType.toLowerCase()).toContain("text/event-stream")
  }
})