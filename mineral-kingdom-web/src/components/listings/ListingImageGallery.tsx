"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"

type ListingGalleryImage = {
  id: string
  url: string
  caption?: string | null
  isPrimary: boolean
  sortOrder: number
}

type ListingImageGalleryProps = {
  images: ListingGalleryImage[]
  title: string
}

function getImageAltText(title: string, image: ListingGalleryImage, index: number) {
  const caption = image.caption?.trim()
  if (caption) return caption
  return `${title} image ${index + 1}`
}

function clampIndex(index: number, max: number) {
  if (max < 0) return 0
  if (index < 0) return 0
  if (index > max) return max
  return index
}

export function ListingImageGallery({ images, title }: ListingImageGalleryProps) {
  const orderedImages = useMemo(() => {
    return [...images].sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1
      return a.sortOrder - b.sortOrder
    })
  }, [images])

  const imageSignature = useMemo(
    () => orderedImages.map((image) => image.id).join("|"),
    [orderedImages],
  )

  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    setSelectedIndex(0)
  }, [imageSignature])

  const hasImages = orderedImages.length > 0

  if (!hasImages) {
    return (
      <section
        data-testid="listing-gallery"
        className="space-y-4"
        aria-label={`${title} image gallery`}
      >
        <div className="relative aspect-square overflow-hidden rounded-2xl border bg-muted">
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No image available
          </div>
        </div>
      </section>
    )
  }

  const hasMultipleImages = orderedImages.length > 1
  const maxIndex = orderedImages.length - 1
  const safeSelectedIndex = clampIndex(selectedIndex, maxIndex)
  const selectedImage = orderedImages[safeSelectedIndex]

  function handlePrevious() {
    setSelectedIndex((current) => clampIndex(current - 1, maxIndex))
  }

  function handleNext() {
    setSelectedIndex((current) => clampIndex(current + 1, maxIndex))
  }

  return (
    <section
      data-testid="listing-gallery"
      className="space-y-4"
      aria-label={`${title} image gallery`}
    >
      <div className="relative aspect-square overflow-hidden rounded-2xl border bg-muted">
        <Image
          key={selectedImage.id}
          data-testid="listing-gallery-main-image"
          src={selectedImage.url}
          alt={getImageAltText(title, selectedImage, safeSelectedIndex)}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
          priority={safeSelectedIndex === 0}
        />

        {hasMultipleImages ? (
          <>
            <button
              type="button"
              data-testid="listing-gallery-prev"
              aria-label="Previous image"
              onClick={handlePrevious}
              disabled={safeSelectedIndex === 0}
              className="absolute left-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border bg-background/90 text-sm font-medium shadow-sm transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              ‹
            </button>

            <button
              type="button"
              data-testid="listing-gallery-next"
              aria-label="Next image"
              onClick={handleNext}
              disabled={safeSelectedIndex === maxIndex}
              className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border bg-background/90 text-sm font-medium shadow-sm transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              ›
            </button>
          </>
        ) : null}
      </div>

      {hasMultipleImages ? (
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
          {orderedImages.map((image, index) => {
            const isSelected = index === safeSelectedIndex

            return (
              <button
                key={image.id}
                type="button"
                data-testid="listing-gallery-thumbnail"
                data-selected={isSelected ? "true" : "false"}
                aria-label={`View image ${index + 1}`}
                aria-pressed={isSelected}
                onClick={() => setSelectedIndex(index)}
                className={`relative aspect-square overflow-hidden rounded-xl border transition ${isSelected
                    ? "ring-2 ring-foreground ring-offset-2"
                    : "opacity-85 hover:opacity-100"
                  }`}
              >
                <Image
                  src={image.url}
                  alt={getImageAltText(title, image, index)}
                  fill
                  sizes="160px"
                  className="object-cover"
                />
              </button>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}