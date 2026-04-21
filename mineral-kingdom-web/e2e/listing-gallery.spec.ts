import { expect, test } from "@playwright/test"

test("store listing gallery supports thumbnail selection and navigation", async ({ page }) => {
  test.skip(!process.env.E2E_BACKEND, "Requires backend running (set E2E_BACKEND=1).")
  test.skip(
    !process.env.E2E_LISTING_MULTI_IMAGE_SLUG_AND_ID,
    "Requires multi-image listing fixture.",
  )

  await page.goto(`/listing/${process.env.E2E_LISTING_MULTI_IMAGE_SLUG_AND_ID}`)
  await expect(page.getByTestId("listing-detail-page")).toBeVisible()
  await expect(page.getByTestId("listing-gallery")).toBeVisible()

  const mainImage = page.getByTestId("listing-gallery-main-image")
  const thumbnails = page.getByTestId("listing-gallery-thumbnail")

  await expect(thumbnails).toHaveCount(3)

  const initialSrc = await mainImage.getAttribute("src")

  await thumbnails.nth(1).click()

  await expect(thumbnails.nth(1)).toHaveAttribute("data-selected", "true")
  await expect(mainImage).not.toHaveAttribute("src", initialSrc ?? "")

  await page.getByTestId("listing-gallery-next").click()
  await expect(thumbnails.nth(2)).toHaveAttribute("data-selected", "true")

  await page.getByTestId("listing-gallery-prev").click()
  await expect(thumbnails.nth(1)).toHaveAttribute("data-selected", "true")
})

test("auction detail gallery supports thumbnail selection and navigation", async ({ page }) => {
  test.skip(!process.env.E2E_BACKEND, "Requires backend running (set E2E_BACKEND=1).")
  test.skip(
    !process.env.E2E_AUCTION_MULTI_IMAGE_ID,
    "Requires multi-image auction fixture.",
  )

  await page.goto(`/auctions/${process.env.E2E_AUCTION_MULTI_IMAGE_ID}`)
  await expect(page.getByTestId("auction-detail-page")).toBeVisible()
  await expect(page.getByTestId("listing-gallery")).toBeVisible()

  const mainImage = page.getByTestId("listing-gallery-main-image")
  const thumbnails = page.getByTestId("listing-gallery-thumbnail")

  await expect(thumbnails.first()).toBeVisible()

  const initialSrc = await mainImage.getAttribute("src")

  await thumbnails.nth(1).click()
  await expect(thumbnails.nth(1)).toHaveAttribute("data-selected", "true")
  await expect(mainImage).not.toHaveAttribute("src", initialSrc ?? "")

  await page.getByTestId("listing-gallery-next").click()
  await page.getByTestId("listing-gallery-prev").click()
})

test("single-image listing hides gallery navigation controls", async ({ page }) => {
  test.skip(!process.env.E2E_BACKEND, "Requires backend running (set E2E_BACKEND=1).")
  test.skip(
    !process.env.E2E_LISTING_SINGLE_IMAGE_SLUG_AND_ID,
    "Requires single-image listing fixture.",
  )

  await page.goto(`/listing/${process.env.E2E_LISTING_SINGLE_IMAGE_SLUG_AND_ID}`)
  await expect(page.getByTestId("listing-gallery")).toBeVisible()

  await expect(page.getByTestId("listing-gallery-prev")).toHaveCount(0)
  await expect(page.getByTestId("listing-gallery-next")).toHaveCount(0)
  await expect(page.getByTestId("listing-gallery-thumbnail")).toHaveCount(0)
})